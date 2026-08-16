import { describe, expect, it } from "vitest";
import * as graph from "./graph.js";
import type { Edge, Topic } from "./types.js";

function topic(id: string, progress: Topic["progress"] = "not_started"): Topic {
  return {
    id,
    title: id,
    summary: "",
    whyItMatters: "",
    unlocks: "",
    progress,
    origin: "user",
    sources: [],
    tags: [],
    createdAt: 0,
    updatedAt: 0,
    rev: 0,
  };
}

function edge(from: string, to: string, strength: Edge["strength"] = "hard"): Edge {
  return { id: `${from}->${to}`, from, to, strength, origin: "user", createdAt: 0, rev: 0 };
}

describe("availability", () => {
  it("treats a topic with no prerequisites as available", () => {
    const g = { topics: [topic("a")], edges: [] };
    expect(graph.availableNow(g).map((t) => t.id)).toEqual(["a"]);
  });

  it("locks a topic until every hard prerequisite is known", () => {
    const g = {
      topics: [topic("a"), topic("b"), topic("c")],
      edges: [edge("a", "c"), edge("b", "c")],
    };
    // a and b are available; c is locked.
    expect(graph.availableNow(g).map((t) => t.id).sort()).toEqual(["a", "b"]);

    g.topics[0] = topic("a", "known"); // only one prereq met
    expect(graph.availableNow(g).map((t) => t.id)).not.toContain("c");

    g.topics[1] = topic("b", "known"); // both met now
    expect(graph.availableNow(g).map((t) => t.id)).toContain("c");
  });

  it("ignores soft edges when gating availability", () => {
    const g = {
      topics: [topic("a"), topic("b")],
      edges: [edge("a", "b", "soft")],
    };
    expect(graph.availableNow(g).map((t) => t.id).sort()).toEqual(["a", "b"]);
  });

  it("never reports a known topic as available", () => {
    const g = { topics: [topic("a", "known")], edges: [] };
    expect(graph.availableNow(g)).toHaveLength(0);
  });
});

describe("statuses", () => {
  it("derives known / in_progress / available / locked", () => {
    const g = {
      topics: [
        topic("a", "known"),
        topic("b", "in_progress"),
        topic("c"), // available (prereq a is known)
        topic("d"), // locked (prereq c not known)
      ],
      edges: [edge("a", "c"), edge("c", "d")],
    };
    const s = graph.computeStatuses(g);
    expect(s.get("a")).toBe("known");
    expect(s.get("b")).toBe("in_progress");
    expect(s.get("c")).toBe("available");
    expect(s.get("d")).toBe("locked");
  });
});

describe("wouldUnlock", () => {
  it("previews the topics that open when a topic is completed", () => {
    // a -> c, b -> c : completing a alone should NOT unlock c (b still unmet).
    const g = {
      topics: [topic("a"), topic("b"), topic("c")],
      edges: [edge("a", "c"), edge("b", "c")],
    };
    expect(graph.wouldUnlock("a", g)).toHaveLength(0);

    // With b already known, completing a unlocks c.
    g.topics[1] = topic("b", "known");
    expect(graph.wouldUnlock("a", g).map((t) => t.id)).toEqual(["c"]);
  });

  it("can open several topics at once", () => {
    const g = {
      topics: [topic("a"), topic("b"), topic("c")],
      edges: [edge("a", "b"), edge("a", "c")],
    };
    expect(graph.wouldUnlock("a", g).map((t) => t.id).sort()).toEqual(["b", "c"]);
  });
});

describe("cycle safety", () => {
  it("detects direct and transitive cycles", () => {
    const g = {
      topics: [topic("a"), topic("b"), topic("c")],
      edges: [edge("a", "b"), edge("b", "c")],
    };
    expect(graph.wouldCreateCycle("c", "a", g)).toBe(true); // c->a closes a loop
    expect(graph.wouldCreateCycle("a", "c", g)).toBe(false); // a->c is fine (DAG)
    expect(graph.wouldCreateCycle("a", "a", g)).toBe(true); // self-loop
  });
});

describe("topoOrder", () => {
  it("orders prerequisites before dependents", () => {
    const g = {
      topics: [topic("c"), topic("a"), topic("b")],
      edges: [edge("a", "b"), edge("b", "c")],
    };
    const order = graph.topoOrder(g)!.map((t) => t.id);
    expect(order.indexOf("a")).toBeLessThan(order.indexOf("b"));
    expect(order.indexOf("b")).toBeLessThan(order.indexOf("c"));
  });

  it("returns null for a cyclic graph", () => {
    const g = {
      topics: [topic("a"), topic("b")],
      edges: [edge("a", "b"), edge("b", "a")],
    };
    expect(graph.topoOrder(g)).toBeNull();
  });
});

describe("progressPercent", () => {
  it("computes rounded completion", () => {
    expect(graph.progressPercent([])).toBe(0);
    expect(
      graph.progressPercent([topic("a", "known"), topic("b"), topic("c")]),
    ).toBe(33);
  });
});

describe("revealedTopicIds (the evolving map)", () => {
  it("shows known, available, and a one-hop lookahead — but hides the deep interior", () => {
    // a(known) -> b -> c -> d : b available, c is the lookahead, d hidden.
    const g = {
      topics: [topic("a", "known"), topic("b"), topic("c"), topic("d")],
      edges: [edge("a", "b"), edge("b", "c"), edge("c", "d")],
    };
    const revealed = graph.revealedTopicIds(g, { lookahead: 1 });
    expect([...revealed].sort()).toEqual(["a", "b", "c"]);
    expect(revealed.has("d")).toBe(false);
  });

  it("grows as the learner progresses", () => {
    const g = {
      topics: [topic("a", "known"), topic("b"), topic("c"), topic("d")],
      edges: [edge("a", "b"), edge("b", "c"), edge("c", "d")],
    };
    expect(graph.revealedTopicIds(g).has("d")).toBe(false);
    // Complete b -> c becomes available and d enters the lookahead.
    g.topics[1] = topic("b", "known");
    expect(graph.revealedTopicIds(g).has("d")).toBe(true);
  });

  it("always reveals prerequisite-free roots so a fresh roadmap isn't blank", () => {
    const g = { topics: [topic("a"), topic("b")], edges: [edge("a", "b")] };
    const revealed = graph.revealedTopicIds(g);
    expect(revealed.has("a")).toBe(true);
  });
});
