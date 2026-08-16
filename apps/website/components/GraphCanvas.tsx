"use client";

/**
 * GraphCanvas — an Obsidian-style interactive graph view.
 *
 * A self-contained force-directed layout rendered on a canvas: no graph
 * library, so it stays light and works identically on every surface. It runs
 * the real @abh/core engine for status/unlocks, so what you see is the product.
 *
 * Interaction, modelled on Obsidian's graph:
 *   - drag the background to pan, scroll to zoom (toward the cursor),
 *   - drag a node to reposition and pin it,
 *   - hover a node to focus it — its neighbours stay lit, everything else dims,
 *   - click an "available" node to complete it (fires onComplete).
 */

import { graph as engine, type Edge, type MapStatus, type Topic } from "@abh/core";
import { readThemeColors, useTheme } from "@abh/ui/lite";
import { useEffect, useRef } from "react";

export interface GraphColors {
  /** Per-topic base color (e.g. by domain). Falls back to a neutral tone. */
  colorOf?: (topic: Topic) => string;
}

interface Props {
  topics: Topic[];
  edges: Edge[];
  selectedId?: string | null;
  colorOf?: (topic: Topic) => string;
  onSelect?: (id: string | null) => void;
  onComplete?: (id: string) => void;
  /**
   * Ids rendered as "ghost" suggestion nodes — dashed and translucent, the
   * AI's proposals sitting on the frontier of the map. Clicking one opens it
   * (onSelect) rather than completing it.
   */
  ghostIds?: Set<string>;
  /** "explore" enables full interaction; "ambient" is a calm auto-drifting demo. */
  mode?: "explore" | "ambient";
  className?: string;
}

interface Sim {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number | null; // pinned position (drag)
  fy: number | null;
  degree: number;
}

const STATUS_RING: Record<MapStatus, string> = {
  known: "#40916c",
  in_progress: "#e9b949",
  available: "#e9b949",
  locked: "#274b39",
};

export default function GraphCanvas({
  topics,
  edges,
  selectedId,
  colorOf,
  onSelect,
  onComplete,
  ghostIds,
  mode = "explore",
  className = "",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // All mutable interaction state lives in refs so the rAF loop never restarts.
  const nodesRef = useRef<Map<string, Sim>>(new Map());
  const viewRef = useRef({ scale: 1, tx: 0, ty: 0, initialised: false });
  const hoverRef = useRef<string | null>(null);
  const dragRef = useRef<{ id: string | null; moved: boolean; panning: boolean } | null>(null);
  // While the layout settles we ease the camera to frame the whole graph;
  // the first real interaction hands control to the user for good.
  const autoFitRef = useRef({ frames: 0, userTook: false });
  const dataRef = useRef({ topics, edges });
  const cbRef = useRef({ onSelect, onComplete });
  const selectedRef = useRef<string | null>(selectedId ?? null);
  const ghostRef = useRef<Set<string>>(ghostIds ?? new Set());

  // Theme-aware neutrals for the canvas (labels/edges/locked/ring), refreshed
  // whenever the theme flips so the hero graph reads well in light and dark.
  const { resolved } = useTheme();
  const readColors = () => {
    const c = readThemeColors();
    const fg = typeof window !== "undefined"
      ? getComputedStyle(document.documentElement).getPropertyValue("--fg").trim() || c.label
      : c.label;
    return { ...c, fg };
  };
  const themeRef = useRef(readColors());
  useEffect(() => { themeRef.current = readColors(); }, [resolved]);

  dataRef.current = { topics, edges };
  cbRef.current = { onSelect, onComplete };
  selectedRef.current = selectedId ?? null;
  ghostRef.current = ghostIds ?? new Set();

  // Keep the simulation node set in sync with the topic set.
  useEffect(() => {
    const nodes = nodesRef.current;
    const degree = new Map<string, number>();
    for (const e of edges) {
      degree.set(e.from, (degree.get(e.from) ?? 0) + 1);
      degree.set(e.to, (degree.get(e.to) ?? 0) + 1);
    }
    const n = topics.length;
    topics.forEach((t, i) => {
      const existing = nodes.get(t.id);
      if (existing) {
        existing.degree = degree.get(t.id) ?? 0;
      } else {
        // Seed on a circle so the layout expands outward pleasingly.
        const a = (i / Math.max(1, n)) * Math.PI * 2;
        nodes.set(t.id, {
          id: t.id,
          x: Math.cos(a) * 180 + (Math.random() - 0.5) * 40,
          y: Math.sin(a) * 180 + (Math.random() - 0.5) * 40,
          vx: 0,
          vy: 0,
          fx: null,
          fy: null,
          degree: degree.get(t.id) ?? 0,
        });
      }
    });
    for (const id of [...nodes.keys()]) {
      if (!topics.some((t) => t.id === id)) nodes.delete(id);
    }
  }, [topics, edges]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let running = true;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas!.getBoundingClientRect();
      canvas!.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas!.height = Math.max(1, Math.floor(rect.height * dpr));
      const view = viewRef.current;
      if (!view.initialised) {
        view.tx = rect.width / 2;
        view.ty = rect.height / 2;
        view.scale = 1;
        view.initialised = true;
      }
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    function step() {
      const nodes = nodesRef.current;
      const arr = [...nodes.values()];
      const { edges } = dataRef.current;

      // Repulsion (all pairs — fine for the tens-of-nodes we render).
      for (let i = 0; i < arr.length; i++) {
        const a = arr[i]!;
        for (let j = i + 1; j < arr.length; j++) {
          const b = arr[j]!;
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 0.01) {
            dx = Math.random() - 0.5;
            dy = Math.random() - 0.5;
            d2 = 0.01;
          }
          const d = Math.sqrt(d2);
          const rep = 5200 / d2;
          const fx = (dx / d) * rep;
          const fy = (dy / d) * rep;
          a.vx += fx;
          a.vy += fy;
          b.vx -= fx;
          b.vy -= fy;
        }
      }
      // Springs along edges.
      const byId = new Map(arr.map((n) => [n.id, n]));
      for (const e of edges) {
        const a = byId.get(e.from);
        const b = byId.get(e.to);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const k = 0.015;
        const rest = 96;
        const f = (d - rest) * k;
        const fx = (dx / d) * f;
        const fy = (dy / d) * f;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }
      // Centering + integrate.
      for (const nde of arr) {
        nde.vx += -nde.x * 0.0016;
        nde.vy += -nde.y * 0.0016;
        if (nde.fx != null) {
          nde.x = nde.fx;
          nde.vx = 0;
        } else {
          nde.vx *= 0.82;
          nde.x += Math.max(-30, Math.min(30, nde.vx));
        }
        if (nde.fy != null) {
          nde.y = nde.fy;
          nde.vy = 0;
        } else {
          nde.vy *= 0.82;
          nde.y += Math.max(-30, Math.min(30, nde.vy));
        }
      }
    }

    function radiusOf(nde: Sim) {
      return 7 + Math.min(9, nde.degree * 1.6);
    }

    // Ease the camera so every node fits within the canvas with padding.
    function autoFit() {
      const arr = [...nodesRef.current.values()];
      if (arr.length === 0) return;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const n of arr) {
        const r = radiusOf(n) + 22; // include label/padding
        minX = Math.min(minX, n.x - r);
        minY = Math.min(minY, n.y - r);
        maxX = Math.max(maxX, n.x + r);
        maxY = Math.max(maxY, n.y + r);
      }
      const rect = canvas!.getBoundingClientRect();
      const pad = 28;
      const cw = Math.max(1, rect.width - pad * 2);
      const ch = Math.max(1, rect.height - pad * 2);
      const contentW = Math.max(1, maxX - minX);
      const contentH = Math.max(1, maxY - minY);
      const target = Math.max(0.4, Math.min(1.6, Math.min(cw / contentW, ch / contentH)));
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const view = viewRef.current;
      const targetTx = rect.width / 2 - cx * target;
      const targetTy = rect.height / 2 - cy * target;
      // Lerp for a smooth "camera easing" feel.
      const k = 0.12;
      view.scale += (target - view.scale) * k;
      view.tx += (targetTx - view.tx) * k;
      view.ty += (targetTy - view.ty) * k;
    }

    function draw() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const view = viewRef.current;
      const { topics, edges } = dataRef.current;
      const nodes = nodesRef.current;
      const statuses = engine.computeStatuses({ topics, edges });
      const topicById = new Map(topics.map((t) => [t.id, t]));
      const hover = hoverRef.current;
      const selected = selectedRef.current;
      const focus = hover ?? selected;

      // Neighbours of the focused node (kept lit while others dim).
      const lit = new Set<string>();
      if (focus) {
        lit.add(focus);
        for (const e of edges) {
          if (e.from === focus) lit.add(e.to);
          if (e.to === focus) lit.add(e.from);
        }
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);
      ctx.translate(view.tx, view.ty);
      ctx.scale(view.scale, view.scale);

      // Edges.
      ctx.lineWidth = 1.1 / view.scale;
      for (const e of edges) {
        const a = nodes.get(e.from);
        const b = nodes.get(e.to);
        if (!a || !b) continue;
        const active = engine.computeStatuses; // noop ref to keep engine imported
        void active;
        const on = focus ? lit.has(e.from) && lit.has(e.to) : true;
        const tc = themeRef.current;
        ctx.strokeStyle = on ? tc.edge : tc.muted;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      // Nodes.
      const now = performance.now();
      const ghosts = ghostRef.current;
      for (const t of topics) {
        const nde = nodes.get(t.id);
        if (!nde) continue;
        const status = statuses.get(t.id) ?? "locked";
        const r = radiusOf(nde);
        const dim = focus ? (lit.has(t.id) ? 1 : 0.18) : 1;
        const base = colorOf?.(t) ?? "#74c69d";
        const isGhost = ghosts.has(t.id);
        const fill = isGhost
          ? "rgba(199,125,255,0.10)"
          : status === "locked"
            ? themeRef.current.locked
            : base;

        ctx.globalAlpha = dim;

        // Ghost suggestion: a dashed violet ring with a "+" — an AI proposal
        // sitting on the map, waiting to be opened and added.
        if (isGhost) {
          const pulse = 0.5 + 0.5 * Math.sin(now / 600 + nde.x);
          ctx.beginPath();
          ctx.arc(nde.x, nde.y, r, 0, Math.PI * 2);
          ctx.fillStyle = fill;
          ctx.fill();
          ctx.setLineDash([4 / view.scale, 4 / view.scale]);
          ctx.lineWidth = 1.8 / view.scale;
          ctx.strokeStyle = `rgba(199,125,255,${0.5 + pulse * 0.4})`;
          ctx.stroke();
          ctx.setLineDash([]);
          // plus glyph
          ctx.strokeStyle = "#c77dff";
          ctx.lineWidth = 2 / view.scale;
          ctx.beginPath();
          ctx.moveTo(nde.x - r * 0.4, nde.y);
          ctx.lineTo(nde.x + r * 0.4, nde.y);
          ctx.moveTo(nde.x, nde.y - r * 0.4);
          ctx.lineTo(nde.x, nde.y + r * 0.4);
          ctx.stroke();
          const showG = view.scale > 0.6 || lit.has(t.id) || !focus;
          if (showG) {
            ctx.globalAlpha = dim * 0.8;
            ctx.fillStyle = "#d8b6ff";
            ctx.font = `12px ui-sans-serif, system-ui, sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillText(t.title, nde.x, nde.y + r + 4);
          }
          ctx.globalAlpha = 1;
          continue;
        }

        // Pulse halo for the things you can start right now.
        if (status === "available") {
          const pulse = 0.5 + 0.5 * Math.sin(now / 500 + nde.x);
          ctx.beginPath();
          ctx.arc(nde.x, nde.y, r + 5 + pulse * 4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(233,185,73,${0.14 * dim})`;
          ctx.fill();
        }

        // Selection ring.
        if (t.id === selected) {
          ctx.beginPath();
          ctx.arc(nde.x, nde.y, r + 6, 0, Math.PI * 2);
          ctx.strokeStyle = themeRef.current.fg;
          ctx.lineWidth = 2 / view.scale;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(nde.x, nde.y, r, 0, Math.PI * 2);
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.lineWidth = 2 / view.scale;
        ctx.strokeStyle = STATUS_RING[status];
        ctx.stroke();

        // Known check.
        if (status === "known") {
          ctx.strokeStyle = "#0a1a12";
          ctx.lineWidth = 2 / view.scale;
          ctx.beginPath();
          ctx.moveTo(nde.x - r * 0.4, nde.y);
          ctx.lineTo(nde.x - r * 0.1, nde.y + r * 0.35);
          ctx.lineTo(nde.x + r * 0.45, nde.y - r * 0.3);
          ctx.stroke();
        }

        // Label — shown when zoomed in or focused, Obsidian-style.
        const showLabel = view.scale > 0.7 || lit.has(t.id) || !focus;
        if (showLabel) {
          ctx.globalAlpha = dim * (focus && !lit.has(t.id) ? 0.15 : 0.92);
          ctx.fillStyle = themeRef.current.label;
          ctx.font = `${12}px ui-sans-serif, system-ui, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillText(t.title, nde.x, nde.y + r + 4);
        }
        ctx.globalAlpha = 1;
      }
    }

    function frame() {
      if (!running) return;
      step();
      const fit = autoFitRef.current;
      // Frame the graph while it settles, then leave the camera alone.
      if (!fit.userTook && fit.frames < 200) autoFit();
      fit.frames++;
      draw();
      raf = requestAnimationFrame(frame);
    }
    frame();

    // ---- Interaction ----
    function toWorld(clientX: number, clientY: number) {
      const rect = canvas!.getBoundingClientRect();
      const view = viewRef.current;
      return {
        x: (clientX - rect.left - view.tx) / view.scale,
        y: (clientY - rect.top - view.ty) / view.scale,
      };
    }
    function nodeAt(clientX: number, clientY: number): Sim | null {
      const p = toWorld(clientX, clientY);
      let best: Sim | null = null;
      let bestD = Infinity;
      for (const nde of nodesRef.current.values()) {
        const dx = nde.x - p.x;
        const dy = nde.y - p.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        const r = radiusOf(nde) + 6;
        if (d < r && d < bestD) {
          best = nde;
          bestD = d;
        }
      }
      return best;
    }

    function onDown(ev: PointerEvent) {
      autoFitRef.current.userTook = true;
      canvas!.setPointerCapture(ev.pointerId);
      const hit = nodeAt(ev.clientX, ev.clientY);
      if (hit) {
        dragRef.current = { id: hit.id, moved: false, panning: false };
      } else {
        dragRef.current = { id: null, moved: false, panning: true };
      }
    }
    function onMove(ev: PointerEvent) {
      const drag = dragRef.current;
      if (!drag) {
        const hit = nodeAt(ev.clientX, ev.clientY);
        const id = hit?.id ?? null;
        if (id !== hoverRef.current) {
          hoverRef.current = id;
          canvas!.style.cursor = id ? "pointer" : "grab";
        }
        return;
      }
      const dpr = 1; // movement already in CSS px
      void dpr;
      if (drag.panning) {
        viewRef.current.tx += ev.movementX;
        viewRef.current.ty += ev.movementY;
        drag.moved = true;
        canvas!.style.cursor = "grabbing";
      } else if (drag.id) {
        const p = toWorld(ev.clientX, ev.clientY);
        const nde = nodesRef.current.get(drag.id);
        if (nde) {
          nde.fx = p.x;
          nde.fy = p.y;
        }
        drag.moved = true;
      }
    }
    function onUp(ev: PointerEvent) {
      const drag = dragRef.current;
      dragRef.current = null;
      canvas!.style.cursor = hoverRef.current ? "pointer" : "grab";
      if (!drag) return;
      if (drag.id) {
        const nde = nodesRef.current.get(drag.id);
        // Release the pin shortly after a drag so layout can settle again.
        if (nde && drag.moved) {
          window.setTimeout(() => {
            nde.fx = null;
            nde.fy = null;
          }, 400);
        }
        if (!drag.moved) {
          // A click: open it. Complete only real, available topics — a ghost
          // suggestion is opened for review, never auto-completed.
          const { topics, edges } = dataRef.current;
          const status = engine.computeStatuses({ topics, edges }).get(drag.id);
          const isGhost = ghostRef.current.has(drag.id);
          cbRef.current.onSelect?.(drag.id);
          if (!isGhost && status === "available") cbRef.current.onComplete?.(drag.id);
        }
      } else if (!drag.moved) {
        cbRef.current.onSelect?.(null);
      }
      void ev;
    }
    function onWheel(ev: WheelEvent) {
      ev.preventDefault();
      autoFitRef.current.userTook = true;
      const view = viewRef.current;
      const rect = canvas!.getBoundingClientRect();
      const mx = ev.clientX - rect.left;
      const my = ev.clientY - rect.top;
      const factor = Math.exp(-ev.deltaY * 0.0015);
      const newScale = Math.max(0.35, Math.min(3, view.scale * factor));
      // Zoom toward the cursor.
      view.tx = mx - ((mx - view.tx) * newScale) / view.scale;
      view.ty = my - ((my - view.ty) * newScale) / view.scale;
      view.scale = newScale;
    }

    const interactive = mode === "explore";
    if (interactive) {
      canvas.style.cursor = "grab";
      canvas.addEventListener("pointerdown", onDown);
      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerup", onUp);
      canvas.addEventListener("wheel", onWheel, { passive: false });
    }

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      if (interactive) {
        canvas.removeEventListener("pointerdown", onDown);
        canvas.removeEventListener("pointermove", onMove);
        canvas.removeEventListener("pointerup", onUp);
        canvas.removeEventListener("wheel", onWheel);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, colorOf]);

  return <canvas ref={canvasRef} className={className} />;
}
