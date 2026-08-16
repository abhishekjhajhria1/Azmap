"use client";

/**
 * GraphView — the second-brain graph, rendered with Sigma.js (WebGL) over a
 * graphology model, with ForceAtlas2 layout running in a **Web Worker**.
 *
 * This is the piece that must not lag: WebGL rendering + worker-side layout hold
 * 60fps into the thousands of nodes the "record of everything" will reach, and
 * the main thread never blocks on physics. Sigma gives pan/zoom/hover/click for
 * free; we only supply data and dynamic styling via reducers.
 */

import Graph from "graphology";
import FA2Layout from "graphology-layout-forceatlas2/worker";
import { inferSettings } from "graphology-layout-forceatlas2";
import { useEffect, useRef } from "react";
import Sigma from "sigma";
import { readThemeColors, type ThemeColors } from "./theme.js";
import { useTheme } from "./ThemeProvider.js";

export interface GraphNode {
  id: string;
  label: string;
  /** Domain accent colour (stays across themes). */
  color: string;
  /** Ghost = an unaccepted AI suggestion sitting on the frontier. */
  ghost?: boolean;
  /** Locked topics render in a neutral, theme-aware muted tone. */
  locked?: boolean;
  /** Relative importance (degree); scales node size. */
  weight?: number;
}
export interface GraphLink {
  source: string;
  target: string;
  /** A soft/exploration link, drawn lighter. */
  soft?: boolean;
}

interface Props {
  nodes: GraphNode[];
  links: GraphLink[];
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  /** Live search: matching nodes stay lit, everything else dims. */
  query?: string;
  /** Bumping this number re-frames the camera on the whole graph. */
  fitToken?: number;
  /** Bumping this zooms in (+1) or out (-1) relative to the last value. */
  zoomToken?: number;
  className?: string;
  style?: React.CSSProperties;
}

function topoKey(nodes: GraphNode[], links: GraphLink[]): string {
  // Rebuild the graph only when the topology changes, not on every render.
  return (
    nodes.map((n) => n.id).sort().join(",") +
    "|" +
    links.map((l) => `${l.source}>${l.target}`).sort().join(",")
  );
}

/** Recolour node/edge fills from the current theme tokens (neutrals switch;
 *  domain accents, stored per node, stay). */
function paintGraph(graph: Graph, c: ThemeColors) {
  graph.forEachNode((id, attr) => {
    const col = attr.ghost ? c.ai : attr.locked ? c.locked : attr.dcolor;
    graph.setNodeAttribute(id, "color", col);
  });
  graph.forEachEdge((id, attr) => {
    graph.setEdgeAttribute(id, "color", attr.soft ? c.edgeSoft : c.edge);
  });
}

function paintSigma(renderer: Sigma, c: ThemeColors) {
  renderer.setSetting("labelColor", { color: c.label });
  renderer.setSetting("defaultEdgeColor", c.edge);
}

export default function GraphView({
  nodes,
  links,
  selectedId,
  onSelect,
  query,
  fitToken,
  zoomToken,
  className,
  style,
}: Props) {
  const { resolved } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const graphRef = useRef<Graph | null>(null);
  const layoutRef = useRef<FA2Layout | null>(null);
  const hoverRef = useRef<string | null>(null);
  const selectedRef = useRef<string | null>(selectedId ?? null);
  const nodesRef = useRef<GraphNode[]>(nodes);
  const onSelectRef = useRef(onSelect);
  const colorsRef = useRef<ThemeColors>(readThemeColors());
  const queryRef = useRef<string>("");

  queryRef.current = (query ?? "").trim().toLowerCase();
  selectedRef.current = selectedId ?? null;
  nodesRef.current = nodes;
  onSelectRef.current = onSelect;

  // Create Sigma once.
  useEffect(() => {
    if (!containerRef.current) return;
    const graph = new Graph();
    graphRef.current = graph;

    const c0 = colorsRef.current;
    const renderer = new Sigma(graph, containerRef.current, {
      allowInvalidContainer: true,
      labelColor: { color: c0.label },
      labelFont: "ui-sans-serif, system-ui, sans-serif",
      labelSize: 12,
      labelRenderedSizeThreshold: 0.1,
      defaultEdgeColor: c0.edge,
      stagePadding: 80,
      zIndex: true,
    });
    sigmaRef.current = renderer;

    // Dynamic styling: focus a node's neighbourhood, dim the rest (Obsidian-style).
    renderer.setSetting("nodeReducer", (node, data) => {
      const res = { ...data } as Record<string, unknown> & { hidden?: boolean };

      // Live search wins over hover-focus: matches stay lit, the rest recede.
      const q = queryRef.current;
      if (q) {
        const label = String((data as { label?: string }).label ?? "").toLowerCase();
        if (!label.includes(q)) {
          res.color = colorsRef.current.muted;
          res.label = "";
        } else {
          res.highlighted = true;
        }
        return res;
      }

      const focus = hoverRef.current ?? selectedRef.current;
      if (focus) {
        const g = graphRef.current!;
        const near = node === focus || g.areNeighbors(focus, node);
        if (!near) {
          res.color = colorsRef.current.muted;
          res.label = "";
        }
      }
      if (node === selectedRef.current) {
        res.highlighted = true;
      }
      return res;
    });
    renderer.setSetting("edgeReducer", (edge, data) => {
      const res = { ...data } as Record<string, unknown> & { hidden?: boolean };
      const focus = hoverRef.current ?? selectedRef.current;
      if (focus) {
        const g = graphRef.current!;
        const [s, t] = g.extremities(edge);
        if (s !== focus && t !== focus) res.hidden = true;
      }
      return res;
    });

    renderer.on("enterNode", ({ node }) => {
      hoverRef.current = node;
      renderer.refresh();
      containerRef.current!.style.cursor = "pointer";
    });
    renderer.on("leaveNode", () => {
      hoverRef.current = null;
      renderer.refresh();
      containerRef.current!.style.cursor = "grab";
    });
    renderer.on("clickNode", ({ node }) => onSelectRef.current?.(node));
    renderer.on("clickStage", () => onSelectRef.current?.(null));

    return () => {
      layoutRef.current?.kill();
      layoutRef.current = null;
      renderer.kill();
      sigmaRef.current = null;
      graphRef.current = null;
    };
  }, []);

  // Sync graph data whenever the topology changes; restart the worker layout.
  const key = topoKey(nodes, links);
  useEffect(() => {
    const graph = graphRef.current;
    const renderer = sigmaRef.current;
    if (!graph || !renderer) return;

    layoutRef.current?.stop();
    graph.clear();

    const n = Math.max(1, nodes.length);
    nodes.forEach((node, i) => {
      const a = (i / n) * Math.PI * 2;
      graph.addNode(node.id, {
        label: node.label,
        // Seed on a circle so FA2 expands outward pleasingly.
        x: Math.cos(a) * 10 + Math.random(),
        y: Math.sin(a) * 10 + Math.random(),
        size: node.ghost ? 6 : 6 + Math.min(9, (node.weight ?? 0) * 1.4),
        color: node.color, // painted below from tokens
        // Kept so a theme flip can recompute colours without a rebuild.
        dcolor: node.color,
        ghost: !!node.ghost,
        locked: !!node.locked,
        zIndex: node.ghost ? 2 : 1,
      });
    });
    for (const l of links) {
      if (!graph.hasNode(l.source) || !graph.hasNode(l.target)) continue;
      if (graph.hasEdge(l.source, l.target)) continue;
      graph.addEdge(l.source, l.target, { soft: !!l.soft, size: 1 });
    }
    colorsRef.current = readThemeColors();
    paintGraph(graph, colorsRef.current);
    paintSigma(renderer, colorsRef.current);

    if (graph.order > 1) {
      const settings = inferSettings(graph);
      const layout = new FA2Layout(graph, {
        settings: { ...settings, slowDown: 8, gravity: 1.2 },
      });
      layout.start();
      layoutRef.current = layout;
      // Let it settle, then stop to save CPU (worker keeps the UI smooth) and
      // frame the whole graph so nothing sits clipped at the edges.
      window.setTimeout(() => {
        layout.stop();
        renderer.getCamera().animatedReset();
      }, 2200);
    }
    renderer.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Reflect external selection / search changes without rebuilding the graph.
  useEffect(() => {
    sigmaRef.current?.refresh();
  }, [selectedId, query]);

  // Camera: frame the whole graph.
  useEffect(() => {
    if (fitToken == null) return;
    sigmaRef.current?.getCamera().animatedReset();
  }, [fitToken]);

  // Camera: step zoom. The sign of the change decides the direction.
  const lastZoom = useRef<number | undefined>(zoomToken);
  useEffect(() => {
    if (zoomToken == null) return;
    const prev = lastZoom.current ?? zoomToken;
    lastZoom.current = zoomToken;
    const cam = sigmaRef.current?.getCamera();
    if (!cam || zoomToken === prev) return;
    if (zoomToken > prev) cam.animatedZoom({ duration: 220 });
    else cam.animatedUnzoom({ duration: 220 });
  }, [zoomToken]);

  // Recolour live when the theme flips (neutrals/labels/edges switch).
  useEffect(() => {
    const graph = graphRef.current;
    const renderer = sigmaRef.current;
    if (!graph || !renderer) return;
    // Wait a frame so the CSS variables reflect the new theme before we read them.
    const raf = requestAnimationFrame(() => {
      colorsRef.current = readThemeColors();
      paintGraph(graph, colorsRef.current);
      paintSigma(renderer, colorsRef.current);
      renderer.refresh();
    });
    return () => cancelAnimationFrame(raf);
  }, [resolved]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ cursor: "grab", ...style }}
    />
  );
}
