import { describe, expect, it } from "vitest";
import {
  compareVersions,
  incomingWins,
  mergeRecords,
  mergeTombstones,
  tombstoneKey,
  tombstoneWins,
  type Versioned,
} from "./merge.js";
import type { Tombstone } from "../types.js";

const v = (id: string, rev: number, updatedAt = 0, deviceId = ""): Versioned =>
  ({ id, rev, updatedAt, deviceId });

describe("compareVersions — a total order", () => {
  it("orders by rev first", () => {
    expect(compareVersions(v("a", 2), v("a", 1))).toBeGreaterThan(0);
    expect(compareVersions(v("a", 1), v("a", 2))).toBeLessThan(0);
  });

  it("falls back to updatedAt, then deviceId", () => {
    expect(compareVersions(v("a", 1, 200), v("a", 1, 100))).toBeGreaterThan(0);
    expect(compareVersions(v("a", 1, 100, "z"), v("a", 1, 100, "b"))).toBeGreaterThan(0);
  });

  it("is antisymmetric — the same pair always resolves the same way", () => {
    const x = v("a", 1, 100, "aaa");
    const y = v("a", 1, 100, "bbb");
    expect(Math.sign(compareVersions(x, y))).toBe(-Math.sign(compareVersions(y, x)));
  });

  it("reports 0 only for genuinely identical versions", () => {
    expect(compareVersions(v("a", 1, 5, "d"), v("a", 1, 5, "d"))).toBe(0);
  });
});

describe("convergence — the bug this fixes", () => {
  /**
   * The old rule kept the *existing* record on a tie, so each peer preferred
   * its own copy and the two never agreed. These assert the fix.
   */
  it("two peers merging each other reach the SAME state on a tie", () => {
    const fromA = v("t1", 3, 1000, "device-a");
    const fromB = v("t1", 3, 1000, "device-b"); // identical rev + time

    const a = new Map([[fromA.id, fromA]]);
    mergeRecords(a, [fromB]);

    const b = new Map([[fromB.id, fromB]]);
    mergeRecords(b, [fromA]);

    expect(a.get("t1")).toEqual(b.get("t1")); // convergence
  });

  it("merge is commutative across a batch", () => {
    const r1 = v("x", 1, 10, "a");
    const r2 = v("x", 2, 20, "b");
    const r3 = v("y", 1, 5, "a");

    const one = new Map<string, Versioned>();
    mergeRecords(one, [r1, r2, r3]);
    const two = new Map<string, Versioned>();
    mergeRecords(two, [r3, r2, r1]);

    expect([...one.entries()].sort()).toEqual([...two.entries()].sort());
  });

  it("merge is idempotent — re-delivering a delta changes nothing", () => {
    const rec = v("x", 2, 20, "a");
    const m = new Map<string, Versioned>();
    mergeRecords(m, [rec]);
    const first = new Map(m);
    mergeRecords(m, [rec]);
    mergeRecords(m, [rec]);
    expect(m).toEqual(first);
  });

  it("never lets an older copy clobber a newer one", () => {
    const m = new Map([["x", v("x", 5, 500, "a")]]);
    mergeRecords(m, [v("x", 2, 200, "b")]);
    expect(m.get("x")!.rev).toBe(5);
  });

  it("incomingWins accepts anything for an unknown id (additive data is never lost)", () => {
    expect(incomingWins(undefined, v("new", 0))).toBe(true);
  });
});

describe("tombstones", () => {
  const tomb = (id: string, rev: number, deletedAt = 0, deviceId = ""): Tombstone =>
    ({ id, collection: "topics", deletedAt, rev, deviceId });

  it("a delete beats an older copy of the record", () => {
    expect(tombstoneWins(v("t", 1, 100), tomb("t", 2, 200))).toBe(true);
  });

  it("a later edit beats an older delete (un-delete is possible)", () => {
    expect(tombstoneWins(v("t", 5, 500), tomb("t", 2, 200))).toBe(false);
  });

  it("a delete applies when the peer never had the record", () => {
    expect(tombstoneWins(undefined, tomb("t", 1))).toBe(true);
  });

  it("merges tombstones by the same total order, keyed per collection", () => {
    const m = new Map<string, Tombstone>();
    mergeTombstones(m, [tomb("t", 1, 100)]);
    mergeTombstones(m, [tomb("t", 3, 300)]);
    expect(m.get(tombstoneKey("topics", "t"))!.rev).toBe(3);
    // An older tombstone doesn't roll it back.
    mergeTombstones(m, [tomb("t", 2, 200)]);
    expect(m.get(tombstoneKey("topics", "t"))!.rev).toBe(3);
  });

  it("keys by collection so ids can repeat across stores", () => {
    const m = new Map<string, Tombstone>();
    mergeTombstones(m, [
      { id: "same", collection: "topics", deletedAt: 1, rev: 1, deviceId: "a" },
      { id: "same", collection: "captures", deletedAt: 1, rev: 1, deviceId: "a" },
    ]);
    expect(m.size).toBe(2);
  });
});
