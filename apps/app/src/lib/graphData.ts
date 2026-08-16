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

  // The graph renders on WebGL, so colours must be concrete (no CSS vars). The
  // neutral "locked" tone is resolved from tokens inside GraphView; here we just
  // pass the domain accent + a `locked` flag.
  const concrete = (domain: string | undefined) => {
    const c = domainColor(domain);
    return c.startsWith("var(") ? "#8a9298" : c;
  };

  const nodes: GraphNode[] = topics.map((t) => ({
    id: t.id,
    label: t.title,
    color: concrete(t.tags[0]),
    locked: (statuses.get(t.id) ?? "locked") === "locked",
    weight: degree.get(t.id) ?? 0,
  }));

  const present = new Set(topics.map((t) => t.id));
  const links: GraphLink[] = edges
    .filter((e) => present.has(e.from) && present.has(e.to))
    .map((e) => ({ source: e.from, target: e.to, soft: e.strength === "soft" }));

  for (const p of proposals) {
    nodes.push({ id: p.nodeId, label: p.title, color: concrete(p.domain), ghost: true });
    for (const from of p.needs) {
      if (present.has(from)) links.push({ source: from, target: p.nodeId, soft: true });
    }
  }
  return { nodes, links };
}
