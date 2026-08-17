/**
 * The sync wire contract.
 *
 * Deliberately small: a cursor, a set of changed records, and tombstones. The
 * merge rule lives on the device (`sync/merge.ts`), not on the server, so a
 * server implementation is a dumb, append-only relay — cheap to run, and it
 * never needs to understand what a topic is.
 */

import type { Collection, MapSnapshot, Profile, Tombstone } from "../types.js";

/**
 * An opaque position in the remote's change log. Devices store it verbatim and
 * hand it back on the next pull; only the remote assigns meaning to it.
 */
export type Cursor = string;

/** Changed records, grouped by the collection they belong to. */
export type RecordSet = Partial<Pick<MapSnapshot, Collection>>;

/** What a device sends up. */
export interface PushDelta {
  /** The device that produced these writes — also the merge tiebreak. */
  deviceId: string;
  records: RecordSet;
  deletions: Tombstone[];
  /** Present only when the profile changed since the last push. */
  profile?: Profile | null;
}

/**
 * What the remote returns for a push. `cursor` covers the writes just accepted,
 * so the next pull doesn't hand our own records back to us.
 */
export interface PushAck {
  cursor: Cursor;
}

/** What a device receives on a pull. */
export interface Delta {
  /** Where to resume from next time. Store it only after a successful apply. */
  cursor: Cursor;
  records: RecordSet;
  deletions: Tombstone[];
  profile?: Profile | null;
  /**
   * True when the remote truncated the response. The engine pulls again
   * immediately rather than waiting for the next tick.
   */
  hasMore?: boolean;
}

/**
 * Moves deltas to and from a remote.
 *
 * ## Implementing this over HTTP
 *
 * Two endpoints and one rule.
 *
 * - `POST /sync/push` — body is a `PushDelta`. The server appends each record
 *   to the account's change log **without interpreting it** and replies with a
 *   `PushAck` whose cursor covers the appended entries. It MUST be safe to
 *   replay: the engine retries a push whose response was lost, so the server
 *   dedupes on `(collection, id, rev, deviceId)`.
 * - `GET /sync/pull?since=<cursor>` — replies with a `Delta` of everything
 *   appended after `since`, oldest first, excluding nothing (a device may see
 *   its own writes come back; the merge is idempotent, so that is harmless).
 *   Set `hasMore` when the page was truncated.
 *
 * The rule: the server never merges, never resolves conflicts and never
 * validates domain shape. Ordering is decided on-device by
 * `compareVersions`, which is why two devices always agree without the server
 * needing to be right about anything.
 *
 * Offline is signalled by throwing (a fetch rejection is enough) or by
 * returning `null` from `pull` — the engine treats both as "try again later"
 * and never loses the outbox.
 */
export interface SyncAdapter {
  /** Whether a remote is configured at all. */
  readonly connected: boolean;
  push(delta: PushDelta): Promise<PushAck>;
  /** Returns null when there is nothing new. */
  pull(since: Cursor | null): Promise<Delta | null>;
  /**
   * Optional push notification: call `fn` when the remote has something new, so
   * the engine syncs immediately instead of waiting for its next tick. A
   * WebSocket or SSE adapter implements this; a plain polling one doesn't.
   */
  subscribe?(fn: () => void): () => void;
}

/** What the UI shows. `offline` is expected and not an error. */
export type SyncStatus = "idle" | "syncing" | "offline" | "error";

export interface SyncSnapshotState {
  status: SyncStatus;
  /** Local writes not yet acknowledged by the remote. */
  pending: number;
  lastSyncedAt: number | null;
  /** Set only while `status === "error"`. */
  error: string | null;
  /** Consecutive failures — drives the backoff delay. */
  attempt: number;
}

/**
 * Durable sync bookkeeping. Kept apart from `StorageAdapter` on purpose: this
 * is engine state, not user data, and it must never end up in an export.
 */
export interface SyncStateStore {
  load(): Promise<PersistedSyncState | null>;
  save(state: PersistedSyncState): Promise<void>;
}

export interface PersistedSyncState {
  cursor: Cursor | null;
  /** Outbox keys, `"collection:id"`, in insertion order. */
  outbox: string[];
  profileDirty: boolean;
}

/** An in-memory `SyncStateStore` — the default, and what tests use. */
export class MemorySyncState implements SyncStateStore {
  private state: PersistedSyncState | null = null;
  async load() {
    return this.state;
  }
  async save(state: PersistedSyncState) {
    this.state = { ...state, outbox: [...state.outbox] };
  }
}

/** Assemble a snapshot the storage layer can merge from a received delta. */
export function deltaToSnapshot(delta: {
  records: RecordSet;
  deletions: Tombstone[];
  profile?: Profile | null;
}): MapSnapshot {
  return {
    version: 2,
    topics: delta.records.topics ?? [],
    edges: delta.records.edges ?? [],
    roadmaps: delta.records.roadmaps ?? [],
    suggestions: delta.records.suggestions ?? [],
    guardians: delta.records.guardians ?? [],
    captures: delta.records.captures ?? [],
    deletions: delta.deletions ?? [],
    profile: delta.profile ?? null,
    exportedAt: Date.now(),
  };
}
