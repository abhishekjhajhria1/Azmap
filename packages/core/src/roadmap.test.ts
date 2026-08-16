import { beforeEach, describe, expect, it } from "vitest";
import { MapStore } from "./store.js";
import { MemoryStorage } from "./storage/memory.js";
import { getRoadmap } from "./roadmaps/library.js";
import { roadmapNodeId } from "./roadmaps/lens.js";
import { FrontierSuggestionProvider } from "./suggest/index.js";

let store: MapStore;
beforeEach(() => {
  store = new MapStore(new MemoryStorage());
});

const frontend = () => getRoadmap("frontend")!;

describe("startRoadmap (mind map is the superset)", () => {
  it("inflates the path into the one graph and focuses it", async () => {
    const def = frontend();
    await store.startRoadmap(def);

    const g = await store.graph();
    expect(g.topics).toHaveLength(def.path.length);
    // Seed progress carried over: html + css known, js in progress.
    const byId = new Map(g.topics.map((t) => [t.id, t]));
    expect(byId.get(roadmapNodeId("frontend", "html"))?.progress).toBe("known");
    expect(byId.get(roadmapNodeId("frontend", "js"))?.progress).toBe("in_progress");

    const profile = await store.getProfile();
    expect(profile?.activeRoadmapId).toBe("frontend");
  });

  it("namespaces ids so two roadmaps never collide in one graph", async () => {
    await store.startRoadmap(getRoadmap("frontend")!);
    await store.startRoadmap(getRoadmap("ml")!);
    const g = await store.graph();
    const ids = new Set(g.topics.map((t) => t.id));
    expect(ids.has(roadmapNodeId("frontend", "html"))).toBe(true);
    expect(ids.has(roadmapNodeId("ml", "algebra"))).toBe(true);
    // no bare ids
    expect(ids.has("html")).toBe(false);
  });

  it("is idempotent — re-starting just re-focuses", async () => {
    await store.startRoadmap(frontend());
    const count1 = (await store.graph()).topics.length;
    await store.startRoadmap(frontend());
    const count2 = (await store.graph()).topics.length;
    expect(count2).toBe(count1);
  });

  it("computes roadmap progress from the seeded state", async () => {
    await store.startRoadmap(frontend());
    // html + css known out of 11 path topics ≈ 18%.
    expect(await store.roadmapProgress("frontend")).toBe(18);
  });
});

describe("FrontierSuggestionProvider (proposals)", () => {
  it("offers a branch only once its prerequisites are known", async () => {
    await store.startRoadmap(frontend());
    const provider = new FrontierSuggestionProvider();

    // Tailwind needs flexgrid; flexgrid isn't known yet → not proposed.
    let proposals = await store.proposals(provider);
    expect(proposals.some((p) => p.title === "Tailwind CSS")).toBe(false);

    // Learn flexgrid → Tailwind becomes reachable and is proposed.
    await store.setProgress(roadmapNodeId("frontend", "flexgrid"), "known");
    proposals = await store.proposals(provider);
    expect(proposals.some((p) => p.title === "Tailwind CSS")).toBe(true);
  });

  it("accepting a proposal adds a namespaced ai node + edges + roadmap membership", async () => {
    await store.startRoadmap(frontend());
    await store.setProgress(roadmapNodeId("frontend", "flexgrid"), "known");
    const provider = new FrontierSuggestionProvider();
    const tailwind = (await store.proposals(provider)).find((p) => p.title === "Tailwind CSS")!;

    const topic = await store.acceptProposal(tailwind);
    expect(topic.id).toBe(roadmapNodeId("frontend", "tailwind"));
    expect(topic.origin).toBe("ai");

    // It's now in the graph, wired to flexgrid, and part of the roadmap.
    const g = await store.graph();
    expect(g.edges.some((e) => e.to === topic.id && e.from === roadmapNodeId("frontend", "flexgrid"))).toBe(true);
    // Once accepted it's no longer proposed.
    expect((await store.proposals(provider)).some((p) => p.title === "Tailwind CSS")).toBe(false);
  });
});

describe("explore (curiosity feeds the second brain)", () => {
  it("adds a capture-origin node, optionally linked to context", async () => {
    const parent = await store.addTopic({ title: "Planes" });
    const child = await store.explore({ title: "What is drag", parentId: parent.id });
    expect(child.origin).toBe("capture");
    const g = await store.graph();
    const edge = g.edges.find((e) => e.from === parent.id && e.to === child.id);
    expect(edge?.strength).toBe("soft");
  });

  it("ignores a parent link when the parent doesn't exist", async () => {
    const child = await store.explore({ title: "Orphan", parentId: "nope" });
    const g = await store.graph();
    expect(g.edges).toHaveLength(0);
    expect(g.topics.map((t) => t.id)).toEqual([child.id]);
  });
});

describe("profile", () => {
  it("creates on first ensure and persists onboarding", async () => {
    const p = await store.ensureProfile("Aanya");
    expect(p.name).toBe("Aanya");
    const p2 = await store.updateProfile({ onboardedAt: 123 });
    expect(p2.onboardedAt).toBe(123);
    expect(p2.rev).toBe(p.rev + 1);
    // ensure is idempotent
    expect((await store.ensureProfile()).id).toBe(p.id);
  });
});
