/**
 * Every roadmap in the library, checked as a graph.
 *
 * This is the test that makes hand-authored content safe to write. Once a
 * syllabus runs to two hundred topics, a typo'd prerequisite or an accidental
 * cycle is invisible to a human reader and fatal to the unlock engine — a cycle
 * means nothing ever becomes available, and a dangling `needs` means a topic is
 * locked forever with no way to see why. These run over the real library, so
 * adding content is guarded by construction.
 */

import { describe, expect, it } from "vitest";
import { ROADMAPS, getRoadmap } from "./library.js";
import { wouldCreateCycle, topoOrder } from "../graph.js";
import type { RoadmapDef, TopicSeed } from "./types.js";

const all = (def: RoadmapDef): TopicSeed[] => [...def.path, ...def.branches];

describe("the roadmap library", () => {
  it("has content", () => {
    expect(ROADMAPS.length).toBeGreaterThan(5);
  });

  it("exposes every roadmap by id", () => {
    for (const def of ROADMAPS) expect(getRoadmap(def.id)?.id).toBe(def.id);
  });

  it("has unique roadmap ids", () => {
    const ids = ROADMAPS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const def of ROADMAPS) {
    describe(def.id, () => {
      it("has unique seed ids", () => {
        const ids = all(def).map((s) => s.id);
        const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
        expect(dupes).toEqual([]);
      });

      it("resolves every prerequisite to a real seed", () => {
        const known = new Set(all(def).map((s) => s.id));
        const dangling: string[] = [];
        for (const s of all(def)) {
          for (const need of s.needs ?? []) {
            if (!known.has(need)) dangling.push(`${s.id} needs ${need}`);
          }
        }
        expect(dangling).toEqual([]);
      });

      it("is acyclic, so something is always available", () => {
        // Build the graph edge by edge, the way MapStore does, and let the real
        // cycle check reject the first edge that would close a loop.
        const topics = all(def).map((s) => topicFor(s));
        const edges: { id: string; from: string; to: string; strength: "hard" }[] = [];
        const offenders: string[] = [];
        for (const s of all(def)) {
          for (const need of s.needs ?? []) {
            const g = { topics, edges: edges as never };
            if (wouldCreateCycle(need, s.id, g)) offenders.push(`${need} -> ${s.id}`);
            else edges.push({ id: `${need}->${s.id}`, from: need, to: s.id, strength: "hard" });
          }
        }
        expect(offenders).toEqual([]);
        // And the whole thing can be ordered, which is the same claim from the
        // other direction.
        expect(topoOrder({ topics, edges: edges as never })).toHaveLength(topics.length);
      });

      it("starts somewhere — at least one path topic has no prerequisites", () => {
        expect(def.path.some((s) => (s.needs ?? []).length === 0)).toBe(true);
      });

      it("declares a unit for every seed when it declares units at all", () => {
        if (!def.units?.length) return;
        const unitIds = new Set(def.units.map((u) => u.id));
        const bad = def.path.filter((s) => !s.unit || !unitIds.has(s.unit)).map((s) => s.id);
        expect(bad).toEqual([]);
      });

      it("has unique unit ids", () => {
        const ids = (def.units ?? []).map((u) => u.id);
        expect(new Set(ids).size).toBe(ids.length);
      });

      it("says why every topic matters — an unexplained step is a dead end", () => {
        const silent = all(def).filter((s) => s.why.trim().length < 10).map((s) => s.id);
        expect(silent).toEqual([]);
      });

      it("keeps weights in range where it uses them", () => {
        const bad = all(def)
          .filter((s) => s.weight !== undefined && (s.weight < 1 || s.weight > 5))
          .map((s) => s.id);
        expect(bad).toEqual([]);
      });
    });
  }
});

describe("exam roadmaps", () => {
  const exams = ROADMAPS.filter((r) => r.kind === "exam");

  it("exist — the student use case is real content, not a placeholder", () => {
    expect(exams.length).toBeGreaterThanOrEqual(2);
  });

  for (const def of exams) {
    it(`${def.id} is grouped into units and carries weights`, () => {
      expect(def.units?.length ?? 0).toBeGreaterThan(2);
      expect(def.path.filter((s) => s.weight !== undefined).length).toBeGreaterThan(
        def.path.length / 2,
      );
    });

    it(`${def.id} points at a guide`, () => {
      expect(def.guideId).toBeTruthy();
    });
  }
});

/** Minimal Topic shim for the pure graph helpers. */
function topicFor(s: TopicSeed) {
  return {
    id: s.id,
    title: s.title,
    summary: "",
    whyItMatters: s.why,
    unlocks: "",
    progress: "not_started" as const,
    origin: "curated" as const,
    sources: [],
    tags: [s.domain],
    createdAt: 0,
    updatedAt: 0,
    rev: 0,
    deviceId: "",
  };
}
