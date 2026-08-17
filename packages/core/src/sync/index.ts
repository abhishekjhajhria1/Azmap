/**
 * Sync — the engine, the wire contract, and the guardian seam.
 *
 * The product is on-device first: nothing here runs unless an adapter is
 * configured, and `LocalOnlySync` (the default) never touches a network. What
 * this module guarantees is that turning sync *on* is a configuration change,
 * not a rewrite — the merge rule, the outbox and the record envelope are the
 * same whether or not a remote exists.
 *
 * Wiring it up:
 *
 * ```ts
 * const raw = new IndexedDbStorage();
 * const outbox = new Outbox(state);
 * const store = new MapStore(new TrackedStorage(raw, outbox)); // app writes here
 * const engine = new SyncEngine({ storage: raw, outbox, adapter });
 * await engine.start();
 * ```
 *
 * The app writes through `TrackedStorage` so every mutation is queued; the
 * engine holds the raw adapter so inbound records don't echo back out.
 */

export { SyncEngine } from "./engine.js";
export type {
  InboundChange,
  Scheduler,
  SyncEngineOptions,
  SyncResult,
} from "./engine.js";
export { Outbox, TrackedStorage } from "./outbox.js";
export {
  LocalStorageRelayLog,
  LoopbackSyncAdapter,
  MemoryRelayLog,
} from "./loopback.js";
export type {
  LocalStorageRelayOptions,
  LoopbackOptions,
  RelayEntry,
  RelayLog,
} from "./loopback.js";
export {
  compareVersions,
  incomingWins,
  mergeRecords,
  mergeTombstones,
  tombstoneKey,
  tombstoneWins,
} from "./merge.js";
export type { Versioned } from "./merge.js";
export { deltaToSnapshot, MemorySyncState } from "./types.js";
export type {
  Cursor,
  Delta,
  PersistedSyncState,
  PushAck,
  PushDelta,
  RecordSet,
  SyncAdapter,
  SyncSnapshotState,
  SyncStateStore,
  SyncStatus,
} from "./types.js";

import type { Cursor, PushAck, SyncAdapter } from "./types.js";

/**
 * The shipped default: a device with no remote configured.
 *
 * It is a real adapter, not a stub — the engine runs its full lifecycle against
 * it, reports `offline`, and keeps the outbox intact. Point the app at a real
 * adapter later and every queued write since install is pushed.
 */
export class LocalOnlySync implements SyncAdapter {
  readonly connected = false;
  async push(): Promise<PushAck> {
    return { cursor: "" as Cursor };
  }
  async pull(): Promise<null> {
    return null;
  }
}

/**
 * An opt-in link that lets a guardian see (a scoped view of) a learner's
 * progress. Designed here; issued/honoured by the backend later. A learner
 * always creates the link — telling someone is a deliberate act, never default.
 */
export interface GuardianLink {
  id: string;
  learnerId: string;
  guardianId: string;
  /** What the guardian may see/do — least privilege by default. */
  scope: {
    progress: boolean; // see % and completed topics
    signOff: boolean; // confirm completed work
    slipAlerts: boolean; // be told when the learner falls behind
  };
  createdAt: number;
  revokedAt: number | null;
}
