/**
 * Design tokens — TS side.
 *
 * Neutral surfaces + text live in CSS variables (see theme.css) so they switch
 * light/dark for free. This file keeps the brand *accents* (domain node
 * colours, status dots) and exposes `readThemeColors()` for the WebGL graph,
 * which needs concrete colour strings (a canvas can't resolve CSS vars).
 */

import type { MapStatus } from "@abh/core";

/**
 * Node colour per domain — a restrained, modern spectrum. Cool-leaning and
 * evenly saturated so no single domain shouts, and every hue stays legible on
 * both the near-white and near-black canvases.
 */
export const DOMAIN_COLOR: Record<string, string> = {
  web: "#0a84ff",
  css: "#32ade6",
  js: "#ffb020",
  react: "#30c8a0",
  tooling: "#a78bfa",
  math: "#30c8a0",
  ml: "#ffb020",
  dl: "#a78bfa",
  music: "#ff7a66",
  theory: "#32ade6",
  practice: "#30c8a0",
  physics: "#0a84ff",
  bio: "#30c8a0",
  tech: "#ffb020",
  econ: "#ff7a66",
  space: "#a78bfa",
  earth: "#32ade6",
  everyday: "#8e8e93",
};

export function domainColor(domain: string | undefined): string {
  return (domain && DOMAIN_COLOR[domain]) || "var(--fg-subtle)";
}

/**
 * The colour a node wears on the map — resolved to a concrete value, because
 * WebGL can't read CSS variables.
 *
 * Status, not subject. The map exists to answer "what can I learn next?", so
 * that is what colour encodes: green for known, accent for open to you now,
 * neutral for locked. Colouring by domain answered a different question and
 * made known and available indistinguishable.
 */
export function statusColor(status: MapStatus): string {
  const fallback: Record<MapStatus, string> = {
    known: "#30d158",
    in_progress: "#0a84ff",
    available: "#0a84ff",
    locked: "#2a2a30",
  };
  if (typeof window === "undefined") return fallback[status];
  const cs = getComputedStyle(document.documentElement);
  const bg = cs.getPropertyValue("--bg").trim() || "#ffffff";
  const token =
    status === "known" ? "--known" : status === "locked" ? "--graph-locked" : "--available";
  return flatten(cs.getPropertyValue(token).trim() || fallback[status], bg);
}

/** Status meta. Dots are CSS-var references so they follow the theme. */
export const STATUS: Record<MapStatus, { label: string; dot: string }> = {
  known: { label: "Known", dot: "var(--known)" },
  in_progress: { label: "In progress", dot: "var(--available)" },
  available: { label: "Open now", dot: "var(--available)" },
  locked: { label: "Locked", dot: "var(--fg-subtle)" },
};

export interface ThemeColors {
  label: string;
  edge: string;
  edgeSoft: string;
  muted: string;
  locked: string;
  ai: string;
  /** Status tones for map nodes — see `statusColor`. */
  known: string;
  available: string;
}

/** Parse `#rgb`, `#rrggbb`, `rgb()` or `rgba()` into channels + alpha. */
function parseColor(input: string): { r: number; g: number; b: number; a: number } | null {
  const s = input.trim();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s);
  if (hex) {
    const h = hex[1]!;
    const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16),
      a: 1,
    };
  }
  const rgb = /^rgba?\(([^)]+)\)$/i.exec(s);
  if (rgb) {
    const parts = rgb[1]!.split(/[\s,/]+/).filter(Boolean).map(Number);
    const [r, g, b, a] = parts;
    if (r === undefined || g === undefined || b === undefined) return null;
    return { r, g, b, a: a ?? 1 };
  }
  return null;
}

function toHex(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
}

/**
 * Flatten a translucent colour onto a background.
 *
 * Sigma's WebGL programs take a colour and ignore its alpha channel, so
 * handing them `rgba(255,255,255,0.13)` painted **solid white** edges that
 * dominated the whole canvas. The tokens describe the intended blend, so we
 * resolve it here against the page background and give WebGL an opaque colour
 * that looks like what the token asked for.
 */
export function flatten(color: string, background: string): string {
  const fg = parseColor(color);
  const bg = parseColor(background);
  if (!fg) return color;
  if (fg.a >= 1) return `#${toHex(fg.r)}${toHex(fg.g)}${toHex(fg.b)}`;
  const base = bg ?? { r: 255, g: 255, b: 255, a: 1 };
  const mix = (f: number, b: number) => f * fg.a + b * (1 - fg.a);
  return `#${toHex(mix(fg.r, base.r))}${toHex(mix(fg.g, base.g))}${toHex(mix(fg.b, base.b))}`;
}

/** Read the current computed graph tokens — call on init and on theme change. */
export function readThemeColors(): ThemeColors {
  const fallback: ThemeColors = {
    label: "#e6e6ea",
    edge: "#26262b",
    edgeSoft: "#3a2f55",
    muted: "#17171b",
    locked: "#2a2a30",
    ai: "#a78bfa",
    known: "#30d158",
    available: "#0a84ff",
  };
  if (typeof window === "undefined") return fallback;
  const cs = getComputedStyle(document.documentElement);
  const get = (name: string, fb: string) => cs.getPropertyValue(name).trim() || fb;
  const bg = get("--bg", "#ffffff");
  // Every value handed to Sigma is flattened: alpha never survives the trip.
  return {
    label: flatten(get("--graph-label", fallback.label), bg),
    edge: flatten(get("--graph-edge", fallback.edge), bg),
    edgeSoft: flatten(get("--graph-edge-soft", fallback.edgeSoft), bg),
    muted: flatten(get("--graph-muted", fallback.muted), bg),
    locked: flatten(get("--graph-locked", fallback.locked), bg),
    ai: flatten(get("--ai", fallback.ai), bg),
    known: flatten(get("--known", fallback.known), bg),
    available: flatten(get("--available", fallback.available), bg),
  };
}
