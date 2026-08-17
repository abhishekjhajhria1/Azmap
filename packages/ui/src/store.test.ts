/**
 * The fluidity contract.
 *
 * These assert *what work a mutation does*, not just what it produces. A test
 * that only checks the resulting state passes just as happily when every
 * keystroke re-reads the entire database — which is exactly the regression this
 * file exists to catch.
 */

import { MapStore, MemoryStorage } from "@abh/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAbh } from "./store.js";

let store: MapStore;

/** Count reads per collection so "did this mutation touch the world?" is measurable. */
function instrument(storage: MemoryStorage) {
  const counts = { topics: 0, edges: 0, roadmaps: 0, captures: 0, suggestions: 0, guardians: 0 };
  for (const k of Object.keys(counts) as (keyof typeof counts)[]) {
    const method = `get${k[0]!.toUpperCase()}${k.slice(1)}` as keyof MemoryStorage;
    const original = (storage[method] as () => Promise<unknown[]>).bind(storage);
    (storage as unknown as Record<string, unknown>)[method] = () => {
      counts[k] += 1;
      return original();
    };
  }
  return counts;
}

/** Proposals are debounced; give them room when a test cares about them. */
const settle = () => new Promise<void>((r) => setTimeout(r, 200));

beforeEach(async () => {
  store = new MapStore(new MemoryStorage("dev-test"));
  useAbh.setState({
    ready: false,
    store: null,
    topics: [],
    edges: [],
    roadmaps: [],
    captures: [],
    profile: null,
    statuses: new Map(),
    proposals: [],
    sync: null,
  });
  await useAbh.getState().init(store);
});

describe("a mutation never reads the whole database", () => {
  it("setProgress does not call export()", async () => {
    const t = await useAbh.getState().store!.addTopic({ title: "Limits" });
    await useAbh.getState().refresh();

    const exportSpy = vi.spyOn(store, "export");
    await useAbh.getState().setProgress(t.id, "in_progress");

    expect(exportSpy).not.toHaveBeenCalled();
  });

  it("setProgress touches only the topic store, not captures or roadmaps", async () => {
    const storage = new MemoryStorage("dev-test");
    const counted = instrument(storage);
    const s = new MapStore(storage);
    const t = await s.addTopic({ title: "Limits" });
    await useAbh.getState().init(s);
    await settle();

    const base = { ...counted };
    await useAbh.getState().setProgress(t.id, "in_progress");

    expect(counted.captures).toBe(base.captures);
    expect(counted.roadmaps).toBe(base.roadmaps);
    expect(counted.guardians).toBe(base.guardians);
  });

  it("addCapture patches the list in place instead of reloading the graph", async () => {
    const exportSpy = vi.spyOn(store, "export");
    const graphSpy = vi.spyOn(store, "graph");

    await useAbh.getState().addCapture({ kind: "note", text: "an idea" });

    expect(exportSpy).not.toHaveBeenCalled();
    expect(graphSpy).not.toHaveBeenCalled();
    expect(useAbh.getState().captures.map((c) => c.text)).toEqual(["an idea"]);
  });

  it("updating the profile does not reload the graph", async () => {
    await useAbh.getState().ensureProfile("Ada");
    const graphSpy = vi.spyOn(store, "graph");

    await useAbh.getState().updateProfile({ name: "Ada Lovelace" });

    expect(graphSpy).not.toHaveBeenCalled();
    expect(useAbh.getState().profile!.name).toBe("Ada Lovelace");
  });
});

describe("optimistic updates", () => {
  it("repaints before the write resolves", async () => {
    const t = await store.addTopic({ title: "Limits" });
    await useAbh.getState().refresh();

    let resolveWrite!: () => void;
    vi.spyOn(store, "setProgress").mockImplementation(async (id, p) => {
      await new Promise<void>((r) => (resolveWrite = r));
      return { ...t, id, progress: p, rev: t.rev + 1 };
    });

    const pending = useAbh.getState().setProgress(t.id, "known");
    // The write has NOT resolved, yet the UI already shows the new state.
    expect(useAbh.getState().topics.find((x) => x.id === t.id)!.progress).toBe("known");
    expect(useAbh.getState().statuses.get(t.id)).toBe("known");

    resolveWrite();
    await pending;
    expect(useAbh.getState().topics.find((x) => x.id === t.id)!.progress).toBe("known");
  });

  it("rolls the record back when the write fails", async () => {
    const t = await store.addTopic({ title: "Limits" });
    await useAbh.getState().refresh();
    vi.spyOn(store, "setProgress").mockRejectedValue(new Error("disk full"));

    await expect(useAbh.getState().setProgress(t.id, "known")).rejects.toThrow("disk full");
    expect(useAbh.getState().topics.find((x) => x.id === t.id)!.progress).toBe("not_started");
  });

  it("a rollback does not discard a record that changed meanwhile", async () => {
    const a = await store.addTopic({ title: "A" });
    const b = await store.addTopic({ title: "B" });
    await useAbh.getState().refresh();

    let fail!: (e: Error) => void;
    vi.spyOn(store, "setProgress").mockImplementation(
      () => new Promise((_, reject) => (fail = reject)),
    );

    const pending = useAbh.getState().setProgress(a.id, "known");
    // Something else lands while the failing write is in flight.
    useAbh.setState({
      topics: useAbh.getState().topics.map((t) =>
        t.id === b.id ? { ...t, title: "B (renamed)" } : t,
      ),
    });
    fail(new Error("nope"));
    await expect(pending).rejects.toThrow();

    expect(useAbh.getState().topics.find((t) => t.id === a.id)!.progress).toBe("not_started");
    expect(useAbh.getState().topics.find((t) => t.id === b.id)!.title).toBe("B (renamed)");
  });
});

describe("derivations", () => {
  it("statuses are recomputed synchronously with the graph", async () => {
    const a = await store.addTopic({ title: "Limits" });
    const b = await store.addTopic({ title: "Derivatives" });
    await store.addEdge(a.id, b.id);
    await useAbh.getState().refresh();

    expect(useAbh.getState().statuses.get(a.id)).toBe("available");
    expect(useAbh.getState().statuses.get(b.id)).toBe("locked");

    // Optimistic completion must unlock the dependent in the same tick.
    void useAbh.getState().setProgress(a.id, "known");
    expect(useAbh.getState().statuses.get(b.id)).toBe("available");
  });

  it("proposals are debounced — a burst of edits computes them once", async () => {
    const proposalSpy = vi.spyOn(store, "proposals");
    await settle();
    proposalSpy.mockClear();

    for (let i = 0; i < 8; i++) await store.addTopic({ title: `t${i}` });
    const g = await store.graph();
    for (let i = 0; i < 8; i++) useAbh.setState({ topics: g.topics, edges: g.edges });
    // Eight commits in a burst.
    for (let i = 0; i < 8; i++) await useAbh.getState().addCapture({ kind: "note", text: `${i}` });
    await useAbh.getState().setProgress(g.topics[0]!.id, "in_progress");

    await settle();
    expect(proposalSpy.mock.calls.length).toBeLessThanOrEqual(2);
  });
});

describe("completion", () => {
  it("reports unlocked topics and the streak for the celebration", async () => {
    const a = await store.addTopic({ title: "Limits" });
    const b = await store.addTopic({ title: "Derivatives" });
    await store.addEdge(a.id, b.id);
    await useAbh.getState().refresh();

    const { unlocked, streak } = await useAbh.getState().complete(a.id);

    expect(unlocked.map((t) => t.id)).toEqual([b.id]);
    expect(streak).toBeGreaterThan(0);
    expect(useAbh.getState().statuses.get(b.id)).toBe("available");
  });
});
