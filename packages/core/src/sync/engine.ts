/**
 * The sync engine.
 *
 * It owns the whole lifecycle — queue, push, pull, apply, retry — and knows
 * nothing about transport. Everything it does is built on two guarantees from
 * the layers below: the outbox never forgets a local write, and the merge is
 * deterministic and idempotent. Together those mean a sync can fail, be
 * retried, be delivered twice or arrive out of order without losing or
 * duplicating anything.
 *
 * The account model is one user, one device at a time, so this is
 * last-writer-wins by a total order — not a CRDT. Conflicts only arise from
 * offline edits on one device followed by edits on another, and `merge.ts`
 * resolves those identically on both sides.
 */

import type { StorageAdapter } from "../storage/adapter.js";
import { Outbox } from "./outbox.js";
import {
  deltaToSnapshot,
  MemorySyncState,
  type Cursor,
  type Delta,
  type SyncAdapter,
  type SyncSnapshotState,
  type SyncStateStore,
  type SyncStatus,
} from "./types.js";

export interface Scheduler {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export interface SyncEngineOptions {
  /**
   * The **unwrapped** storage adapter. Passing a `TrackedStorage` here would
   * queue every record we receive straight back to the remote.
   */
  storage: StorageAdapter;
  adapter: SyncAdapter;
  /** Share the same instance the app's `TrackedStorage` writes into. */
  outbox?: Outbox;
  state?: SyncStateStore;
  /** Periodic sync while idle and connected. 0 disables it. */
  intervalMs?: number;
  /** Retry backoff. Doubles per consecutive failure, up to `maxMs`. */
  backoff?: { baseMs?: number; maxMs?: number };
  /** How long tombstones are kept before being pruned. Default 30 days. */
  tombstoneRetentionMs?: number;
  /** Safety valve on a paginated pull. */
  maxPullPages?: number;
  scheduler?: Scheduler;
  now?: () => number;
  random?: () => number;
  /** Override offline detection (defaults to `navigator.onLine`). */
  isOffline?: () => boolean;
}

export interface SyncResult {
  pushed: number;
  pulled: number;
  status: SyncStatus;
}

/** Records that arrived from the remote, so the UI can patch instead of reload. */
export interface InboundChange {
  delta: Delta;
}

const DAY = 24 * 60 * 60 * 1000;

export class SyncEngine {
  readonly outbox: Outbox;

  private readonly storage: StorageAdapter;
  private readonly adapter: SyncAdapter;
  private readonly intervalMs: number;
  private readonly baseMs: number;
  private readonly maxMs: number;
  private readonly retentionMs: number;
  private readonly maxPullPages: number;
  private readonly scheduler: Scheduler;
  private readonly now: () => number;
  private readonly random: () => number;
  private readonly offlineCheck: () => boolean;

  private status: SyncStatus = "idle";
  private attempt = 0;
  private lastSyncedAt: number | null = null;
  private error: string | null = null;

  private running = false;
  private inFlight: Promise<SyncResult> | null = null;
  private rerun = false;
  private timer: unknown = null;

  private listeners = new Set<(s: SyncSnapshotState) => void>();
  private inbound = new Set<(c: InboundChange) => void>();
  private detachNetwork: (() => void) | null = null;
  private detachRemote: (() => void) | null = null;

  constructor(opts: SyncEngineOptions) {
    this.storage = opts.storage;
    this.adapter = opts.adapter;
    this.outbox = opts.outbox ?? new Outbox(opts.state ?? new MemorySyncState());
    this.intervalMs = opts.intervalMs ?? 30_000;
    this.baseMs = opts.backoff?.baseMs ?? 1_000;
    this.maxMs = opts.backoff?.maxMs ?? 5 * 60_000;
    this.retentionMs = opts.tombstoneRetentionMs ?? 30 * DAY;
    this.maxPullPages = opts.maxPullPages ?? 100;
    this.scheduler = opts.scheduler ?? globalThis;
    this.now = opts.now ?? Date.now;
    this.random = opts.random ?? Math.random;
    this.offlineCheck =
      opts.isOffline ??
      (() => {
        const nav = (globalThis as { navigator?: { onLine?: boolean } }).navigator;
        return nav?.onLine === false;
      });
  }

  // ---- Observation --------------------------------------------------------

  get state(): SyncSnapshotState {
    return {
      status: this.status,
      pending: this.outbox.size,
      lastSyncedAt: this.lastSyncedAt,
      error: this.error,
      attempt: this.attempt,
    };
  }

  subscribe(fn: (s: SyncSnapshotState) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Notified when a pull applied remote changes. */
  onInbound(fn: (c: InboundChange) => void): () => void {
    this.inbound.add(fn);
    return () => this.inbound.delete(fn);
  }

  // ---- Lifecycle ----------------------------------------------------------

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    await this.outbox.load();
    this.attachNetwork();
    // Adapters that can tell us when the remote changed (WebSocket, SSE, the
    // loopback's BroadcastChannel) make sync feel instant rather than polled.
    this.detachRemote = this.adapter.subscribe?.(() => {
      if (this.running) void this.sync();
    }) ?? null;
    void this.sync();
  }

  stop(): void {
    this.running = false;
    this.clearTimer();
    this.detachNetwork?.();
    this.detachNetwork = null;
    this.detachRemote?.();
    this.detachRemote = null;
  }

  // ---- The sync round -----------------------------------------------------

  /**
   * Single-flight: concurrent callers join the run in progress. If a write
   * lands mid-run it is picked up by an immediate follow-up round rather than
   * being silently deferred to the next tick.
   */
  sync(): Promise<SyncResult> {
    if (this.inFlight) {
      this.rerun = true;
      return this.inFlight;
    }
    this.inFlight = this.runOnce().finally(() => {
      this.inFlight = null;
      if (this.rerun) {
        this.rerun = false;
        if (this.running && this.status !== "offline") void this.sync();
      }
    });
    return this.inFlight;
  }

  private async runOnce(): Promise<SyncResult> {
    await this.outbox.load();
    this.clearTimer();

    if (!this.adapter.connected || this.offlineCheck()) {
      this.setStatus("offline");
      this.scheduleRetry();
      return { pushed: 0, pulled: 0, status: "offline" };
    }

    this.setStatus("syncing");
    let pushed = 0;
    let pulled = 0;

    try {
      pushed = await this.pushOutbox();
      pulled = await this.pullAll();

      // Tombstones have done their job once every device has seen them; the
      // retention window is the stand-in for "every device".
      await this.storage.pruneDeletions(this.now() - this.retentionMs);

      this.attempt = 0;
      this.error = null;
      this.lastSyncedAt = this.now();
      this.setStatus("idle");
      this.scheduleTick();
      return { pushed, pulled, status: "idle" };
    } catch (err) {
      // The outbox is untouched on failure, so nothing written is ever lost.
      this.attempt += 1;
      const offline = this.offlineCheck() || !this.adapter.connected;
      this.error = offline ? null : errorMessage(err);
      this.setStatus(offline ? "offline" : "error");
      this.scheduleRetry();
      return { pushed, pulled, status: this.status };
    }
  }

  private async pushOutbox(): Promise<number> {
    const drained = await this.outbox.drain(this.storage);
    if (!drained) return 0;
    const ack = await this.adapter.push(drained.delta);
    // Only now is it safe to forget these — and only these; writes that landed
    // while the push was in flight stay queued.
    this.outbox.ack(drained.keys, drained.delta.profile !== undefined);
    this.outbox.setCursor(ack.cursor);
    return drained.keys.length;
  }

  private async pullAll(): Promise<number> {
    let applied = 0;
    for (let page = 0; page < this.maxPullPages; page++) {
      const delta = await this.adapter.pull(this.outbox.cursor);
      if (!delta) break;
      applied += await this.apply(delta);
      // The cursor advances only after the apply succeeded, so a crash
      // mid-apply replays the page rather than skipping it.
      this.outbox.setCursor(delta.cursor);
      if (!delta.hasMore) break;
    }
    return applied;
  }

  /**
   * Applying is a merge, which is idempotent — a re-delivered page changes
   * nothing. Note this writes through the raw adapter, never the tracked one,
   * so remote records don't echo back into the outbox.
   */
  private async apply(delta: Delta): Promise<number> {
    const count =
      countRecords(delta) + delta.deletions.length + (delta.profile ? 1 : 0);
    if (count === 0) return 0;
    await this.storage.importSnapshot(deltaToSnapshot(delta), "merge");
    for (const fn of this.inbound) fn({ delta });
    return count;
  }

  // ---- Scheduling ---------------------------------------------------------

  /** Full jitter on the upper half of the window: retries spread, but stay prompt. */
  backoffDelay(attempt = this.attempt): number {
    const capped = Math.min(this.maxMs, this.baseMs * 2 ** Math.max(0, attempt - 1));
    return Math.round(capped * (0.5 + 0.5 * this.random()));
  }

  private scheduleRetry(): void {
    if (!this.running) return;
    this.arm(this.backoffDelay());
  }

  private scheduleTick(): void {
    if (!this.running || this.intervalMs <= 0) return;
    this.arm(this.intervalMs);
  }

  private arm(ms: number): void {
    this.clearTimer();
    this.timer = this.scheduler.setTimeout(() => {
      this.timer = null;
      if (this.running) void this.sync();
    }, ms);
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      this.scheduler.clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private attachNetwork(): void {
    const target = globalThis as unknown as {
      addEventListener?: (t: string, fn: () => void) => void;
      removeEventListener?: (t: string, fn: () => void) => void;
    };
    if (!target.addEventListener) return;
    const online = () => {
      this.attempt = 0; // coming back is not a failure
      void this.sync();
    };
    const offline = () => this.setStatus("offline");
    target.addEventListener("online", online);
    target.addEventListener("offline", offline);
    this.detachNetwork = () => {
      target.removeEventListener?.("online", online);
      target.removeEventListener?.("offline", offline);
    };
  }

  private setStatus(next: SyncStatus): void {
    this.status = next;
    const snapshot = this.state;
    for (const fn of this.listeners) fn(snapshot);
  }
}

function countRecords(delta: Delta): number {
  let n = 0;
  for (const value of Object.values(delta.records)) n += value?.length ?? 0;
  return n;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export type { Cursor };
