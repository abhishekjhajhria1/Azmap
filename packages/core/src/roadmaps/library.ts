/**
 * The roadmap library — the registry, not the content.
 *
 * Content lives one file per subject area under `defs/`, because a single file
 * holding a career path and two national exam syllabi is a file nobody can
 * review. Everything here is data: "Generate with AI" will produce more of the
 * same shape at runtime, and the shape won't change.
 *
 * Order matters — it's the order the picker shows. Skills first (the common
 * case), exams after, and within each the ones most people want at the top.
 */

import type { RoadmapDef } from "./types.js";
import { backend, devops, frontend, systemDesign } from "./defs/web.js";
import { guitar, ml, python, sql } from "./defs/data.js";
import { neet } from "./defs/neet.js";
import { jee } from "./defs/jee.js";

export const ROADMAPS: RoadmapDef[] = [
  frontend,
  backend,
  python,
  sql,
  ml,
  devops,
  systemDesign,
  neet,
  jee,
  guitar,
];

export function getRoadmap(id: string): RoadmapDef | undefined {
  return ROADMAPS.find((r) => r.id === id);
}

/** Roadmaps split by kind, for surfaces that group them. */
export function roadmapsByKind(): { skills: RoadmapDef[]; exams: RoadmapDef[] } {
  return {
    skills: ROADMAPS.filter((r) => r.kind !== "exam"),
    exams: ROADMAPS.filter((r) => r.kind === "exam"),
  };
}
