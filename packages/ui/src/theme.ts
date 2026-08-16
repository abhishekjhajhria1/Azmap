/**
 * Design tokens — the single visual spec every surface (web app, marketing,
 * and the Flutter app that mirrors these values) reads from.
 */

import type { MapStatus } from "@abh/core";

export const color = {
  forest950: "#0a1a12",
  forest900: "#0e2419",
  forest800: "#123021",
  forest700: "#1b4332",
  forest600: "#2d6a4f",
  forest500: "#40916c",
  forest400: "#52b788",
  forest300: "#74c69d",
  parchment: "#f4f1e8",
  amber: "#e9b949",
  amberSoft: "#f2d493",
  violet: "#c77dff",
  violetSoft: "#d8b6ff",
} as const;

/** Node colour per domain — covers roadmap and "how things work" domains. */
export const DOMAIN_COLOR: Record<string, string> = {
  web: "#5ea0e9",
  css: "#8bd3dd",
  js: "#e9b949",
  react: "#74c69d",
  tooling: "#c77dff",
  math: "#74c69d",
  ml: "#e9b949",
  dl: "#c77dff",
  music: "#e9967a",
  theory: "#8bd3dd",
  practice: "#74c69d",
  physics: "#5ea0e9",
  bio: "#74c69d",
  tech: "#e9b949",
  econ: "#e9967a",
  space: "#c77dff",
  earth: "#8bd3dd",
  everyday: "#f2d493",
};

export function domainColor(domain: string | undefined): string {
  return (domain && DOMAIN_COLOR[domain]) || color.forest300;
}

export const STATUS: Record<MapStatus, { label: string; dot: string }> = {
  known: { label: "Known", dot: color.forest500 },
  in_progress: { label: "In progress", dot: color.amber },
  available: { label: "Open now", dot: color.amber },
  locked: { label: "Locked", dot: "#3a5c49" },
};
