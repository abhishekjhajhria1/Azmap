/**
 * LocalMind — the second brain, working before any AI exists.
 *
 * ## The point of shipping this
 *
 * "Leave space for AI" usually produces a disabled button and a *Soon* badge.
 * That's a promise, and a promise doesn't make anyone's notes more useful. Three
 * of the five capabilities turn out not to need a model at all — they need the
 * graph you already have and a decent notion of what a word is worth — so they
 * ship now, offline, free, and private by construction.
 *
 * What it does, and why each one earns its place:
 *
 *   - **connect** — the thing that makes a second brain a brain. You save
 *     forty pages from the extension and they sit in a list nobody reads. This
 *     finds the ones that are about something already on your map, and the
 *     topics that are floating unattached, and proposes the wiring.
 *
 *   - **distil** — one capture, answered properly: is this about something I
 *     already have, or is it new? Getting that right is what stops a second
 *     brain filling up with four nodes for the same idea.
 *
 *   - **next** — of everything open to you, what should you actually do? Ranked
 *     by leverage (how much it unlocks), focus (your active roadmap) and
 *     interest (what you've been saving lately).
 *
 * `compose` and `explain` are genuinely absent, not stubbed. Writing a real
 * ordered path through a subject nobody has mapped is what a model is *for*,
 * and a heuristic pretending to do it would produce plausible garbage — which
 * in a learning app means someone studies the wrong things in the wrong order.
 * Better to advertise the gap and let the facade report it honestly.
 *
 * Everything here is a proposal. Nothing in this file writes to a map.
 */

import { indexGraph, wouldCreateCycle, type Graph } from "../graph.js";
import type { Capture, Topic } from "../types.js";
import { TermWeights, cleanTitle, sharedTermsPhrase } from "./terms.js";
import type {
  ConnectRequest,
  DistilRequest,
  MindCapability,
  MindProvider,
  NextRequest,
  NextStep,
  ProposedLink,
} from "./types.js";

/**
 * Thresholds, and what each one is actually protecting against.
 *
 * These are the difference between a feature and a nuisance. A second brain
 * that proposes forty weak links every time you open it trains you to dismiss
 * the panel without reading it, and after that it can never tell you anything
 * again. Under-proposing is recoverable; being ignored is not.
 */
const LINK_FLOOR = 0.14; // below this, shared words are coincidence
const STRONG = 0.3; // above this, confident enough to lead with
const DEFAULT_LIMIT = 8;

export class LocalMind implements MindProvider {
  readonly id = "local";
  readonly label = "On this device";
  readonly local = true;
  readonly capabilities: readonly MindCapability[] = ["connect", "distil", "next"];

  // -------------------------------------------------------------------------
  // connect
  // -------------------------------------------------------------------------

  /**
   * Two passes, in order of how much they're worth:
   *
   *   1. Captures that are about a topic already on the map but aren't linked.
   *      Highest value — this is the pile that grows every day and never gets
   *      filed, and the user has already told us they cared by saving it.
   *   2. Topics with no edges at all, matched to their nearest relative.
   *      An orphan node is invisible to the unlock engine: nothing gates it and
   *      it gates nothing, so it never appears as "available next" and quietly
   *      falls out of the product.
   */
  async connect({ graph, captures, limit = DEFAULT_LIMIT }: ConnectRequest): Promise<ProposedLink[]> {
    const weights = corpusWeights(graph, captures);
    const out: ProposedLink[] = [];

    for (const c of captures) {
      const text = captureText(c);
      if (!text) continue;
      const best = bestTopic(text, graph.topics, weights, (t) => !c.linkedTopicIds.includes(t.id));
      if (!best || best.score < LINK_FLOOR) continue;
      out.push({
        kind: "capture-topic",
        fromId: c.id,
        toId: best.topic.id,
        why: `Your note shares ${sharedTermsPhrase(best.shared)} with ${best.topic.title}.`,
        confidence: clamp(best.score),
      });
    }

    const index = indexGraph(graph);
    // Keyed by unordered pair. When two orphans are each other's best match the
    // loop reaches the pair twice, and the naive version pushed two proposals
    // that disagreed about which one was the prerequisite — a panel offering
    // both A→B and B→A, one of which is definitely wrong.
    const pairs = new Map<string, { a: Topic; b: Topic; score: number; shared: string[] }>();

    for (const t of graph.topics) {
      const attached =
        (index.incoming.get(t.id)?.length ?? 0) + (index.outgoing.get(t.id)?.length ?? 0);
      if (attached > 0) continue;

      const best = bestTopic(topicText(t), graph.topics, weights, (o) => o.id !== t.id);
      if (!best || best.score < LINK_FLOOR) continue;

      const key = [t.id, best.topic.id].sort().join("~");
      const existing = pairs.get(key);
      if (!existing || best.score > existing.score) {
        pairs.set(key, { a: t, b: best.topic, score: best.score, shared: best.shared });
      }
    }

    for (const { a, b, score, shared } of pairs.values()) {
      // Direction, decided once and symmetrically: what you already know is the
      // prerequisite. When that doesn't separate them, the older node wins —
      // people add the foundation before the thing built on it.
      const [from, to] = orderPrerequisite(a, b);

      // An orphan can't close a cycle today, but the check is cheap and this is
      // the only place in the file that proposes a prerequisite edge — the one
      // proposal that could corrupt the unlock engine if it were ever wrong.
      if (wouldCreateCycle(from.id, to.id, graph)) continue;

      out.push({
        kind: "topic-topic",
        fromId: from.id,
        toId: to.id,
        why: `${to.title} is on your map but connected to nothing. It shares ${sharedTermsPhrase(shared)} with ${from.title}.`,
        confidence: clamp(score * 0.9), // structural guess, so slightly hedged
      });
    }

    return out.sort((a, b) => b.confidence - a.confidence).slice(0, limit);
  }

  // -------------------------------------------------------------------------
  // distil
  // -------------------------------------------------------------------------

  /**
   * One capture, filed. Returns the matching topics if there are any, and
   * otherwise proposes a new one built from the cleaned title.
   *
   * The either/or matters: proposing a new node *and* a link to an existing one
   * is how a map ends up with "Backpropagation" and "Backprop" as separate
   * nodes with separate prerequisites, and nothing in the product ever merges
   * them again.
   */
  async distil({ capture, graph }: DistilRequest): Promise<ProposedLink[]> {
    const text = captureText(capture);
    if (!text) return [];

    const weights = corpusWeights(graph, [capture]);
    const matches = graph.topics
      .filter((t) => !capture.linkedTopicIds.includes(t.id))
      .map((t) => ({ topic: t, ...weights.similarity(text, topicText(t)) }))
      .filter((m) => m.score >= LINK_FLOOR)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    if (matches.length > 0) {
      return matches.map((m) => ({
        kind: "capture-topic" as const,
        fromId: capture.id,
        toId: m.topic.id,
        draft: undefined,
        why: `Shares ${sharedTermsPhrase(m.shared)} with ${m.topic.title}.`,
        confidence: clamp(m.score),
      }));
    }

    const title = cleanTitle(capture.title || firstSentence(capture.text));
    if (!title) return [];
    return [
      {
        kind: "capture-newtopic",
        fromId: capture.id,
        toId: "",
        draft: {
          title,
          summary: firstSentence(capture.text).slice(0, 200),
          why: "",
          domain: "everyday",
          needs: [],
        },
        why: "Nothing on your map covers this yet.",
        confidence: 0.35,
      },
    ];
  }

  // -------------------------------------------------------------------------
  // next
  // -------------------------------------------------------------------------

  /**
   * What to do now.
   *
   * Three signals, in the order a person would weigh them:
   *
   *   - **Leverage** — how many topics this unlocks. The whole premise of a
   *     prerequisite graph is that some nodes are worth far more than others,
   *     and a flat "available now" list throws that information away.
   *   - **Focus** — if you're on a roadmap, staying on it beats wandering.
   *     Roadmaps are how anyone finishes anything.
   *   - **Interest** — what you've been saving lately. Curiosity is fuel and
   *     the captures are the only honest record of it.
   *
   * Deliberately not weighted by difficulty or estimated time. Both would be
   * guesses dressed as measurements, and the second one is why `minutes` is
   * left `undefined` here rather than filled with a plausible number.
   */
  async next({
    graph,
    captures = [],
    activeRoadmapId,
    limit = 3,
  }: NextRequest): Promise<NextStep[]> {
    const index = indexGraph(graph);
    const available = graph.topics.filter((t) => {
      if (t.progress === "known") return false;
      const prereqs = index.incoming.get(t.id) ?? [];
      return prereqs.every(
        (e) => e.strength === "soft" || index.byId.get(e.from)?.progress === "known",
      );
    });
    if (available.length === 0) return [];

    const weights = corpusWeights(graph, captures);
    const recent = captures
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 12)
      .map(captureText)
      .filter(Boolean)
      .join(" ");

    const scored = available.map((t) => {
      const unlocks = countUnlocked(t.id, index);
      // Diminishing returns: the gap between unlocking 1 and 3 things is real,
      // the gap between 12 and 15 is noise.
      const leverage = Math.log1p(unlocks) / Math.log1p(8);
      const focus = activeRoadmapId && t.tags.includes(activeRoadmapId) ? 1 : 0;
      const inProgress = t.progress === "in_progress" ? 1 : 0;
      const interest = recent ? weights.similarity(recent, topicText(t)).score : 0;

      const score =
        0.4 * Math.min(1, leverage) + 0.25 * focus + 0.2 * inProgress + 0.15 * Math.min(1, interest * 3);

      return { topic: t, score, unlocks, focus, inProgress, interest };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => ({
        topicId: s.topic.id,
        why: nextReason(s),
        confidence: clamp(s.score),
      }));
  }
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** The user's whole corpus, so IDF is computed against what *they* write. */
function corpusWeights(graph: Graph, captures: Capture[]): TermWeights {
  return new TermWeights([...graph.topics.map(topicText), ...captures.map(captureText)]);
}

/**
 * Which of two topics is the prerequisite. Symmetric by construction — swapping
 * the arguments returns the same pair — which is what stops the caller from
 * proposing A→B and B→A for the same two nodes.
 */
function orderPrerequisite(a: Topic, b: Topic): [Topic, Topic] {
  const aKnown = a.progress === "known";
  const bKnown = b.progress === "known";
  if (aKnown !== bKnown) return aKnown ? [a, b] : [b, a];
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? [a, b] : [b, a];
  return a.id < b.id ? [a, b] : [b, a]; // last resort: stable, so output is deterministic
}

function topicText(t: Topic): string {
  return `${t.title} ${t.summary} ${t.tags.join(" ")}`.trim();
}

/**
 * Body text is truncated to 600 characters on purpose. A full article makes
 * every capture look similar to every topic — enough words and something always
 * matches — so the title and opening, which are what the piece is *about*, get
 * to dominate.
 */
function captureText(c: Capture): string {
  return `${cleanTitle(c.title)} ${c.text.slice(0, 600)}`.trim();
}

function firstSentence(text: string): string {
  const t = text.trim();
  if (!t) return "";
  const m = t.match(/^.{10,180}?[.!?](\s|$)/s);
  return (m ? m[0] : t.slice(0, 180)).trim();
}

function bestTopic(
  text: string,
  topics: Topic[],
  weights: TermWeights,
  keep: (t: Topic) => boolean,
): { topic: Topic; score: number; shared: string[] } | null {
  let best: { topic: Topic; score: number; shared: string[] } | null = null;
  for (const t of topics) {
    if (!keep(t)) continue;
    const { score, shared } = weights.similarity(text, topicText(t));
    if (!best || score > best.score) best = { topic: t, score, shared };
  }
  return best;
}

/** Everything downstream of a topic, not just its direct children. */
function countUnlocked(id: string, index: ReturnType<typeof indexGraph>): number {
  const seen = new Set<string>([id]);
  const queue = [id];
  while (queue.length) {
    for (const e of index.outgoing.get(queue.pop()!) ?? []) {
      if (seen.has(e.to)) continue;
      seen.add(e.to);
      queue.push(e.to);
    }
  }
  return seen.size - 1;
}

/** One sentence, the strongest true reason. Never a list of scores. */
function nextReason(s: {
  unlocks: number;
  focus: number;
  inProgress: number;
  interest: number;
}): string {
  if (s.inProgress) return "You already started this one.";
  if (s.unlocks >= 3) return `Opens up ${s.unlocks} more topics on your map.`;
  if (s.focus) return "The next step on the roadmap you're following.";
  if (s.interest > 0.1) return "Close to what you've been reading lately.";
  if (s.unlocks > 0) return `Unlocks ${s.unlocks === 1 ? "another topic" : `${s.unlocks} topics`}.`;
  return "Open to you now — nothing is blocking it.";
}

function clamp(n: number): number {
  return Math.max(0, Math.min(1, n < STRONG ? n * 2 : 0.6 + n * 0.4));
}
