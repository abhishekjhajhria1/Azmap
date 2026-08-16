/**
 * Design tokens — TS side.
 *
 * Neutral surfaces + text live in CSS variables (see theme.css) so they switch
 * light/dark for free. This file keeps the brand *accents* (domain node
 * colours, status dots) and exposes `readThemeColors()` for the WebGL graph,
 * which needs concrete colour strings (a canvas can't resolve CSS vars).
 */

import type { MapStatus } from "@abh/core";

/** Node colour per domain — brand accents, legible in both themes. */
export const DOMAIN_COLOR: Record<string, string> = {
  web: "#5ea0e9",
  css: "#5bbfce",
  js: "#e0a92e",
  react: "#43b284",
  tooling: "#a970ff",
  math: "#43b284",
  ml: "#e0a92e",
  dl: "#a970ff",
  music: "#e08a6a",
  theory: "#5bbfce",
  practice: "#43b284",
  physics: "#5ea0e9",
  bio: "#43b284",
  tech: "#e0a92e",
  econ: "#e08a6a",
  space: "#a970ff",
  earth: "#5bbfce",
  everyday: "#d6a94a",
};

export function domainColor(domain: string | undefined): string {
  return (domain && DOMAIN_COLOR[domain]) || "var(--fg-subtle)";
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
}

/** Read the current computed graph tokens — call on init and on theme change. */
export function readThemeColors(): ThemeColors {
  const fallback: ThemeColors = {
    label: "#e7ecef",
    edge: "rgba(116,198,157,0.18)",
    edgeSoft: "rgba(199,125,255,0.24)",
    muted: "rgba(116,198,157,0.12)",
    locked: "#1b3a2b",
    ai: "#c77dff",
  };
  if (typeof window === "undefined") return fallback;
  const cs = getComputedStyle(document.documentElement);
  const get = (name: string, fb: string) => cs.getPropertyValue(name).trim() || fb;
  return {
    label: get("--graph-label", fallback.label),
    edge: get("--graph-edge", fallback.edge),
    edgeSoft: get("--graph-edge-soft", fallback.edgeSoft),
    muted: get("--graph-muted", fallback.muted),
    locked: get("--graph-locked", fallback.locked),
    ai: get("--ai", fallback.ai),
  };
}
