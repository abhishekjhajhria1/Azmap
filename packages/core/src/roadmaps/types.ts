/**
 * The roadmap *model*. Content (specific roadmaps) is data fed in later; these
 * shapes are the contract every surface shares.
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
  /** Domain label for colour/grouping (e.g. "js", "math"). */
  domain: string;
  /** Prerequisite seed ids within the same roadmap. */
  needs?: string[];
  /** Seed a couple as already known so demos start mid-journey. */
  progress?: Progress;
}

export interface RoadmapDef {
  id: string;
  title: string;
  goal: string;
  blurb: string;
  /** The core prerequisite path you follow. */
  path: TopicSeed[];
  /** Side-quests the suggestion engine offers at the frontier. */
  branches: TopicSeed[];
}
