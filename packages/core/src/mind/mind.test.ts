import { describe, expect, it } from "vitest";
import type { Capture, Edge, Topic } from "../types.js";
import { Mind } from "./index.js";
import { LocalMind } from "./local.js";
import { TermWeights, cleanTitle, sharedTermsPhrase, terms } from "./terms.js";
import type { MindCapability, MindProvider } from "./types.js";

// ---------------------------------------------------------------------------
// fixtures
// ---------------------------------------------------------------------------

let seq = 0;
const t = (over: Partial<Topic> & { title: string }): Topic => ({
  id: `t${++seq}`,
  title: over.title,
  summary: "",
  whyItMatters: "",
  unlocks: "",
  progress: "not_started",
  origin: "user",
  sources: [],
  tags: [],
  createdAt: 1000 + seq,
  updatedAt: 1000 + seq,
  rev: 0,
  deviceId: "d",
  ...over,
});

const e = (from: string, to: string): Edge => ({
  id: `e${++seq}`,
  from,
  to,
  strength: "hard",
  origin: "user",
  createdAt: 1,
  updatedAt: 1,
  rev: 0,
  deviceId: "d",
});

const c = (over: Partial<Capture> & { title: string }): Capture => ({
  id: `c${++seq}`,
  kind: "page",
  title: over.title,
  text: "",
  linkedTopicIds: [],
  createdAt: 1000 + seq,
  updatedAt: 1000 + seq,
  rev: 0,
  deviceId: "d",
  ...over,
});

// ---------------------------------------------------------------------------
// terms
// ---------------------------------------------------------------------------

describe("terms", () => {
  it("strips site furniture from captured titles", () => {
    expect(cleanTitle("Gradient descent explained | Medium")).toBe("Gradient descent explained");
    expect(cleanTitle("Rotational motion - YouTube")).toBe("Rotational motion");
    // Idempotent, and harmless on a title with no furniture.
    expect(cleanTitle("Plain note")).toBe("Plain note");
    expect(cleanTitle(cleanTitle("Thing | Medium"))).toBe("Thing");
  });

  it("keeps non-Latin scripts — the target user writes in them", () => {
    // A tokeniser built on [a-z] silently drops these, which would make the
    // second brain useless for exactly the students ABH is built for.
    expect(terms("गति और त्वरण")).toContain("गति");
    expect(terms("সালোকসংশ্লেষণ")).toHaveLength(1);
  });

  it("folds plurals and gerunds onto one term", () => {
    expect(terms("derivatives")).toEqual(terms("derivative"));
    expect(terms("integrating")).toEqual(terms("integrate"));
  });

  it("weights a word by how unusual it is in THIS corpus", () => {
    // "physics" is in every document, "hydrolysis" in one. A raw word count
    // would rank them equally and drown every real signal.
    const w = new TermWeights([
      "physics rotational motion",
      "physics thermodynamics",
      "physics optics",
      "chemistry hydrolysis",
    ]);
    expect(w.weight("hydrolysis")).toBeGreaterThan(w.weight("physic"));
  });

  it("scores a real match above a coincidental one", () => {
    const w = new TermWeights([
      "Gradient descent",
      "Backpropagation",
      "Linear algebra",
      "Photosynthesis",
    ]);
    const real = w.similarity("Gradient descent from scratch", "Gradient descent");
    const coincidence = w.similarity("Gradient descent from scratch", "Photosynthesis");
    expect(real.score).toBeGreaterThan(coincidence.score);
    expect(real.shared).toContain("gradient");
  });

  it("phrases shared terms as something a person would read", () => {
    expect(sharedTermsPhrase(["gradient"])).toBe("“gradient”");
    expect(sharedTermsPhrase(["gradient", "descent"])).toBe("“gradient” and “descent”");
    expect(sharedTermsPhrase([])).toBe("");
  });
});

// ---------------------------------------------------------------------------
// LocalMind — connect
// ---------------------------------------------------------------------------

describe("LocalMind.connect", () => {
  it("files a saved page against the topic it's actually about", async () => {
    const grad = t({ title: "Gradient descent" });
    const photo = t({ title: "Photosynthesis" });
    const capture = c({ title: "An intuitive guide to gradient descent | Medium" });

    const links = await new LocalMind().connect({
      graph: { topics: [grad, photo], edges: [] },
      captures: [capture],
    });

    const link = links.find((l) => l.kind === "capture-topic");
    expect(link?.fromId).toBe(capture.id);
    expect(link?.toId).toBe(grad.id);
    // The reason has to name the actual words, not say "AI suggests this".
    expect(link?.why).toContain("gradient");
    expect(link?.why).toContain("Gradient descent");
  });

  it("leaves already-linked captures alone", async () => {
    const grad = t({ title: "Gradient descent" });
    const capture = c({ title: "Gradient descent explained", linkedTopicIds: [grad.id] });
    const links = await new LocalMind().connect({
      graph: { topics: [grad], edges: [] },
      captures: [capture],
    });
    expect(links.some((l) => l.kind === "capture-topic")).toBe(false);
  });

  it("attaches an orphan topic, oldest-first as the prerequisite", async () => {
    // An orphan is invisible to the unlock engine: nothing gates it, it gates
    // nothing, so it never shows up as "available next" and falls out of the app.
    const algebra = t({ title: "Linear algebra", createdAt: 10, updatedAt: 10 });
    const eigen = t({ title: "Linear algebra eigenvectors", createdAt: 99, updatedAt: 99 });
    const links = await new LocalMind().connect({
      graph: { topics: [algebra, eigen], edges: [] },
      captures: [],
    });

    const link = links.find((l) => l.kind === "topic-topic");
    expect(link).toBeDefined();
    expect(link!.fromId).toBe(algebra.id);
    expect(link!.toId).toBe(eigen.id);
  });

  it("makes what you know the prerequisite, regardless of age", async () => {
    const known = t({ title: "Calculus limits", progress: "known", createdAt: 99, updatedAt: 99 });
    const later = t({ title: "Calculus limits and continuity", createdAt: 10, updatedAt: 10 });
    const links = await new LocalMind().connect({
      graph: { topics: [known, later], edges: [] },
      captures: [],
    });
    const link = links.find((l) => l.kind === "topic-topic");
    expect(link!.fromId).toBe(known.id);
  });

  it("never proposes an edge for a topic that already has one", async () => {
    const a = t({ title: "Linear algebra" });
    const b = t({ title: "Linear algebra eigenvectors" });
    const links = await new LocalMind().connect({
      graph: { topics: [a, b], edges: [e(a.id, b.id)] },
      captures: [],
    });
    expect(links.some((l) => l.kind === "topic-topic")).toBe(false);
  });

  it("stays quiet when nothing is actually related", async () => {
    // Being ignored is unrecoverable: a panel that proposes junk trains people
    // to dismiss it unread, and then it can never tell them anything again.
    const links = await new LocalMind().connect({
      graph: { topics: [t({ title: "Photosynthesis" }), t({ title: "Ohm's law" })], edges: [] },
      captures: [c({ title: "Sourdough starter troubleshooting" })],
    });
    expect(links).toEqual([]);
  });

  it("honours the limit so a big map can't flood the panel", async () => {
    const topics = Array.from({ length: 30 }, (_, i) => t({ title: `Kinematics topic ${i}` }));
    const captures = Array.from({ length: 30 }, (_, i) => c({ title: `Kinematics reading ${i}` }));
    const links = await new LocalMind().connect({
      graph: { topics, edges: [] },
      captures,
      limit: 5,
    });
    expect(links).toHaveLength(5);
    // Sorted best-first, so a truncated list is still the best of the batch.
    expect(links[0].confidence).toBeGreaterThanOrEqual(links[4].confidence);
  });
});

// ---------------------------------------------------------------------------
// LocalMind — distil
// ---------------------------------------------------------------------------

describe("LocalMind.distil", () => {
  it("matches an existing topic rather than inventing a duplicate", async () => {
    const grad = t({ title: "Gradient descent" });
    const links = await new LocalMind().distil({
      capture: c({ title: "Gradient descent, step by step" }),
      graph: { topics: [grad], edges: [] },
    });
    expect(links.every((l) => l.kind === "capture-topic")).toBe(true);
    expect(links[0].toId).toBe(grad.id);
  });

  it("never proposes a new topic AND a link to an existing one", async () => {
    // That combination is how a map ends up with "Backpropagation" and
    // "Backprop" as separate nodes, and nothing in the product ever merges them.
    const links = await new LocalMind().distil({
      capture: c({ title: "Backpropagation explained" }),
      graph: { topics: [t({ title: "Backpropagation" })], edges: [] },
    });
    expect(links.some((l) => l.kind === "capture-newtopic")).toBe(false);
  });

  it("proposes a clean new topic when the map has nothing close", async () => {
    const links = await new LocalMind().distil({
      capture: c({ title: "Kubernetes operators in practice | Medium" }),
      graph: { topics: [t({ title: "Photosynthesis" })], edges: [] },
    });
    expect(links).toHaveLength(1);
    expect(links[0].kind).toBe("capture-newtopic");
    // Site furniture must not survive into a node title.
    expect(links[0].draft?.title).toBe("Kubernetes operators in practice");
  });

  it("has nothing to say about an empty capture", async () => {
    const links = await new LocalMind().distil({
      capture: c({ title: "", text: "" }),
      graph: { topics: [t({ title: "Anything" })], edges: [] },
    });
    expect(links).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// LocalMind — next
// ---------------------------------------------------------------------------

describe("LocalMind.next", () => {
  it("prefers the topic that unlocks the most", async () => {
    // The whole premise of a prerequisite graph is that some nodes are worth
    // more than others. A flat "available now" list throws that away.
    const hub = t({ title: "Derivatives" });
    const dead = t({ title: "Roman numerals" });
    const kids = Array.from({ length: 4 }, (_, i) => t({ title: `Application ${i}` }));

    const steps = await new LocalMind().next({
      graph: { topics: [hub, dead, ...kids], edges: kids.map((k) => e(hub.id, k.id)) },
      limit: 1,
    });
    expect(steps[0].topicId).toBe(hub.id);
    expect(steps[0].why).toContain("4");
  });

  it("puts something you already started first", async () => {
    const started = t({ title: "Thermodynamics", progress: "in_progress" });
    const fresh = t({ title: "Optics" });
    const steps = await new LocalMind().next({
      graph: { topics: [started, fresh], edges: [] },
      limit: 1,
    });
    expect(steps[0].topicId).toBe(started.id);
    expect(steps[0].why).toContain("started");
  });

  it("never suggests something still locked", async () => {
    const base = t({ title: "Algebra" });
    const locked = t({ title: "Calculus" });
    const steps = await new LocalMind().next({
      graph: { topics: [base, locked], edges: [e(base.id, locked.id)] },
      limit: 5,
    });
    expect(steps.map((s) => s.topicId)).toEqual([base.id]);
  });

  it("returns nothing when the map is finished, instead of inventing work", async () => {
    const steps = await new LocalMind().next({
      graph: { topics: [t({ title: "Done", progress: "known" })], edges: [] },
    });
    expect(steps).toEqual([]);
  });

  it("leaves `minutes` unset rather than guessing a number", async () => {
    const steps = await new LocalMind().next({
      graph: { topics: [t({ title: "Anything" })], edges: [] },
    });
    expect(steps[0].minutes).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Mind — consent, routing, and surviving a bad provider
// ---------------------------------------------------------------------------

/** A stand-in for a model provider, scriptable into every way one can misbehave. */
class FakeProvider implements MindProvider {
  readonly id = "fake";
  readonly label = "Fake model";
  readonly local = false;
  calls = 0;
  constructor(
    readonly capabilities: readonly MindCapability[],
    private readonly behaviour: "ok" | "throw" | "hang" | "garbage" | "partial" = "ok",
  ) {}

  async connect(): Promise<never[]> {
    this.calls++;
    if (this.behaviour === "throw") throw new Error("rate limited");
    if (this.behaviour === "hang") return new Promise(() => {}); // never resolves
    return [] as never[];
  }

  async compose(): Promise<unknown> {
    this.calls++;
    if (this.behaviour === "garbage") return { nope: true };
    return {
      title: "Quantum computing",
      subtitle: "",
      domain: "physics",
      steps: [{ title: "Qubits", summary: "", why: "", domain: "physics", needs: [] }],
      caveat: "Generated, and unverified.",
    };
  }

  async next(): Promise<unknown> {
    this.calls++;
    if (this.behaviour === "partial") {
      // Nine good, one malformed — a normal Tuesday for a model.
      return [{ topicId: "t1", why: "good", confidence: 0.9 }, { why: "no id" }];
    }
    return [];
  }
}

describe("Mind — consent", () => {
  it("will not call a remote provider without consent for that capability", async () => {
    const fake = new FakeProvider(["compose"]);
    const mind = new Mind({ providers: [fake] });
    expect(await mind.compose({ subject: "quantum computing" })).toBeNull();
    expect(fake.calls).toBe(0);
  });

  it("gates per capability, not globally", async () => {
    // Composing sends a subject name. Connecting sends the shape of everything
    // you've ever saved. Wanting one and not the other is a reasonable position.
    const fake = new FakeProvider(["compose", "connect"]);
    const mind = new Mind({
      providers: [fake],
      consent: { allow: ["compose"], providerId: "fake", updatedAt: 1 },
    });
    expect(await mind.compose({ subject: "quantum computing" })).not.toBeNull();

    // `connect` falls through to the local floor, which never left the device.
    await mind.connect({ graph: { topics: [], edges: [] }, captures: [] });
    expect(fake.calls).toBe(1);
  });

  it("never gates the local provider", async () => {
    const mind = new Mind(); // no consent at all
    expect(mind.status("connect")).toEqual({ available: true });
    expect(mind.available()).toEqual(expect.arrayContaining(["connect", "distil", "next"]));
  });

  it("distinguishes 'no AI connected' from 'connected but not allowed'", async () => {
    // These need different words and a different button in the UI.
    expect(new Mind().status("compose")).toEqual({ available: false, reason: "unsupported" });
    expect(new Mind({ providers: [new FakeProvider(["compose"])] }).status("compose")).toEqual({
      available: false,
      reason: "needs-consent",
      providerId: "fake",
      label: "Fake model",
    });
  });

  it("drops cached answers when consent changes", async () => {
    const fake = new FakeProvider(["compose"]);
    const mind = new Mind({ providers: [fake] });
    expect(await mind.compose({ subject: "x" })).toBeNull();

    mind.setConsent({ allow: ["compose"], providerId: "fake", updatedAt: 2 });
    // Without the cache clear, granting permission would appear to do nothing.
    expect(await mind.compose({ subject: "x" })).not.toBeNull();
  });
});

describe("Mind — a bad provider must not break a screen", () => {
  const allow = (caps: MindCapability[]) => ({ allow: caps, providerId: "fake", updatedAt: 1 });

  it("falls back to local when the model throws", async () => {
    const fake = new FakeProvider(["connect"], "throw");
    const mind = new Mind({ providers: [fake], consent: allow(["connect"]) });
    const links = await mind.connect({
      graph: { topics: [t({ title: "Gradient descent" })], edges: [] },
      captures: [c({ title: "Gradient descent explained" })],
    });
    expect(fake.calls).toBe(1);
    expect(links.length).toBeGreaterThan(0); // local picked it up
  });

  it("gives up on a hung provider instead of hanging the app", async () => {
    const mind = new Mind({
      providers: [new FakeProvider(["connect"], "hang")],
      consent: allow(["connect"]),
      timeoutMs: 30,
    });
    const links = await mind.connect({
      graph: { topics: [t({ title: "Gradient descent" })], edges: [] },
      captures: [c({ title: "Gradient descent explained" })],
    });
    expect(links.length).toBeGreaterThan(0);
  });

  it("rejects a malformed response rather than passing it on", async () => {
    const mind = new Mind({
      providers: [new FakeProvider(["compose"], "garbage")],
      consent: allow(["compose"]),
    });
    expect(await mind.compose({ subject: "quantum computing" })).toBeNull();
  });

  it("keeps the good items when one in a batch is malformed", async () => {
    const mind = new Mind({
      providers: [new FakeProvider(["next"], "partial")],
      consent: allow(["next"]),
    });
    const steps = await mind.next({ graph: { topics: [], edges: [] } });
    expect(steps).toHaveLength(1);
    expect(steps[0].topicId).toBe("t1");
  });

  it("clamps a model's overlong prose instead of dropping the proposal", async () => {
    class Longwinded extends FakeProvider {
      override async compose(): Promise<unknown> {
        return {
          title: "Quantum computing",
          subtitle: "x".repeat(9000),
          domain: "physics",
          steps: [{ title: "Qubits", summary: "", why: "", domain: "physics", needs: [] }],
          caveat: "",
        };
      }
    }
    const mind = new Mind({
      providers: [new Longwinded(["compose"])],
      consent: allow(["compose"]),
    });
    // A 9,000-character subtitle is a formatting failure, not a reason to throw
    // away an otherwise-good path — clamp it and keep the steps.
    const path = await mind.compose({ subject: "q" });
    expect(path).not.toBeNull();
    expect(path!.subtitle).toHaveLength(400);
    expect(path!.steps).toHaveLength(1);
  });
});

describe("Mind — caching", () => {
  it("answers a repeated question without asking again", async () => {
    const fake = new FakeProvider(["compose"]);
    const mind = new Mind({ providers: [fake], consent: { allow: ["compose"], providerId: "fake", updatedAt: 1 } });
    await mind.compose({ subject: "quantum computing" });
    await mind.compose({ subject: "quantum computing" });
    expect(fake.calls).toBe(1);
  });

  it("re-asks once the map has actually changed", async () => {
    const mind = new Mind();
    const grad = t({ title: "Gradient descent" });
    const capture = c({ title: "Gradient descent explained" });
    const first = await mind.connect({ graph: { topics: [grad], edges: [] }, captures: [capture] });
    expect(first.length).toBeGreaterThan(0);

    // Accepting the proposal links the capture, so the answer must change.
    const linked = { ...capture, linkedTopicIds: [grad.id], updatedAt: capture.updatedAt + 1 };
    const second = await mind.connect({ graph: { topics: [grad], edges: [] }, captures: [linked] });
    expect(second).toEqual([]);
  });
});
