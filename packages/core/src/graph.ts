/**
 * The unlock engine.
 *
 * Pure functions over `{ topics, edges }`. No storage, no I/O — this is the
 * part that has to be provably correct, so it's kept side-effect free and is
 * the most heavily tested module in the package.
 *
 * Core rule: a topic is `available` when every *hard* prerequisite edge into
 * it comes from a topic the user already knows. Soft edges inform ordering
 * but never gate.
 */

import type { Edge, MapStatus, Topic } from "./types.js";

export interface Graph {
  topics: Topic[];
  edges: Edge[];
}

/** Fast lookup structures derived once and reused across queries. */
export interface GraphIndex {
  byId: Map<string, Topic>;
  /** topicId -> prerequisite edges pointing *into* it. */
  incoming: Map<string, Edge[]>;
  /** topicId -> edges pointing *out* of it (things it unlocks). */
  outgoing: Map<string, Edge[]>;
}

export function indexGraph(graph: Graph): GraphIndex {
  const byId = new Map<string, Topic>();
  const incoming = new Map<string, Edge[]>();
  const outgoing = new Map<string, Edge[]>();

  for (const t of graph.topics) {
    byId.set(t.id, t);
    incoming.set(t.id, []);
    outgoing.set(t.id, []);
  }
  for (const e of graph.edges) {
    // Ignore dangling edges whose endpoints aren't in the topic set.
    if (!byId.has(e.from) || !byId.has(e.to)) continue;
    incoming.get(e.to)!.push(e);
    outgoing.get(e.from)!.push(e);
  }
  return { byId, incoming, outgoing };
}

function isKnown(t: Topic | undefined): boolean {
  return t?.progress === "known";
}

/**
 * Is this topic available to start? True when it is not yet known and every
 * hard prerequisite is known. Topics with no prerequisites are available.
 */
export function isAvailable(topicId: string, index: GraphIndex): boolean {
  const topic = index.byId.get(topicId);
  if (!topic || topic.progress === "known") return false;
  const prereqs = index.incoming.get(topicId) ?? [];
  for (const e of prereqs) {
    if (e.strength === "soft") continue;
    if (!isKnown(index.byId.get(e.from))) return false;
  }
  return true;
}

/** The display status shown on the map for a single topic. */
export function statusOf(topicId: string, index: GraphIndex): MapStatus {
  const topic = index.byId.get(topicId);
  if (!topic) return "locked";
  if (topic.progress === "known") return "known";
  if (topic.progress === "in_progress") return "in_progress";
  return isAvailable(topicId, index) ? "available" : "locked";
}

/** Compute the status of every topic in one pass. */
export function computeStatuses(graph: Graph): Map<string, MapStatus> {
  const index = indexGraph(graph);
  const out = new Map<string, MapStatus>();
  for (const t of graph.topics) out.set(t.id, statusOf(t.id, index));
  return out;
}

/**
 * Everything the learner can start right now. This is the question the whole
 * product is built to answer as a fact.
 */
export function availableNow(graph: Graph): Topic[] {
  const index = indexGraph(graph);
  return graph.topics.filter((t) => isAvailable(t.id, index));
}

/** The topics a given topic directly unlocks (its outgoing dependents). */
export function directlyUnlocks(topicId: string, index: GraphIndex): Topic[] {
  const edges = index.outgoing.get(topicId) ?? [];
  const out: Topic[] = [];
  for (const e of edges) {
    const dep = index.byId.get(e.to);
    if (dep) out.push(dep);
  }
  return out;
}

/**
 * If `topicId` were marked known, which currently-locked topics would become
 * available? This powers the "finishing one topic opens several others"
 * moment — computed *before* completing, so the UI can preview the payoff.
 */
export function wouldUnlock(topicId: string, graph: Graph): Topic[] {
  const index = indexGraph(graph);
  const target = index.byId.get(topicId);
  if (!target || target.progress === "known") return [];

  const newlyOpen: Topic[] = [];
  for (const dep of directlyUnlocks(topicId, index)) {
    if (dep.progress === "known") continue;
    if (isAvailable(dep.id, index)) continue; // already open, no change
    // Would every *other* hard prereq be satisfied if target were known?
    const prereqs = index.incoming.get(dep.id) ?? [];
    const satisfied = prereqs.every((e) => {
      if (e.strength === "soft") return true;
      if (e.from === topicId) return true; // the one we're pretending is known
      return isKnown(index.byId.get(e.from));
    });
    if (satisfied) newlyOpen.push(dep);
  }
  return newlyOpen;
}

/**
 * Would adding edge `from -> to` create a cycle? Prerequisite graphs must stay
 * acyclic, so callers should reject an edge when this returns true.
 */
export function wouldCreateCycle(
  from: string,
  to: string,
  graph: Graph,
): boolean {
  if (from === to) return true;
  const index = indexGraph(graph);
  // A cycle appears iff `to` can already reach `from` via outgoing edges.
  const stack = [to];
  const seen = new Set<string>();
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === from) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const e of index.outgoing.get(cur) ?? []) stack.push(e.to);
  }
  return false;
}

/**
 * A stable topological ordering of the topics (Kahn's algorithm). Returns
 * `null` if the graph contains a cycle. Useful for laying out a roadmap and
 * for "learn these in the right order" views.
 */
export function topoOrder(graph: Graph): Topic[] | null {
  const index = indexGraph(graph);
  const indegree = new Map<string, number>();
  for (const t of graph.topics) {
    indegree.set(t.id, (index.incoming.get(t.id) ?? []).length);
  }
  // Seed with zero-indegree topics, in their original order for stability.
  const queue = graph.topics.filter((t) => (indegree.get(t.id) ?? 0) === 0);
  const order: Topic[] = [];
  while (queue.length) {
    const t = queue.shift()!;
    order.push(t);
    for (const e of index.outgoing.get(t.id) ?? []) {
      const d = (indegree.get(e.to) ?? 0) - 1;
      indegree.set(e.to, d);
      if (d === 0) {
        const dep = index.byId.get(e.to);
        if (dep) queue.push(dep);
      }
    }
  }
  return order.length === graph.topics.length ? order : null;
}

/** Percentage of a topic set the learner has marked known (0–100, rounded). */
export function progressPercent(topics: Topic[]): number {
  if (topics.length === 0) return 0;
  const known = topics.filter((t) => t.progress === "known").length;
  return Math.round((known / topics.length) * 100);
}

/**
 * The topics that should be *visible* on an evolving map — the mechanism
 * behind "the mind map grows with you". You always see what you've touched
 * (known / in-progress), what you can start now (available), and a `lookahead`
 * of what those unlock next — but topics deep in the locked interior stay
 * hidden until you approach them.
 *
 * `roots` (topics with no prerequisites) are always shown so a fresh roadmap
 * isn't blank.
 */
export function revealedTopicIds(
  graph: Graph,
  opts: { lookahead?: number } = {},
): Set<string> {
  const lookahead = opts.lookahead ?? 1;
  const index = indexGraph(graph);
  const revealed = new Set<string>();

  // Frontier: everything already touched or open, plus prerequisite-free roots.
  const frontier: string[] = [];
  for (const t of graph.topics) {
    const touched =
      t.progress === "known" ||
      t.progress === "in_progress" ||
      isAvailable(t.id, index);
    const isRoot = (index.incoming.get(t.id) ?? []).length === 0;
    if (touched || isRoot) {
      revealed.add(t.id);
      frontier.push(t.id);
    }
  }

  // Grow outward `lookahead` hops so learners can see where they're heading.
  let layer = frontier;
  for (let hop = 0; hop < lookahead; hop++) {
    const next: string[] = [];
    for (const id of layer) {
      for (const e of index.outgoing.get(id) ?? []) {
        if (!revealed.has(e.to)) {
          revealed.add(e.to);
          next.push(e.to);
        }
      }
    }
    layer = next;
  }
  return revealed;
}
