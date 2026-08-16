import type { Edge, MapStatus, ProposedTopic, Topic } from "@abh/core";
import { domainColor, type GraphLink, type GraphNode } from "@abh/ui";

/**
 * Turn store state into GraphView data. Nodes are coloured by domain; locked
 * nodes are muted; pending proposals ride along as ghost nodes with their
 * prerequisite links, so the AI's suggestions sit right on the graph.
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
    const base = domainColor(t.tags[0]);
    return {
      id: t.id,
      label: t.title,
      color: status === "locked" ? "#1b3a2b" : base,
      weight: degree.get(t.id) ?? 0,
    };
  });

  const present = new Set(topics.map((t) => t.id));
  const links: GraphLink[] = edges
    .filter((e) => present.has(e.from) && present.has(e.to))
    .map((e) => ({ source: e.from, target: e.to, soft: e.strength === "soft" }));

  for (const p of proposals) {
    nodes.push({ id: p.nodeId, label: p.title, color: "#c77dff", ghost: true });
    for (const from of p.needs) {
      if (present.has(from)) links.push({ source: from, target: p.nodeId, soft: true });
    }
  }
  return { nodes, links };
}
