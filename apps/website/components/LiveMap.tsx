"use client";

/**
 * The hero map — a real, playable demonstration of the product, not a mockup.
 *
 * It runs the actual `@abh/core` unlock engine in the browser: click any
 * amber ("open to you now") node and the engine recomputes which locked nodes
 * become available, exactly as the app does. That "finishing one thing opens
 * several others" moment is the whole pitch, so we let visitors feel it.
 */

import { graph as engine, type Edge, type MapStatus, type Topic } from "@abh/core";
import { useMemo, useState } from "react";

type Node = { id: string; title: string; x: number; y: number };

// A small, legible slice of a "learn calculus" graph. Positions are authored
// for a clean left-to-right DAG inside the 960x440 viewBox.
const NODES: Node[] = [
  { id: "arith", title: "Arithmetic", x: 70, y: 220 },
  { id: "algebra", title: "Algebra", x: 250, y: 130 },
  { id: "geometry", title: "Geometry", x: 250, y: 320 },
  { id: "functions", title: "Functions", x: 445, y: 130 },
  { id: "trig", title: "Trigonometry", x: 445, y: 320 },
  { id: "limits", title: "Limits", x: 645, y: 130 },
  { id: "vectors", title: "Vectors", x: 645, y: 320 },
  { id: "deriv", title: "Derivatives", x: 850, y: 70 },
  { id: "integ", title: "Integrals", x: 850, y: 200 },
];

const LINKS: [string, string][] = [
  ["arith", "algebra"],
  ["arith", "geometry"],
  ["algebra", "functions"],
  ["algebra", "trig"],
  ["geometry", "trig"],
  ["functions", "limits"],
  ["trig", "vectors"],
  ["limits", "deriv"],
  ["limits", "integ"],
];

// Which nodes start already known, to seed a realistic "mid-journey" state.
const SEED_KNOWN = new Set(["arith", "algebra"]);

function seedTopics(): Topic[] {
  const ts = Date.now();
  return NODES.map((n) => ({
    id: n.id,
    title: n.title,
    summary: "",
    whyItMatters: "",
    unlocks: "",
    progress: SEED_KNOWN.has(n.id) ? "known" : "not_started",
    origin: "curated",
    sources: [],
    tags: [],
    createdAt: ts,
    updatedAt: ts,
    rev: 0,
  }));
}

const EDGES: Edge[] = LINKS.map(([from, to]) => ({
  id: `${from}->${to}`,
  from,
  to,
  strength: "hard",
  origin: "curated",
  createdAt: 0,
  rev: 0,
}));

const STATUS_STYLE: Record<MapStatus, { fill: string; ring: string; label: string }> = {
  known: { fill: "#40916c", ring: "#74c69d", label: "Known" },
  in_progress: { fill: "#2d6a4f", ring: "#74c69d", label: "In progress" },
  available: { fill: "#e9b949", ring: "#f2d493", label: "Open to you now" },
  locked: { fill: "#123021", ring: "#1b4332", label: "Locked" },
};

export default function LiveMap() {
  const [topics, setTopics] = useState<Topic[]>(seedTopics);
  const [justUnlocked, setJustUnlocked] = useState<Set<string>>(new Set());

  const statuses = useMemo(
    () => engine.computeStatuses({ topics, edges: EDGES }),
    [topics],
  );

  const knownCount = topics.filter((t) => t.progress === "known").length;
  const percent = Math.round((knownCount / topics.length) * 100);

  const pos = useMemo(() => {
    const m = new Map<string, Node>();
    for (const n of NODES) m.set(n.id, n);
    return m;
  }, []);

  function complete(id: string) {
    if (statuses.get(id) !== "available") return;
    const g = { topics, edges: EDGES };
    const opened = new Set(engine.wouldUnlock(id, g).map((t) => t.id));
    setJustUnlocked(opened);
    setTopics((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, progress: "known", completedAt: Date.now() } : t,
      ),
    );
    window.setTimeout(() => setJustUnlocked(new Set()), 1400);
  }

  function reset() {
    setTopics(seedTopics());
    setJustUnlocked(new Set());
  }

  return (
    <div className="rounded-2xl border border-forest-700/60 bg-forest-900/60 p-3 shadow-2xl backdrop-blur sm:p-5">
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-sm text-forest-300">
          <span className="inline-block h-2 w-2 rounded-full bg-amber animate-pulse-soft" />
          Try it — tap an amber topic
        </div>
        <button
          onClick={reset}
          className="rounded-md px-2 py-1 text-xs text-forest-300 transition hover:bg-forest-800 hover:text-parchment"
        >
          Reset
        </button>
      </div>

      <svg
        viewBox="0 0 960 440"
        className="h-auto w-full select-none"
        role="img"
        aria-label="Interactive learning map"
      >
        {/* Edges */}
        {LINKS.map(([from, to]) => {
          const a = pos.get(from)!;
          const b = pos.get(to)!;
          const toStatus = statuses.get(to);
          const active = statuses.get(from) === "known";
          return (
            <line
              key={`${from}-${to}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={active ? "#52b788" : "#1b4332"}
              strokeWidth={active ? 2.5 : 1.5}
              strokeDasharray={toStatus === "locked" && !active ? "5 6" : "0"}
              className="transition-all duration-500"
            />
          );
        })}

        {/* Nodes */}
        {NODES.map((n) => {
          const status = statuses.get(n.id) ?? "locked";
          const style = STATUS_STYLE[status];
          const clickable = status === "available";
          const opened = justUnlocked.has(n.id);
          return (
            <g
              key={n.id}
              transform={`translate(${n.x},${n.y})`}
              className={clickable ? "cursor-pointer" : "cursor-default"}
              onClick={() => complete(n.id)}
            >
              {(clickable || opened) && (
                <circle
                  r={30}
                  fill="none"
                  stroke={style.ring}
                  strokeWidth={2}
                  opacity={0.5}
                  className="animate-pulse-soft"
                />
              )}
              <circle
                r={22}
                fill={style.fill}
                stroke={style.ring}
                strokeWidth={2}
                className="transition-all duration-500"
              />
              {status === "known" && (
                <path
                  d="M -7 0 L -2 6 L 8 -6"
                  fill="none"
                  stroke="#0a1a12"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              <text
                y={44}
                textAnchor="middle"
                className="fill-parchment text-[13px] font-medium"
                style={{ fontSize: 13 }}
              >
                {n.title}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex flex-wrap gap-3 text-xs text-forest-300">
          {(["known", "available", "locked"] as MapStatus[]).map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: STATUS_STYLE[s].fill, outline: `1px solid ${STATUS_STYLE[s].ring}` }}
              />
              {STATUS_STYLE[s].label}
            </span>
          ))}
        </div>
        <div className="text-xs font-medium text-forest-300">
          {percent}% of this map known
        </div>
      </div>
    </div>
  );
}
