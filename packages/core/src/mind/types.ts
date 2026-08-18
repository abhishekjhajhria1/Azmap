/**
 * The Mind — where an AI plugs into ABH, and the rules it has to follow.
 *
 * ## Why this is an interface and not an API client
 *
 * ABH is local-first and end-to-end encrypted: the relay stores sealed blobs it
 * cannot read. An AI call is therefore the one thing in this product that can
 * take a user's map off their device, and that has to be a deliberate, per-
 * capability choice rather than a side effect of opening a screen. So the seam
 * is defined here, in core, with the constraints baked into the types:
 *
 *   1. **Everything is a proposal.** No capability returns a `Topic` or an
 *      `Edge`. They return *drafts* that only become map records through
 *      `MapStore.acceptProposal` / `acceptSuggestion`. This is the product's
 *      oldest rule — "AI proposes, you accept" — and making it a type-level
 *      guarantee is cheaper than trusting every future call site to honour it.
 *
 *   2. **Model output is untrusted input.** Every response type has a Zod
 *      schema and is parsed at the boundary, exactly like an HTTP body. A model
 *      that returns a 40,000-character `title`, an edge pointing at a node that
 *      doesn't exist, or a cycle is a normal Tuesday, not an exception.
 *
 *   3. **Every capability declares whether it leaves the device.** `local` is
 *      not documentation — the `Mind` facade refuses to call a non-local
 *      provider for a capability the user hasn't consented to.
 *
 *   4. **Failure is a shape, not an exception.** Each call has a defined empty
 *      result. An AI that is slow, rate-limited, offline or hallucinating must
 *      degrade to "no suggestion right now", never to a broken screen. A
 *      learning app whose map stops loading because a model timed out is worse
 *      than one with no AI at all.
 *
 * ## Why the capabilities are these five
 *
 * They're the five places a model beats a heuristic, and nothing else:
 *
 *   - `compose` — turn a subject nobody has mapped into a real ordered path.
 *   - `explain`  — say what a topic is, why it matters, what it opens up.
 *   - `distil`   — read something you saved and work out what it's *about*.
 *   - `connect`  — find the links between your own notes that you'd never spot.
 *   - `next`     — pick what to do now, out of everything you could do.
 *
 * `distil` and `connect` are the second brain. Capture is already solved: the
 * extension makes saving a page free. What makes a second brain worth having is
 * that the things in it find each other, and that's the job here.
 */

import { z } from "zod";
import type { Graph } from "../graph.js";
import type { Capture, Topic } from "../types.js";

/** The five things an AI can do for a map. */
export const MindCapability = z.enum(["compose", "explain", "distil", "connect", "next"]);
export type MindCapability = z.infer<typeof MindCapability>;

/** Every capability, in the order they're worth turning on. */
export const ALL_CAPABILITIES: readonly MindCapability[] = [
  "connect",
  "distil",
  "next",
  "explain",
  "compose",
] as const;

// ---------------------------------------------------------------------------
// Responses. All Zod, all parsed at the boundary.
// ---------------------------------------------------------------------------

/**
 * Bounds that exist to survive a model, not to express a preference.
 *
 * A title is a row in a list and a `why` is two lines under it, so anything
 * past these lengths is a formatting failure that would wreck the layout. We
 * clamp rather than reject: dropping an otherwise-good proposal because its
 * rationale ran long serves nobody.
 */
const Title = z
  .string()
  .trim()
  .min(1)
  .transform((s) => s.slice(0, 120));
const Prose = z
  .string()
  .trim()
  .transform((s) => s.slice(0, 400))
  .default("");

/** A topic an AI thinks should exist, phrased as a draft. */
export const DraftTopic = z.object({
  title: Title,
  /** One line: what this is. */
  summary: Prose,
  /** Why it's worth learning — ABH shows this on every step. */
  why: Prose,
  domain: z.string().trim().max(40).default("everyday"),
  /**
   * Titles (not ids) of prerequisites. Titles because a model has no idea what
   * this user's node ids are; resolving them against the real graph is the
   * caller's job and is where most hallucinated structure gets dropped.
   */
  needs: z.array(Title).max(12).default([]),
});
export type DraftTopic = z.infer<typeof DraftTopic>;

/** `compose`: a subject turned into an ordered path. */
export const ComposedPath = z.object({
  title: Title,
  subtitle: Prose,
  domain: z.string().trim().max(40).default("everyday"),
  /** Ordered. Index is the intended teaching sequence. */
  steps: z.array(DraftTopic).min(1).max(120),
  /**
   * What the model is unsure about, in the user's language. Shown before they
   * accept. A composed path is a guess about a subject, and saying so is the
   * difference between a tool and a confident liar.
   */
  caveat: Prose,
});
export type ComposedPath = z.infer<typeof ComposedPath>;

/** `explain`: what a topic is, for someone standing in front of it. */
export const TopicBrief = z.object({
  summary: Prose,
  why: Prose,
  /** Human-readable note of what finishing it opens up. */
  unlocks: Prose,
  /** Where to actually learn it. Unverified — the UI must label them as such. */
  sources: z
    .array(z.object({ title: Title, url: z.string().url() }))
    .max(8)
    .default([]),
});
export type TopicBrief = z.infer<typeof TopicBrief>;

/**
 * `connect` / `distil`: a link that ought to exist.
 *
 * One shape covers both because they are the same claim — "these two things
 * belong together" — differing only in what sits at each end.
 */
export const ProposedLink = z.object({
  kind: z.enum([
    /** A capture is about an existing topic. */
    "capture-topic",
    /** Two existing topics are related; `from` is the prerequisite. */
    "topic-topic",
    /** A capture is about something not on the map yet. */
    "capture-newtopic",
  ]),
  /** Existing record id, or "" when `kind` is `capture-newtopic`. */
  fromId: z.string().default(""),
  toId: z.string().default(""),
  /** Set only for `capture-newtopic`. */
  draft: DraftTopic.optional(),
  /**
   * Plain-language reason, shown verbatim. Not decoration: an unexplained
   * suggestion is one the user has to audit themselves, which costs more than
   * it saves. "Shares 'gradient', 'descent' with your note" is a reason. "AI
   * suggests this" is not.
   */
  why: Prose,
  /** 0–1. The UI sorts by it; it is not a probability and shouldn't be shown. */
  confidence: z.number().min(0).max(1).default(0.5),
});
export type ProposedLink = z.infer<typeof ProposedLink>;

/** `next`: one thing to do now, and the case for it. */
export const NextStep = z.object({
  topicId: z.string().min(1),
  why: Prose,
  /** Rough minutes. A hint for planning a session, never a countdown. */
  minutes: z.number().int().min(1).max(600).optional(),
  confidence: z.number().min(0).max(1).default(0.5),
});
export type NextStep = z.infer<typeof NextStep>;

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

export interface ComposeRequest {
  /** What the user typed. Free text — "quantum computing", "how do engines work". */
  subject: string;
  /** Optional shaping: "for a 16-year-old", "I already know linear algebra". */
  context?: string;
}

export interface ExplainRequest {
  topic: Pick<Topic, "id" | "title" | "summary" | "tags">;
  /** Neighbouring titles, so a brief can reference what's around it. */
  around?: string[];
}

export interface DistilRequest {
  capture: Capture;
  /** The map to match against. Distillation without it invents duplicates. */
  graph: Graph;
}

export interface ConnectRequest {
  graph: Graph;
  captures: Capture[];
  /** Cap on returned links, so a big map can't flood the UI. */
  limit?: number;
}

export interface NextRequest {
  graph: Graph;
  captures?: Capture[];
  /** Roadmap currently in focus, if any — focus should beat novelty. */
  activeRoadmapId?: string;
  /** Minutes the user says they have. Shapes the pick, doesn't filter it. */
  minutes?: number;
  limit?: number;
}

// ---------------------------------------------------------------------------
// The provider
// ---------------------------------------------------------------------------

/**
 * A source of intelligence about a map.
 *
 * Every method is optional: a provider advertises what it can do through
 * `capabilities`, and the `Mind` facade routes each call to the best provider
 * that claims it. That's what lets a model handle `compose` while the local
 * heuristics keep handling `connect` — which is usually the right split, since
 * `connect` runs constantly and `compose` runs once a month.
 *
 * Implementations must honour `signal` and should assume it will be aborted.
 */
export interface MindProvider {
  /** Stable id, e.g. "local", "anthropic". Shown in settings and logs. */
  readonly id: string;
  /** Human name for the settings screen. */
  readonly label: string;
  /**
   * True when this provider never sends map data off the device. Providers do
   * not get to be wrong about this — it is the flag consent is built on.
   */
  readonly local: boolean;
  readonly capabilities: readonly MindCapability[];

  compose?(req: ComposeRequest, signal: AbortSignal): Promise<ComposedPath>;
  explain?(req: ExplainRequest, signal: AbortSignal): Promise<TopicBrief>;
  distil?(req: DistilRequest, signal: AbortSignal): Promise<ProposedLink[]>;
  connect?(req: ConnectRequest, signal: AbortSignal): Promise<ProposedLink[]>;
  next?(req: NextRequest, signal: AbortSignal): Promise<NextStep[]>;
}

/**
 * What the user has agreed to send off-device, per capability.
 *
 * Deliberately not a single "AI: on/off" switch. The capabilities differ enormously
 * in what they expose: `compose` sends a subject name, while `connect` sends the
 * shape of everything you have ever saved. Someone can reasonably want the first
 * and not the second, and a product that makes them choose all-or-nothing is
 * making that choice for them.
 */
export const MindConsent = z.object({
  /** Capabilities allowed to use a non-local provider. */
  allow: z.array(MindCapability).default([]),
  /** Recorded so the UI can re-ask if the provider changes. */
  providerId: z.string().default(""),
  updatedAt: z.number().int().default(0),
});
export type MindConsent = z.infer<typeof MindConsent>;

export const EMPTY_CONSENT: MindConsent = { allow: [], providerId: "", updatedAt: 0 };
