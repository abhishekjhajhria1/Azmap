/**
 * Suggestions — "AI proposes, you accept", behind a swappable interface.
 *
 * A `SuggestionProvider` looks at the current graph (and the active roadmap) and
 * proposes topics at the frontier of what you know. The default is a
 * deterministic, hand-authored stand-in (roadmap branches whose prerequisites
 * you've cleared); a real AI provider implements the same interface later.
 *
 * Nothing here mutates the map — proposals only become nodes via
 * `MapStore.acceptSuggestion`, preserving the product's core trust rule.
 */

import type { Graph } from "../graph.js";
import { roadmapNodeId } from "../roadmaps/lens.js";
import type { RoadmapDef } from "../roadmaps/types.js";

export interface ProposedTopic {
  /** Namespaced global node id this proposal would create. */
  nodeId: string;
  title: string;
  why: string;
  domain: string;
  /** Global ids of prerequisites (already present + known). */
  needs: string[];
  roadmapId: string;
}

export interface SuggestionInput {
  graph: Graph;
  /** The roadmap currently in focus, if any. */
  roadmap?: RoadmapDef;
}

export interface SuggestionProvider {
  propose(input: SuggestionInput): ProposedTopic[];
}

/**
 * The default provider: offer a roadmap's branch topics once every prerequisite
 * is known — the moment a side-quest becomes genuinely reachable — and only if
 * it isn't already on the map.
 */
export class FrontierSuggestionProvider implements SuggestionProvider {
  propose({ graph, roadmap }: SuggestionInput): ProposedTopic[] {
    if (!roadmap) return [];
    const byId = new Map(graph.topics.map((t) => [t.id, t]));
    const isKnown = (id: string) => byId.get(id)?.progress === "known";

    const out: ProposedTopic[] = [];
    for (const b of roadmap.branches) {
      const nodeId = roadmapNodeId(roadmap.id, b.id);
      if (byId.has(nodeId)) continue; // already accepted onto the map
      const needs = (b.needs ?? []).map((n) => roadmapNodeId(roadmap.id, n));
      if (!needs.every(isKnown)) continue; // not reachable yet
      out.push({
        nodeId,
        title: b.title,
        why: b.why,
        domain: b.domain,
        needs,
        roadmapId: roadmap.id,
      });
    }
    return out;
  }
}
