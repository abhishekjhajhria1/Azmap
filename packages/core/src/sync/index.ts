/**
 * Sync + guardian sharing — the seams, not the backend.
 *
 * The product is on-device first. Guardian visibility and cross-device sync are
 * a funded, later phase, but the shape is defined now so nothing has to be
 * rewritten when it lands. The foundation already exists on the storage layer:
 * every record carries a monotonic `rev`, and `StorageAdapter.exportSnapshot` /
 * `importSnapshot("merge")` implement last-writer-by-`rev` merge — that IS the
 * sync contract. A real adapter moves deltas over the wire; the merge rule
 * stays identical.
 */

import type { MapSnapshot } from "../types.js";

/** A change set to move between devices. Keyed on `rev` for conflict handling. */
export interface Delta {
  since: number; // highest rev the peer already has
  snapshot: MapSnapshot; // records newer than `since` (full snapshot is valid too)
}

/**
 * Moves deltas to/from a remote. `LocalOnlySync` is the shipped default — it
 * never touches a network, so the app is fully offline until a real backend
 * implements this same interface.
 */
export interface SyncAdapter {
  /** Push local changes to the remote. No-op locally. */
  push(delta: Delta): Promise<void>;
  /** Pull remote changes to merge locally. Returns null when nothing/offline. */
  pull(since: number): Promise<Delta | null>;
  /** Whether a remote is configured at all. */
  readonly connected: boolean;
}

export class LocalOnlySync implements SyncAdapter {
  readonly connected = false;
  async push(): Promise<void> {}
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
