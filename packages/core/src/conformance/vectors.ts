/**
 * Conformance vectors — the contract a second implementation has to satisfy.
 *
 * ## Why this file exists
 *
 * The Flutter app is native Dart. That means the two pieces of this product
 * that absolutely must not disagree — the unlock engine and the sync merge
 * order — exist twice, in two languages, forever.
 *
 * Divergence in either is invisible and expensive. If the phone's merge picks a
 * different winner than the laptop's for the same pair of edits, the two devices
 * converge on *different* states and neither reports an error; you just quietly
 * lose an edit. If the phone's unlock rule treats a soft edge as gating, a
 * learner sees a topic locked on their phone and available on their laptop and
 * concludes the app is broken. Both are the kind of bug that surfaces as "it
 * feels unreliable" months later, with no stack trace to work from.
 *
 * The usual answers are both bad: hope, or run TypeScript on the phone inside a
 * JS engine (a megabyte of runtime, a bridge on every graph query, and a build
 * step nobody can debug). The standard answer for "two implementations must
 * agree" is neither — it's a shared corpus of inputs and expected outputs that
 * both sides run as tests.
 *
 * So this module builds the corpus *from the TypeScript implementation*, and
 * `conformance.test.ts` asserts TS still reproduces every expected value. That
 * makes the vectors self-checking: they cannot drift from the reference without
 * a red test here, and Dart's job is simply to make the same file pass.
 *
 * ## What's covered, and why only this
 *
 * The rules where being wrong is silent:
 *
 *   - `computeStatuses` — hard edges gate, soft edges never do
 *   - `wouldUnlock`     — what completing a topic opens up
 *   - `wouldCreateCycle`— the acyclicity invariant
 *   - `topoOrder`       — the teaching sequence
 *   - `compareVersions` — the deterministic total order (rev → updatedAt →
 *                         deviceId), the single most dangerous thing to get
 *                         wrong in the whole codebase
 *   - `tombstoneWins`   — whether a delete beats an edit
 *
 * Not covered: UI, storage, transport, crypto. Those fail loudly when they're
 * wrong, and a wrong-looking screen is a bug report, not silent corruption.
 */

import {
  computeStatuses,
  topoOrder,
  wouldCreateCycle,
  wouldUnlock,
  type Graph,
} from "../graph.js";
import { compareVersions, tombstoneWins, type Versioned } from "../sync/merge.js";
import type { Edge, MapStatus, Topic, Tombstone } from "../types.js";

/** Bumped when the shape changes, so a stale Dart fixture fails loudly. */
export const VECTOR_VERSION = 1;

export interface GraphCase {
  name: string;
  /** Why this case exists. Copied into the Dart test output when it fails. */
  rule: string;
  topics: Array<{ id: string; progress: Topic["progress"] }>;
  edges: Array<{ from: string; to: string; strength: Edge["strength"] }>;
  expect: {
    statuses: Record<string, MapStatus>;
    /** Topic ids, sorted, that completing `unlockProbe` would make available. */
    unlockProbe?: string;
    unlocks?: string[];
    /** `[from, to]` pairs and whether adding that edge closes a cycle. */
    cycles?: Array<{ from: string; to: string; cyclic: boolean }>;
    /** Ids in topological order, or null when the graph has a cycle. */
    topo: string[] | null;
  };
}

export interface OrderCase {
  name: string;
  rule: string;
  a: Versioned;
  b: Versioned;
  /** -1 when a < b, 1 when a > b, 0 when equal. Sign only — magnitude is free. */
  expect: -1 | 0 | 1;
}

export interface TombstoneCase {
  name: string;
  rule: string;
  record: Versioned | null;
  tomb: Tombstone;
  expect: boolean;
}

export interface Vectors {
  version: number;
  graph: GraphCase[];
  order: OrderCase[];
  tombstone: TombstoneCase[];
}

// ---------------------------------------------------------------------------
// builders — keep the cases readable, since they are also the spec
// ---------------------------------------------------------------------------

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
    deviceId: "",
  };
}

function edge(from: string, to: string, strength: Edge["strength"] = "hard"): Edge {
  return {
    id: `${from}->${to}`,
    from,
    to,
    strength,
    origin: "user",
    createdAt: 0,
    updatedAt: 0,
    rev: 0,
    deviceId: "",
  };
}

function v(rev: number, updatedAt: number, deviceId: string): Versioned {
  return { id: "x", rev, updatedAt, deviceId };
}

function sign(n: number): -1 | 0 | 1 {
  return n < 0 ? -1 : n > 0 ? 1 : 0;
}

/**
 * Compute the expected values by *running* the reference implementation.
 *
 * Deliberately not hand-written expectations. Hand-written ones encode what the
 * author believed the engine did, and the interesting failures are exactly the
 * cases where that belief is wrong — the vectors would then enshrine the
 * misunderstanding and demand Dart reproduce it. Derived expectations plus the
 * self-check in `conformance.test.ts` give the property that actually matters:
 * the file always describes real behaviour.
 */
function graphCase(
  name: string,
  rule: string,
  topics: Topic[],
  edges: Edge[],
  probe?: string,
  cycleProbes: Array<[string, string]> = [],
): GraphCase {
  const g: Graph = { topics, edges };
  const statuses = Object.fromEntries(computeStatuses(g));
  const order = topoOrder(g);
  return {
    name,
    rule,
    topics: topics.map((t) => ({ id: t.id, progress: t.progress })),
    edges: edges.map((e) => ({ from: e.from, to: e.to, strength: e.strength })),
    expect: {
      statuses,
      unlockProbe: probe,
      unlocks: probe
        ? wouldUnlock(probe, g)
            .map((t) => t.id)
            .sort()
        : undefined,
      cycles: cycleProbes.map(([from, to]) => ({
        from,
        to,
        cyclic: wouldCreateCycle(from, to, g),
      })),
      topo: order ? order.map((t) => t.id) : null,
    },
  };
}

export function buildVectors(): Vectors {
  const graph: GraphCase[] = [
    graphCase(
      "no edges",
      "A topic with no prerequisites is available immediately.",
      [topic("a"), topic("b", "known")],
      [],
    ),
    graphCase(
      "hard edge gates",
      "`to` stays locked until every hard prerequisite is known.",
      [topic("a"), topic("b")],
      [edge("a", "b")],
      "a",
    ),
    graphCase(
      "hard edge satisfied",
      "Once the prerequisite is known the dependent becomes available.",
      [topic("a", "known"), topic("b")],
      [edge("a", "b")],
    ),
    graphCase(
      "soft edge never gates",
      "Soft edges inform ordering and must NOT lock anything. Treating one as " +
        "gating shows a topic locked on one device and open on another.",
      [topic("a"), topic("b")],
      [edge("a", "b", "soft")],
      "a",
    ),
    graphCase(
      "mixed prerequisites",
      "One unmet hard prerequisite is enough to lock, regardless of soft ones.",
      [topic("a", "known"), topic("b"), topic("c")],
      [edge("a", "c"), edge("b", "c"), edge("a", "b", "soft")],
      "b",
    ),
    graphCase(
      "diamond",
      "Completing the root unlocks only what becomes *newly* available — the " +
        "join node stays locked because its other branch is still unknown.",
      [topic("root"), topic("left"), topic("right"), topic("join")],
      [edge("root", "left"), edge("root", "right"), edge("left", "join"), edge("right", "join")],
      "root",
      [
        ["join", "root"],
        ["root", "join"],
      ],
    ),
    graphCase(
      "known topic is never available",
      "`known` outranks `available`; a finished topic is not offered again.",
      [topic("a", "known"), topic("b", "in_progress")],
      [],
    ),
    graphCase(
      "chain",
      "Ordering is transitive: the tail is locked until the whole chain is done.",
      [topic("a", "known"), topic("b"), topic("c"), topic("d")],
      [edge("a", "b"), edge("b", "c"), edge("c", "d")],
      "b",
      [["d", "a"]],
    ),
    graphCase(
      "dangling edge is ignored",
      "An edge pointing at a topic that isn't in the set must not gate anything " +
        "— sync can deliver an edge before the topic it references.",
      [topic("a")],
      [edge("ghost", "a")],
    ),
    graphCase(
      "cycle",
      "A cyclic graph has no teaching order; `topoOrder` returns null rather " +
        "than an arbitrary one.",
      [topic("a"), topic("b")],
      [edge("a", "b"), edge("b", "a")],
      undefined,
      [["a", "a"]],
    ),
  ];

  const order: OrderCase[] = [
    { name: "rev wins", rule: "Higher rev always wins, whatever the clocks say.", a: v(2, 1, "z"), b: v(1, 999, "a"), expect: 1 },
    { name: "updatedAt breaks equal rev", rule: "Same rev → newer updatedAt wins.", a: v(1, 5, "z"), b: v(1, 9, "a"), expect: -1 },
    {
      name: "deviceId breaks the tie",
      rule:
        "Same rev and same millisecond → lexicographic deviceId. Arbitrary, but " +
        "*stable*: both peers must pick the same side or they never converge.",
      a: v(1, 5, "aaa"),
      b: v(1, 5, "bbb"),
      expect: -1,
    },
    { name: "identical", rule: "Fully equal versions compare equal.", a: v(1, 5, "a"), b: v(1, 5, "a"), expect: 0 },
    {
      name: "missing fields are zero and empty",
      rule: "An absent updatedAt/deviceId must behave as 0 / \"\", not as undefined.",
      a: { id: "x", rev: 1 },
      b: v(1, 0, ""),
      expect: 0,
    },
    { name: "rev zero", rule: "rev 0 is a real revision, not a missing one.", a: v(0, 10, "b"), b: v(0, 10, "a"), expect: 1 },
  ];

  const tombstone: TombstoneCase[] = [
    {
      name: "delete beats an older edit",
      rule: "A tombstone newer than the record removes it.",
      record: v(1, 5, "a"),
      tomb: { id: "x", collection: "topics", rev: 2, deletedAt: 9, deviceId: "b" },
      expect: true,
    },
    {
      name: "edit beats an older delete",
      rule:
        "An edit made after a delete resurrects nothing — but a *newer* edit " +
        "must win, or a stale delete silently eats live work.",
      record: v(3, 20, "a"),
      tomb: { id: "x", collection: "topics", rev: 2, deletedAt: 9, deviceId: "b" },
      expect: false,
    },
    {
      name: "unknown record",
      rule: "A tombstone for something we've never seen still applies.",
      record: null,
      tomb: { id: "x", collection: "topics", rev: 1, deletedAt: 1, deviceId: "a" },
      expect: true,
    },
    {
      name: "same rev and time, deviceId decides",
      rule: "The tie-break is the same total order used everywhere else.",
      record: v(1, 5, "aaa"),
      tomb: { id: "x", collection: "topics", rev: 1, deletedAt: 5, deviceId: "bbb" },
      expect: true,
    },
  ];

  return { version: VECTOR_VERSION, graph, order, tombstone };
}

/** Re-run the reference implementation against a vector set. Used by both the
 *  self-check test here and, in spirit, by the Dart suite. */
export function checkOrderCase(c: OrderCase): -1 | 0 | 1 {
  return sign(compareVersions(c.a, c.b));
}

export function checkTombstoneCase(c: TombstoneCase): boolean {
  return tombstoneWins(c.record ?? undefined, c.tomb);
}

export function caseToGraph(c: GraphCase): Graph {
  return {
    topics: c.topics.map((t) => topic(t.id, t.progress)),
    edges: c.edges.map((e) => edge(e.from, e.to, e.strength)),
  };
}
