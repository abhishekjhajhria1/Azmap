/**
 * ABH domain model.
 *
 * The whole product is one idea: everything you learn lives on a single
 * directed graph — the *map*. A roadmap is a named slice of that map. The
 * social layer (guardians, friends) reads progress off the same graph.
 *
 * Design rules encoded here:
 *  - Prerequisites are directed edges: `from` must be *known* before `to`
 *    becomes available. This is what lets the app answer "what can I start
 *    right now?" as a fact rather than a guess.
 *  - Nothing the AI proposes is a Topic. Proposals live as `Suggestion`s
 *    until the user accepts one — only then does it join the map.
 *  - Everything is local-first. Records carry `createdAt`/`updatedAt` and a
 *    monotonic `rev` so an optional sync layer can merge later without a
 *    rewrite.
 */

import { z } from "zod";

/** How a topic came to be on the map. Drives provenance + trust in the UI. */
export const TopicOrigin = z.enum([
  "curated", // hand-authored roadmap content (vetted)
  "ai", // proposed by AI and accepted by the user
  "import", // pulled in from an imported roadmap
  "capture", // created from a captured page/clip/screenshot
  "user", // the user typed it themselves
]);
export type TopicOrigin = z.infer<typeof TopicOrigin>;

/** The user's own progress on a topic. Availability is *derived*, not stored. */
export const Progress = z.enum(["not_started", "in_progress", "known"]);
export type Progress = z.infer<typeof Progress>;

/**
 * A derived, display-facing status for a node on the map.
 * - `known`      the user has completed it
 * - `in_progress`the user is actively studying it
 * - `available`  every prerequisite is known — open to you now
 * - `locked`     at least one prerequisite is unmet
 */
export const MapStatus = z.enum(["known", "in_progress", "available", "locked"]);
export type MapStatus = z.infer<typeof MapStatus>;

/** A vetted place to actually learn the thing (the "288 vetted sources"). */
export const Source = z.object({
  id: z.string(),
  title: z.string().min(1),
  url: z.string().url().optional(),
  kind: z
    .enum(["article", "video", "book", "course", "docs", "paper", "other"])
    .default("other"),
  /** Rough minutes to consume, if known — powers "next thing to learn". */
  estimatedMinutes: z.number().int().positive().optional(),
});
export type Source = z.infer<typeof Source>;

/** A node on the map. The atomic unit of "a thing you can learn". */
export const Topic = z.object({
  id: z.string(),
  title: z.string().min(1),
  /** One-line summary of what this topic is. */
  summary: z.string().default(""),
  /** Why it matters — shown on every step, per the product spec. */
  whyItMatters: z.string().default(""),
  /** Human-readable note of what finishing this unlocks (edges are the truth). */
  unlocks: z.string().default(""),
  progress: Progress.default("not_started"),
  origin: TopicOrigin.default("user"),
  sources: z.array(Source).default([]),
  /** Free-form tags / domain labels, e.g. ["math", "jee"]. */
  tags: z.array(z.string()).default([]),
  /** Optional saved layout position so the graph doesn't reshuffle. */
  position: z.object({ x: z.number(), y: z.number() }).optional(),
  completedAt: z.number().int().optional(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  /** Monotonic revision counter; see sync/merge.ts for the ordering rule. */
  rev: z.number().int().nonnegative().default(0),
  /** Which device last wrote this — the deterministic merge tiebreak. */
  deviceId: z.string().default(""),
});
export type Topic = z.infer<typeof Topic>;

/**
 * A directed prerequisite edge. `from` unlocks `to`:
 * `to` cannot become `available` until `from` is `known`.
 */
export const Edge = z.object({
  id: z.string(),
  from: z.string(), // prerequisite topic id
  to: z.string(), // dependent topic id
  /** How strongly `from` blocks `to`. Soft edges inform, hard edges gate. */
  strength: z.enum(["hard", "soft"]).default("hard"),
  origin: TopicOrigin.default("user"),
  createdAt: z.number().int(),
  updatedAt: z.number().int().default(0),
  rev: z.number().int().nonnegative().default(0),
  deviceId: z.string().default(""),
});
export type Edge = z.infer<typeof Edge>;

/** A named path through the map — a roadmap for one subject. */
export const Roadmap = z.object({
  id: z.string(),
  title: z.string().min(1),
  domain: z.string().default(""),
  description: z.string().default(""),
  language: z.string().default("en"),
  country: z.string().optional(),
  /** Topics that belong to this roadmap (a topic may appear in several). */
  topicIds: z.array(z.string()).default([]),
  curated: z.boolean().default(false),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  rev: z.number().int().nonnegative().default(0),
  deviceId: z.string().default(""),
});
export type Roadmap = z.infer<typeof Roadmap>;

/**
 * Something the AI (or an import) *proposes*. It is deliberately NOT a Topic
 * or Edge until the user taps accept. This is the product's core trust rule.
 */
export const Suggestion = z.object({
  id: z.string(),
  kind: z.enum(["topic", "edge"]),
  /** Draft payload — shape depends on `kind`. Validated on accept. */
  payload: z.record(z.unknown()),
  /** Why the AI thinks this belongs, shown to the user before they accept. */
  rationale: z.string().default(""),
  status: z.enum(["pending", "accepted", "rejected"]).default("pending"),
  createdAt: z.number().int(),
  updatedAt: z.number().int().default(0),
  rev: z.number().int().nonnegative().default(0),
  deviceId: z.string().default(""),
});
export type Suggestion = z.infer<typeof Suggestion>;

/** A person who can see / shape a learner's map: friend, senior, parent. */
export const Guardian = z.object({
  id: z.string(),
  name: z.string().min(1),
  relationship: z
    .enum(["friend", "parent", "mentor", "teacher", "peer", "other"])
    .default("friend"),
  /** What they're allowed to do — the app asks for a guardian before much else. */
  canShapePlan: z.boolean().default(false),
  canSignOff: z.boolean().default(true),
  notifyOnSlip: z.boolean().default(true),
  createdAt: z.number().int(),
  updatedAt: z.number().int().default(0),
  rev: z.number().int().nonnegative().default(0),
  deviceId: z.string().default(""),
});
export type Guardian = z.infer<typeof Guardian>;

/**
 * A raw thing the user read/saved/screenshotted — the "second brain" capture.
 * It is caught first and connected to the map second (possibly by AI proposal).
 */
export const Capture = z.object({
  id: z.string(),
  kind: z.enum(["page", "selection", "clipboard", "screenshot", "note"]),
  title: z.string().default(""),
  url: z.string().url().optional(),
  text: z.string().default(""),
  /** Topic ids this capture has been linked to, once connected. */
  linkedTopicIds: z.array(z.string()).default([]),
  createdAt: z.number().int(),
  updatedAt: z.number().int().default(0),
  rev: z.number().int().nonnegative().default(0),
  deviceId: z.string().default(""),
});
export type Capture = z.infer<typeof Capture>;

/**
 * The local user. A single on-device record — no login, no server. Holds who
 * you are, which roadmap you're currently focused on, and onboarding state.
 * Designed to grow into an account (add an optional remote id) when sync lands.
 */
export const Profile = z.object({
  id: z.string(),
  name: z.string().default(""),
  /** The roadmap currently open in the focused runner, if any. */
  activeRoadmapId: z.string().nullable().default(null),
  onboardedAt: z.number().int().nullable().default(null),
  /** Consecutive days with real learning activity. */
  streakDays: z.number().int().nonnegative().default(0),
  bestStreak: z.number().int().nonnegative().default(0),
  /** Local day key ("YYYY-MM-DD") of the last activity, or null. */
  lastActiveDay: z.string().nullable().default(null),
  /**
   * Grace days that auto-repair a single missed day. Forgiving by design — a
   * streak you can never recover causes abandonment, not motivation.
   */
  streakFreezes: z.number().int().nonnegative().default(2),
  /**
   * Where the floating nav dock sits. "auto" resolves per device — bottom on
   * phones (thumb reach), top on larger screens.
   */
  dockPosition: z.enum(["auto", "top", "bottom"]).default("auto"),
  /**
   * Which navigation the app wears on screens big enough to choose. A rail
   * gives a working document room to breathe and keeps context (active
   * roadmap, recent captures) permanently in view; the dock keeps the canvas
   * whole. Phones and folds always get the dock regardless — a rail on a
   * 390px screen is just a wall.
   */
  navLayout: z.enum(["sidebar", "dock"]).default("sidebar"),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  rev: z.number().int().nonnegative().default(0),
});
export type Profile = z.infer<typeof Profile>;

/** Which collection a record lives in — used by tombstones and deltas. */
export const Collection = z.enum([
  "topics",
  "edges",
  "roadmaps",
  "suggestions",
  "guardians",
  "captures",
]);
export type Collection = z.infer<typeof Collection>;

/**
 * A record of a deletion.
 *
 * Without these, a delete is invisible to a peer: merging a snapshot that still
 * contains the record silently resurrects it. A tombstone makes "this was
 * deleted" a fact that can be merged and ordered like any other write.
 */
export const Tombstone = z.object({
  id: z.string(),
  collection: Collection,
  deletedAt: z.number().int(),
  rev: z.number().int().nonnegative().default(0),
  deviceId: z.string().default(""),
});
export type Tombstone = z.infer<typeof Tombstone>;

/** The entire on-device dataset — the unit an export/import/sync moves. */
export const MapSnapshot = z.object({
  /** 2 added tombstones + rev/updatedAt/deviceId on every record. */
  version: z.literal(2),
  topics: z.array(Topic),
  edges: z.array(Edge),
  roadmaps: z.array(Roadmap),
  suggestions: z.array(Suggestion),
  guardians: z.array(Guardian),
  captures: z.array(Capture),
  /** Deletions, applied after upserts so a delete always beats a stale copy. */
  deletions: z.array(Tombstone).default([]),
  profile: Profile.nullable().default(null),
  exportedAt: z.number().int(),
});
export type MapSnapshot = z.infer<typeof MapSnapshot>;
