/**
 * The roadmap *model*. Content lives in `defs/`; these shapes are the contract
 * every surface shares.
 *
 * A roadmap's topics are real nodes in the one knowledge graph (the second-brain
 * superset). When a roadmap is started, each seed becomes a `Topic` under a
 * namespaced id, so the mind map contains everything while the roadmap runner
 * shows only its slice.
 */

import type { Progress } from "../types.js";

export interface TopicSeed {
  /** Semantic id, unique within the roadmap (e.g. "html"). Namespaced on start. */
  id: string;
  title: string;
  why: string;
  /** Domain label for grouping (e.g. "js", "physics"). */
  domain: string;
  /** Prerequisite seed ids within the same roadmap. */
  needs?: string[];
  /**
   * Which unit this belongs to. Optional, but a syllabus of two hundred topics
   * is unreadable without it — see `RoadmapDef.units`.
   */
  unit?: string;
  /**
   * Rough share of the exam this carries, 1–5. Only meaningful on exam
   * roadmaps, where "what's actually worth marks" is the question students are
   * really asking. Deliberately coarse: precise per-topic mark counts vary by
   * year and pretending otherwise would be false precision.
   */
  weight?: number;
  /** Seed a couple as already known so demos start mid-journey. */
  progress?: Progress;
}

/**
 * A section of a long roadmap — a subject, a phase, a class year. Purely
 * presentational: prerequisites still come from `needs`, so a unit never
 * implies an ordering the graph doesn't already know about.
 */
export interface RoadmapUnit {
  id: string;
  title: string;
  /** One line on what this unit is for. Shown under the section heading. */
  note?: string;
}

/**
 * What kind of thing this is. A syllabus and a career path want different
 * framing — "9 to go" is right for one and slightly absurd for the other — so
 * the surfaces branch on this rather than guessing from the topic count.
 */
export type RoadmapKind = "skill" | "exam";

export interface RoadmapDef {
  id: string;
  title: string;
  goal: string;
  blurb: string;
  kind?: RoadmapKind;
  /**
   * Optional grouping for the path. When present, surfaces render the path
   * unit by unit in this order; seeds with no unit fall at the end.
   */
  units?: RoadmapUnit[];
  /** The core prerequisite path you follow. */
  path: TopicSeed[];
  /** Side-quests the suggestion engine offers at the frontier. */
  branches: TopicSeed[];
  /** Id of a `Guide` giving the strategy around this roadmap, if one exists. */
  guideId?: string;
}
