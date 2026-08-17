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
    const def = frontend();
    await store.startRoadmap(def);
    // Derived from the def, not hardcoded: a percentage baked in here breaks
    // every time someone edits the content, which is the opposite of what this
    // test is for. It checks the *arithmetic*, and content is free to change.
    const seededKnown = def.path.filter((s) => s.progress === "known").length;
    const expected = Math.round((seededKnown / def.path.length) * 100);
    expect(await store.roadmapProgress("frontend")).toBe(expected);
    expect(seededKnown).toBeGreaterThan(0); // the fixture must actually seed some
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

describe("linkCapture (a second brain whose contents point at each other)", () => {
  it("files a capture against an existing topic instead of minting a duplicate", async () => {
    const topic = await store.addTopic({ title: "Backpropagation" });
    const capture = await store.addCapture({ kind: "page", title: "Backprop explained" });

    const linked = await store.linkCapture(capture.id, topic.id);
    expect(linked?.linkedTopicIds).toEqual([topic.id]);
    expect(linked?.rev).toBe(capture.rev + 1);
    // The map didn't grow — that's the whole point.
    expect((await store.graph()).topics).toHaveLength(1);
  });

  it("is idempotent, so a double-tap can't duplicate the link", async () => {
    const topic = await store.addTopic({ title: "Backpropagation" });
    const capture = await store.addCapture({ kind: "page", title: "Backprop" });
    await store.linkCapture(capture.id, topic.id);
    const again = await store.linkCapture(capture.id, topic.id);
    expect(again?.linkedTopicIds).toEqual([topic.id]);
  });

  it("returns null rather than throwing when either end is gone", async () => {
    // Proposals are computed before they're tapped, and another device may have
    // deleted the record in between. That's ordinary, not exceptional.
    const capture = await store.addCapture({ kind: "note", title: "Orphan" });
    expect(await store.linkCapture(capture.id, "t_missing")).toBeNull();
    expect(await store.linkCapture("c_missing", "t_missing")).toBeNull();
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
