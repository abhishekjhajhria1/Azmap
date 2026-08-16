/**
 * Roadmap lens helpers — turning the one shared graph into a roadmap's slice.
 *
 * Roadmap topics live in the global graph under namespaced ids so a roadmap is
 * a *view*, not a separate store. These helpers translate between a roadmap's
 * seed ids and the global node ids, and extract its subgraph.
 */

import * as graph from "../graph.js";
import type { RoadmapDef, TopicSeed } from "./types.js";

/** Global node id for a roadmap seed. Keeps roadmaps from colliding in one graph. */
export function roadmapNodeId(roadmapId: string, seedId: string): string {
  return `${roadmapId}__${seedId}`;
}

/** Every global node id a roadmap def introduces (path + branches). */
export function roadmapSeedIds(def: RoadmapDef): string[] {
  return [...def.path, ...def.branches].map((s) => roadmapNodeId(def.id, s.id));
}

/** The subgraph belonging to a roadmap, given the full graph and its topic ids. */
export function roadmapSubgraph(g: graph.Graph, topicIds: string[]): graph.Graph {
  const set = new Set(topicIds);
  const topics = g.topics.filter((t) => set.has(t.id));
  const edges = g.edges.filter((e) => set.has(e.from) && set.has(e.to));
  return { topics, edges };
}

/** Prerequisite edges implied by a seed's `needs`, as global id pairs. */
export function seedEdgePairs(
  roadmapId: string,
  seeds: TopicSeed[],
): { from: string; to: string }[] {
  const pairs: { from: string; to: string }[] = [];
  for (const s of seeds) {
    for (const need of s.needs ?? []) {
      pairs.push({
        from: roadmapNodeId(roadmapId, need),
        to: roadmapNodeId(roadmapId, s.id),
      });
    }
  }
  return pairs;
}
