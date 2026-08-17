import type { Edge, MapStatus, ProposedTopic, Topic } from "@abh/core";
import type { GraphLink, GraphNode, NodeTone } from "@abh/ui";

/**
 * Turn store state into GraphView data.
 *
 * Nodes are coloured by **status**, not domain. The map's job is to answer one
 * question — *what can I learn next?* — and colouring by subject answered a
 * different one while making known and available look identical. Now green is
 * known, blue is open to you now, neutral is locked, violet is an AI proposal;
 * size comes from how connected a topic is. Domain still lives on the node as a
 * tag and in the inspector, where it's useful without competing.
 *
 * Pending proposals ride along as ghost nodes with their prerequisite links, so
 * the AI's suggestions sit right on the graph rather than in a side list.
 */
export function buildGraphData(
  topics: Topic[],
  edges: Edge[],
  statuses: Map<string, MapStatus>,
  proposals: ProposedTopic[],
): { nodes: GraphNode[]; links: GraphLink[] } {
  const degree = new Map<string, number>();
  for (const e of edges) {
    degree.set(e.from, (degree.get(e.from) ?? 0) + 1);
    degree.set(e.to, (degree.get(e.to) ?? 0) + 1);
  }

  const nodes: GraphNode[] = topics.map((t) => {
    const status = statuses.get(t.id) ?? "locked";
    return {
      id: t.id,
      label: t.title,
      // A tone, not a colour: GraphView resolves it from live tokens, so a
      // theme flip repaints without rebuilding the graph.
      tone: toTone(status),
      locked: status === "locked",
      weight: degree.get(t.id) ?? 0,
    };
  });

  const present = new Set(topics.map((t) => t.id));
  const links: GraphLink[] = edges
    .filter((e) => present.has(e.from) && present.has(e.to))
    .map((e) => ({ source: e.from, target: e.to, soft: e.strength === "soft" }));

  for (const p of proposals) {
    // Ghosts are painted with the AI tone inside GraphView.
    nodes.push({ id: p.nodeId, label: p.title, ghost: true });
    for (const from of p.needs) {
      if (present.has(from)) links.push({ source: from, target: p.nodeId, soft: true });
    }
  }
  return { nodes, links };
}

/** `in_progress` reads as "open to you now" on the map — same tone. */
function toTone(status: MapStatus): NodeTone {
  return status === "known" ? "known" : status === "locked" ? "locked" : "available";
}
