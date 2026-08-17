import { describe, expect, it } from "vitest";
import { computeStatuses, topoOrder, wouldCreateCycle, wouldUnlock } from "../graph.js";
import {
  buildVectors,
  caseToGraph,
  checkOrderCase,
  checkTombstoneCase,
  VECTOR_VERSION,
} from "./vectors.js";

/**
 * The vectors' self-check.
 *
 * The expectations in `vectors.ts` are derived by running the reference
 * implementation, which is what keeps them honest — but derived expectations
 * are also trivially self-satisfying if nothing ever re-runs them. This suite is
 * what makes them a contract: it re-executes every case and asserts the engine
 * still produces the recorded answer.
 *
 * So the file can't drift from the TypeScript implementation without turning
 * this red, and Dart's job is to make the same corpus pass. Two implementations
 * that both pass the same corpus agree on everything the corpus covers, which
 * is the only guarantee available short of writing the engine once.
 */
describe("conformance vectors", () => {
  const vectors = buildVectors();

  it("declares a version, so a stale Dart fixture fails loudly", () => {
    expect(vectors.version).toBe(VECTOR_VERSION);
  });

  it("covers every rule that fails silently when it's wrong", () => {
    // A guard against the corpus quietly shrinking. Losing the soft-edge case
    // would let a Dart port gate on soft edges with a green suite.
    const names = vectors.graph.map((c) => c.name);
    expect(names).toContain("soft edge never gates");
    expect(names).toContain("dangling edge is ignored");
    expect(names).toContain("cycle");
    expect(vectors.order.map((c) => c.name)).toContain("deviceId breaks the tie");
    expect(vectors.tombstone.map((c) => c.name)).toContain("edit beats an older delete");
  });

  describe.each(vectors.graph)("graph: $name", (c) => {
    const g = caseToGraph(c);

    it("statuses", () => {
      expect(Object.fromEntries(computeStatuses(g))).toEqual(c.expect.statuses);
    });

    it("topological order", () => {
      const order = topoOrder(g);
      expect(order ? order.map((t) => t.id) : null).toEqual(c.expect.topo);
    });

    if (c.expect.unlockProbe) {
      it(`completing ${c.expect.unlockProbe} unlocks the recorded set`, () => {
        expect(
          wouldUnlock(c.expect.unlockProbe!, g)
            .map((t) => t.id)
            .sort(),
        ).toEqual(c.expect.unlocks);
      });
    }

    for (const probe of c.expect.cycles ?? []) {
      it(`adding ${probe.from} -> ${probe.to} is ${probe.cyclic ? "" : "not "}cyclic`, () => {
        expect(wouldCreateCycle(probe.from, probe.to, g)).toBe(probe.cyclic);
      });
    }
  });

  describe.each(vectors.order)("merge order: $name", (c) => {
    it("compares as recorded", () => {
      expect(checkOrderCase(c)).toBe(c.expect);
    });

    it("is antisymmetric — both peers must pick the same side", () => {
      // The property that actually makes replicas converge. A comparator that
      // is right on the recorded pair but not antisymmetric still loses data.
      expect(checkOrderCase({ ...c, a: c.b, b: c.a })).toBe(
        c.expect === 0 ? 0 : ((-c.expect) as -1 | 1),
      );
    });
  });

  describe.each(vectors.tombstone)("tombstone: $name", (c) => {
    it("resolves as recorded", () => {
      expect(checkTombstoneCase(c)).toBe(c.expect);
    });
  });
});
