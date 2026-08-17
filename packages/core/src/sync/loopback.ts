/**
 * A real sync adapter with no server.
 *
 * The transport is an append-only log that two instances of the app share:
 * in-memory for tests, `localStorage` for two browser tabs. It exercises the
 * entire pipeline — outbox, push, cursor, pull, merge, tombstones — so the
 * engine is proven today rather than on the day a backend exists.
 *
 * It is also the honest model of what the server has to be. The log stores
 * opaque entries in arrival order and never inspects them; a device asks for
 * "everything after this cursor". That is the whole protocol. See
 * `SyncAdapter` in `./types.ts` for the HTTP mapping.
 *
 * Not a substitute for real sync: the log is per-origin (or per-process), so it
 * links instances on one machine, not devices.
 */

import type { Cursor, Delta, PushAck, PushDelta, RecordSet, SyncAdapter } from "./types.js";
import type { Collection, Tombstone } from "../types.js";

export interface RelayEntry {
  seq: number;
  delta: PushDelta;
}

/** The shared log. A server implements the same two operations. */
export interface RelayLog {
  append(delta: PushDelta): number;
  /** Entries with `seq > since`, oldest first. */
  read(since: number, limit: number): RelayEntry[];
  /** Notified when another instance appends. Optional. */
  subscribe?(fn: () => void): () => void;
}

/** In-process log — what tests use. */
export class MemoryRelayLog implements RelayLog {
  private entries: RelayEntry[] = [];
  private seq = 0;
  private listeners = new Set<() => void>();

  append(delta: PushDelta): number {
    this.seq += 1;
    this.entries.push({ seq: this.seq, delta });
    for (const fn of [...this.listeners]) fn();
    return this.seq;
  }

  read(since: number, limit: number): RelayEntry[] {
    return this.entries.filter((e) => e.seq > since).slice(0, limit);
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  get size(): number {
    return this.entries.length;
  }
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface LocalStorageRelayOptions {
  key?: string;
  /** Entries kept before the oldest are dropped. A device further behind than
   *  this would miss changes — fine for a loopback, not for a server. */
  maxEntries?: number;
  storage?: StorageLike;
  /** Channel name for cross-tab wake-ups. Set to null to disable. */
  channel?: string | null;
}

/**
 * Log shared by every tab on one origin, durable across reloads. Paired with a
 * `BroadcastChannel` so a write in one tab wakes the others immediately instead
 * of waiting for the next poll.
 */
export class LocalStorageRelayLog implements RelayLog {
  private readonly key: string;
  private readonly maxEntries: number;
  private readonly storage: StorageLike;
  private readonly bc: BroadcastChannel | null;
  private listeners = new Set<() => void>();

  constructor(opts: LocalStorageRelayOptions = {}) {
    this.key = opts.key ?? "abh:relay";
    this.maxEntries = opts.maxEntries ?? 500;
    this.storage =
      opts.storage ??
      ((globalThis as { localStorage?: StorageLike }).localStorage as StorageLike);
    const name = opts.channel === undefined ? "abh:relay" : opts.channel;
    this.bc =
      name && typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(name) : null;
    if (this.bc) {
      this.bc.onmessage = () => {
        for (const fn of [...this.listeners]) fn();
      };
    }
  }

  private readLog(): RelayEntry[] {
    try {
      const raw = this.storage.getItem(this.key);
      return raw ? (JSON.parse(raw) as RelayEntry[]) : [];
    } catch {
      return [];
    }
  }

  append(delta: PushDelta): number {
    const entries = this.readLog();
    const seq = (entries[entries.length - 1]?.seq ?? 0) + 1;
    entries.push({ seq, delta });
    this.storage.setItem(
      this.key,
      JSON.stringify(entries.slice(-this.maxEntries)),
    );
    this.bc?.postMessage(seq);
    return seq;
  }

  read(since: number, limit: number): RelayEntry[] {
    return this.readLog()
      .filter((e) => e.seq > since)
      .slice(0, limit);
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  close(): void {
    this.bc?.close();
  }
}

export interface LoopbackOptions {
  /** Entries returned per pull. Exercises the engine's pagination. */
  pageSize?: number;
  /**
   * Skip entries this device pushed. Re-applying them is harmless (the merge is
   * idempotent) but wasteful, and it would fire spurious inbound updates.
   */
  deviceId?: string;
}

export class LoopbackSyncAdapter implements SyncAdapter {
  readonly connected = true;
  private readonly pageSize: number;
  private readonly deviceId: string | undefined;

  constructor(
    private readonly log: RelayLog,
    opts: LoopbackOptions = {},
  ) {
    this.pageSize = opts.pageSize ?? 200;
    this.deviceId = opts.deviceId;
  }

  async push(delta: PushDelta): Promise<PushAck> {
    return { cursor: String(this.log.append(delta)) };
  }

  async pull(since: Cursor | null): Promise<Delta | null> {
    const from = since ? Number(since) : 0;
    const page = this.log.read(from, this.pageSize);
    if (page.length === 0) return null;

    const records: RecordSet = {};
    const deletions: Tombstone[] = [];
    let profile: Delta["profile"] = undefined;

    for (const entry of page) {
      if (this.deviceId && entry.delta.deviceId === this.deviceId) continue;
      for (const [c, values] of Object.entries(entry.delta.records)) {
        if (!values) continue;
        const bucket = (records as Record<string, unknown[]>)[c] ?? [];
        bucket.push(...values);
        (records as Record<string, unknown[]>)[c] = bucket;
      }
      deletions.push(...entry.delta.deletions);
      if (entry.delta.profile !== undefined) profile = entry.delta.profile;
    }

    // The cursor advances over our own entries too, so we don't rescan them.
    const cursor = String(page[page.length - 1]!.seq);
    const delta: Delta = {
      cursor,
      records,
      deletions,
      hasMore: page.length === this.pageSize,
    };
    if (profile !== undefined) delta.profile = profile;
    return delta;
  }

  /** Wake the engine the moment another instance writes. */
  subscribe(fn: () => void): () => void {
    return this.log.subscribe?.(fn) ?? (() => {});
  }
}

/** Collections a relay entry can carry — exported for adapters that validate. */
export const RELAY_COLLECTIONS: readonly Collection[] = [
  "topics",
  "edges",
  "roadmaps",
  "suggestions",
  "guardians",
  "captures",
];
