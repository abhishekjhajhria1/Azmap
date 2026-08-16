import { beforeEach, describe, expect, it } from "vitest";
import { MapStore } from "./store.js";
import { MemoryStorage } from "./storage/memory.js";

let store: MapStore;
beforeEach(() => {
  store = new MapStore(new MemoryStorage());
});

describe("topics + completion", () => {
  it("adds a topic and reports it as available", async () => {
    await store.addTopic({ title: "Limits" });
    const avail = await store.availableNow();
    expect(avail.map((t) => t.title)).toEqual(["Limits"]);
  });

  it("completing a topic unlocks its dependents and reports them", async () => {
    const a = await store.addTopic({ title: "Limits" });
    const b = await store.addTopic({ title: "Derivatives" });
    await store.addEdge(a.id, b.id);

    // b starts locked
    let avail = await store.availableNow();
    expect(avail.map((t) => t.title)).toEqual(["Limits"]);

    const { unlocked } = await store.complete(a.id);
    expect(unlocked.map((t) => t.title)).toEqual(["Derivatives"]);

    avail = await store.availableNow();
    expect(avail.map((t) => t.title)).toEqual(["Derivatives"]);
  });

  it("bumps rev on every update for sync reconciliation", async () => {
    const a = await store.addTopic({ title: "Limits" });
    expect(a.rev).toBe(0);
    const updated = await store.updateTopic(a.id, { summary: "hi" });
    expect(updated.rev).toBe(1);
  });

  it("removing a topic drops edges that touch it", async () => {
    const a = await store.addTopic({ title: "a" });
    const b = await store.addTopic({ title: "b" });
    await store.addEdge(a.id, b.id);
    await store.removeTopic(a.id);
    const g = await store.graph();
    expect(g.edges).toHaveLength(0);
  });
});

describe("edge invariants", () => {
  it("rejects an edge that would create a cycle", async () => {
    const a = await store.addTopic({ title: "a" });
    const b = await store.addTopic({ title: "b" });
    await store.addEdge(a.id, b.id);
    await expect(store.addEdge(b.id, a.id)).rejects.toThrow(/cycle/);
  });

  it("rejects an edge referencing an unknown topic", async () => {
    const a = await store.addTopic({ title: "a" });
    await expect(store.addEdge(a.id, "nope")).rejects.toThrow(/Unknown/);
  });
});

describe("the AI-proposes / user-accepts rule", () => {
  it("keeps a proposed topic off the map until accepted", async () => {
    await store.proposeSuggestion({
      kind: "topic",
      payload: { title: "Eigenvalues" },
      rationale: "next at the edge of what you know",
    });
    // Not on the map yet.
    expect(await store.availableNow()).toHaveLength(0);
    expect(await store.pendingSuggestions()).toHaveLength(1);
  });

  it("accepting a suggestion adds a real topic tagged as ai origin", async () => {
    const s = await store.proposeSuggestion({
      kind: "topic",
      payload: { title: "Eigenvalues" },
    });
    const { topic } = await store.acceptSuggestion(s.id);
    expect(topic?.title).toBe("Eigenvalues");
    expect(topic?.origin).toBe("ai");
    expect(await store.pendingSuggestions()).toHaveLength(0);
  });

  it("rejecting a suggestion never touches the map", async () => {
    const s = await store.proposeSuggestion({ kind: "topic", payload: { title: "x" } });
    await store.rejectSuggestion(s.id);
    expect(await store.availableNow()).toHaveLength(0);
  });

  it("accepting an edge suggestion respects cycle safety", async () => {
    const a = await store.addTopic({ title: "a" });
    const b = await store.addTopic({ title: "b" });
    await store.addEdge(a.id, b.id);
    const s = await store.proposeSuggestion({
      kind: "edge",
      payload: { from: b.id, to: a.id },
    });
    await expect(store.acceptSuggestion(s.id)).rejects.toThrow(/cycle/);
  });
});

describe("roadmap progress", () => {
  it("reports rounded completion across a roadmap's topics", async () => {
    const a = await store.addTopic({ title: "a" });
    const b = await store.addTopic({ title: "b" });
    const r = await store.addRoadmap({ title: "Calc", topicIds: [a.id, b.id] });
    expect(await store.roadmapProgress(r.id)).toBe(0);
    await store.complete(a.id);
    expect(await store.roadmapProgress(r.id)).toBe(50);
  });
});

describe("portability", () => {
  it("exports and re-imports the full dataset", async () => {
    const a = await store.addTopic({ title: "a" });
    await store.addGuardian({ name: "Mentor" });
    const snap = await store.export();

    const fresh = new MapStore(new MemoryStorage());
    await fresh.import(snap, "replace");
    const g = await fresh.graph();
    expect(g.topics.map((t) => t.id)).toEqual([a.id]);
  });
});
