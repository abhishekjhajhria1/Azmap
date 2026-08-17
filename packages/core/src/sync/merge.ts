/**
 * The merge rule — the single most important piece of sync.
 *
 * The user has one account and uses one device at a time, so there is
 * effectively a single writer. That means last-writer-wins is sufficient; we do
 * NOT need CRDTs. What we DO need is for the winner to be chosen
 * **deterministically**, so that two peers merging each other's data arrive at
 * *the same* state.
 *
 * The previous rule (`existing.rev >= incoming.rev → keep existing`) failed
 * exactly here: on a tie each side kept its own copy, so A-merges-B and
 * B-merges-A produced different results and the devices diverged permanently.
 *
 * The fix is a **total order** over versions: compare `rev`, then `updatedAt`,
 * then `deviceId` lexicographically. Every field is data that travels with the
 * record, so both sides compute the identical winner. Merge becomes
 * commutative, associative and idempotent — which is what makes convergence
 * provable (and testable).
 */

import type { Collection, Tombstone } from "../types.js";

/** The version fields every syncable record carries. */
export interface Versioned {
  id: string;
  rev: number;
  updatedAt?: number;
  deviceId?: string;
}

/**
 * Total order over two versions of the same record.
 * `> 0` → `a` wins, `< 0` → `b` wins, `0` → genuinely identical versions.
 */
export function compareVersions(a: Versioned, b: Versioned): number {
  if (a.rev !== b.rev) return a.rev - b.rev;
  const au = a.updatedAt ?? 0;
  const bu = b.updatedAt ?? 0;
  if (au !== bu) return au - bu;
  const ad = a.deviceId ?? "";
  const bd = b.deviceId ?? "";
  // Lexicographic device id is an arbitrary but *stable* tiebreak: both peers
  // pick the same side, which is the only property that matters here.
  return ad < bd ? -1 : ad > bd ? 1 : 0;
}

/** True when `incoming` should replace `existing`. */
export function incomingWins(existing: Versioned | undefined, incoming: Versioned): boolean {
  if (!existing) return true;
  return compareVersions(incoming, existing) > 0;
}

/**
 * Merge a batch of records into a map by the total order above.
 * Commutative: applying A then B equals applying B then A.
 */
export function mergeRecords<T extends Versioned>(
  target: Map<string, T>,
  incoming: readonly T[],
): void {
  for (const rec of incoming) {
    if (incomingWins(target.get(rec.id), rec)) target.set(rec.id, rec);
  }
}

/**
 * Should a tombstone win over a live record?
 *
 * A delete competes with the record's own version using the same total order,
 * so a *later* edit legitimately resurrects a record the user un-deleted, while
 * a stale copy can never undo a newer delete.
 */
export function tombstoneWins(record: Versioned | undefined, tomb: Tombstone): boolean {
  if (!record) return true;
  return compareVersions(
    { id: tomb.id, rev: tomb.rev, updatedAt: tomb.deletedAt, deviceId: tomb.deviceId },
    record,
  ) > 0;
}

/** Merge tombstones themselves (a peer may know about deletes we don't). */
export function mergeTombstones(
  target: Map<string, Tombstone>,
  incoming: readonly Tombstone[],
): void {
  for (const t of incoming) {
    const key = tombstoneKey(t.collection, t.id);
    const existing = target.get(key);
    const asVersioned = (x: Tombstone): Versioned => ({
      id: x.id, rev: x.rev, updatedAt: x.deletedAt, deviceId: x.deviceId,
    });
    if (!existing || compareVersions(asVersioned(t), asVersioned(existing)) > 0) {
      target.set(key, t);
    }
  }
}

/** Tombstones are keyed by collection+id, since ids are only unique per store. */
export function tombstoneKey(collection: Collection, id: string): string {
  return `${collection}:${id}`;
}
