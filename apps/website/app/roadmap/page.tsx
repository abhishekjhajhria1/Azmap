"use client";

/**
 * The Learner plot: follow one roadmap.
 *
 * No active roadmap → a picker (pre-existing library + an "AI generates one"
 * seam we can't yet afford to run). Active → the follower: your full path as a
 * checklist on the left, the *evolving* mind map in the centre (revealing as
 * you progress, with AI branch-suggestions as ghost nodes), and an inspector
 * on the right.
 */

import { graph as engine, type MapStatus, type Topic } from "@abh/core";
import { useMemo, useState } from "react";
import GraphCanvas from "@/components/GraphCanvas";
import PlotNav from "@/components/PlotNav";
import { useJourney } from "@/lib/journey";
import { DOMAIN_COLOR, ROADMAPS } from "@/lib/roadmaps";

const STATUS_DOT: Record<MapStatus, string> = {
  known: "#40916c",
  in_progress: "#e9b949",
  available: "#e9b949",
  locked: "#3a5c49",
};

export default function RoadmapPlot() {
  const j = useJourney();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  if (!j.hydrated) {
    return <div className="grid h-screen place-items-center bg-forest-950 text-forest-400">Loading your map…</div>;
  }

  if (!j.def) {
    return <RoadmapPicker onPick={j.chooseRoadmap} />;
  }

  // Status across the *full* roadmap (for the checklist), and helpers.
  const fullStatuses = engine.computeStatuses({ topics: j.topics, edges: j.edges });
  const known = j.topics.filter((t) => t.progress === "known").length;
  const percent = Math.round((known / Math.max(1, j.topics.length)) * 100);

  const selected: Topic | null =
    j.graphTopics.find((t) => t.id === selectedId) ??
    j.topics.find((t) => t.id === selectedId) ??
    null;
  const selectedIsGhost = selectedId ? j.ghostIds.has(selectedId) : false;

  function completeTopic(id: string) {
    const unlocked = engine.wouldUnlock(id, { topics: j.topics, edges: j.edges });
    j.complete(id);
    if (unlocked.length) {
      setToast(`Unlocked: ${unlocked.map((t) => t.title).join(", ")}`);
      window.setTimeout(() => setToast(null), 3200);
    }
  }

  function addSuggestion(id: string) {
    j.acceptSuggestion(id);
    setToast("Added to your map");
    window.setTimeout(() => setToast(null), 2400);
  }

  const relations = selected
    ? {
        needs: j.edges.filter((e) => e.to === selected.id).map((e) => e.from),
        unlocks: j.edges.filter((e) => e.from === selected.id).map((e) => e.to),
      }
    : { needs: [], unlocks: [] };
  const titleOf = (id: string) =>
    j.def!.path.find((s) => s.id === id)?.title ??
    j.def!.branches.find((s) => s.id === id)?.title ??
    id;

  return (
    <div className="flex h-screen flex-col bg-forest-950 text-parchment">
      {/* Top bar */}
      <header className="flex items-center justify-between gap-4 border-b border-forest-800/70 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <a href="/" className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-forest-600 text-sm font-bold">A</a>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{j.def.title}</div>
            <div className="truncate text-[11px] text-forest-400">{j.def.goal}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <PlotNav active="roadmap" />
          <button
            onClick={() => { j.leaveRoadmap(); setSelectedId(null); }}
            className="hidden rounded-md border border-forest-700 px-2.5 py-1.5 text-xs text-forest-300 transition hover:bg-forest-800 sm:block"
          >
            Change roadmap
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Left: the path as a checklist (full plan) */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-forest-800/70 md:flex">
          <div className="border-b border-forest-800/70 p-3">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-semibold text-forest-200">Your path</span>
              <span className="text-forest-400">{percent}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-forest-800">
              <div className="h-full rounded-full bg-amber transition-all" style={{ width: `${percent}%` }} />
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {j.def.path.map((s, i) => {
              const status = fullStatuses.get(s.id) ?? "locked";
              const revealed = j.revealedIds.has(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className={`group flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-[13px] transition ${
                    selectedId === s.id ? "bg-forest-800" : "hover:bg-forest-900"
                  } ${revealed ? "" : "opacity-45"}`}
                >
                  <span className="w-4 shrink-0 text-center text-[11px] text-forest-500">{i + 1}</span>
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: STATUS_DOT[status] }} />
                  <span className={`truncate ${status === "known" ? "text-forest-400 line-through" : "text-forest-100"}`}>
                    {s.title}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Center: the evolving map */}
        <main className="relative min-w-0 flex-1">
          <div className="bg-grid absolute inset-0 opacity-40" />
          <GraphCanvas
            topics={j.graphTopics}
            edges={j.graphEdges}
            ghostIds={j.ghostIds}
            selectedId={selectedId}
            colorOf={(t) => DOMAIN_COLOR[t.tags[0] ?? ""] ?? "#74c69d"}
            onSelect={setSelectedId}
            onComplete={completeTopic}
            className="absolute inset-0 h-full w-full"
          />
          <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-3 rounded-lg border border-forest-800/70 bg-forest-950/80 px-3 py-2 text-[11px] text-forest-300 backdrop-blur">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-forest-500" />Known</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber" />Open now</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full border border-dashed" style={{ borderColor: "#c77dff" }} />AI suggests</span>
          </div>
          <div className="pointer-events-none absolute right-3 top-3 rounded-lg border border-forest-800/70 bg-forest-950/80 px-3 py-1.5 text-[11px] text-forest-400 backdrop-blur">
            The map grows as you learn · tap a node
          </div>
          {toast && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-lg border border-amber/40 bg-forest-900/95 px-4 py-2.5 text-sm text-amber-soft shadow-xl">
              ✦ {toast}
            </div>
          )}
        </main>

        {/* Right: inspector */}
        <aside className="hidden w-80 shrink-0 flex-col border-l border-forest-800/70 lg:flex">
          {selected ? (
            selectedIsGhost ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5">
                <div className="mb-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-[#c77dff22] px-2.5 py-1 text-[11px] font-medium text-[#c77dff]">
                  ✦ AI suggests
                </div>
                <h2 className="text-xl font-semibold">{selected.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-forest-200">{selected.whyItMatters}</p>
                <p className="mt-3 text-xs text-forest-400">
                  Sits at the edge of what you already know. Add it to branch your
                  map beyond the core path.
                </p>
                <div className="mt-auto pt-6">
                  <button
                    onClick={() => addSuggestion(selected.id)}
                    className="w-full rounded-lg bg-[#c77dff] py-2.5 text-sm font-semibold text-forest-950 transition hover:brightness-110"
                  >
                    + Add to your map
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5">
                <div
                  className="mb-2 inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
                  style={{ background: `${DOMAIN_COLOR[selected.tags[0] ?? ""] ?? "#74c69d"}22`, color: DOMAIN_COLOR[selected.tags[0] ?? ""] ?? "#74c69d" }}
                >
                  {selected.tags[0] ?? "topic"}
                </div>
                <h2 className="text-xl font-semibold">{selected.title}</h2>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-forest-300">
                  <span className="h-2 w-2 rounded-full" style={{ background: STATUS_DOT[fullStatuses.get(selected.id) ?? "locked"] }} />
                  {label(fullStatuses.get(selected.id) ?? "locked")}
                </div>
                {selected.whyItMatters && <p className="mt-4 text-sm leading-relaxed text-forest-200">{selected.whyItMatters}</p>}

                <Relations title="Needs first" ids={relations.needs} titleOf={titleOf} statuses={fullStatuses} onSelect={setSelectedId} empty="No prerequisites — a starting point." />
                <Relations title="Unlocks" ids={relations.unlocks} titleOf={titleOf} statuses={fullStatuses} onSelect={setSelectedId} empty="Nothing yet — a frontier of the map." />

                <div className="mt-auto pt-6">
                  {fullStatuses.get(selected.id) === "known" ? (
                    <button onClick={() => j.uncomplete(selected.id)} className="w-full rounded-lg border border-forest-700 py-2.5 text-sm font-semibold text-forest-200 transition hover:bg-forest-900">
                      ✓ Known — undo
                    </button>
                  ) : (
                    <button
                      onClick={() => completeTopic(selected.id)}
                      disabled={fullStatuses.get(selected.id) === "locked"}
                      className="w-full rounded-lg bg-amber py-2.5 text-sm font-semibold text-forest-950 transition hover:bg-amber-soft disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Mark known
                    </button>
                  )}
                  {fullStatuses.get(selected.id) === "locked" && (
                    <p className="mt-2 text-center text-xs text-forest-500">Clear its prerequisites to open this.</p>
                  )}
                </div>
              </div>
            )
          ) : (
            <NextUp
              available={j.graphTopics.filter((t) => !j.ghostIds.has(t.id) && engine.computeStatuses({ topics: j.graphTopics, edges: j.graphEdges }).get(t.id) === "available")}
              suggestions={j.suggestions}
              onSelect={setSelectedId}
            />
          )}
        </aside>
      </div>
    </div>
  );
}

function label(s: MapStatus) {
  return s === "known" ? "Known" : s === "in_progress" ? "In progress" : s === "available" ? "Open to you now" : "Locked";
}

function Relations({
  title, ids, titleOf, statuses, onSelect, empty,
}: {
  title: string; ids: string[]; titleOf: (id: string) => string;
  statuses: Map<string, MapStatus>; onSelect: (id: string) => void; empty: string;
}) {
  return (
    <div className="mt-5">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-amber">{title}</div>
      {ids.length === 0 ? (
        <p className="text-xs text-forest-500">{empty}</p>
      ) : (
        <div className="flex flex-col gap-1">
          {ids.map((id) => (
            <button key={id} onClick={() => onSelect(id)} className="flex items-center gap-2 rounded-md border border-forest-800 px-2.5 py-1.5 text-left text-[13px] text-forest-100 transition hover:border-forest-600 hover:bg-forest-900">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: STATUS_DOT[statuses.get(id) ?? "locked"] }} />
              <span className="truncate">{titleOf(id)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function NextUp({
  available, suggestions, onSelect,
}: {
  available: Topic[]; suggestions: Topic[]; onSelect: (id: string) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-amber">Open to you now</div>
      <p className="mb-3 text-xs text-forest-400">Everything whose prerequisites you&apos;ve cleared.</p>
      <div className="flex flex-col gap-2">
        {available.length === 0 && <p className="text-xs text-forest-500">Complete a step to open the next.</p>}
        {available.map((t) => (
          <button key={t.id} onClick={() => onSelect(t.id)} className="rounded-lg border border-forest-800 bg-forest-900/40 px-3 py-2.5 text-left transition hover:border-amber/50">
            <div className="text-sm font-medium">{t.title}</div>
            {t.whyItMatters && <div className="mt-0.5 line-clamp-2 text-xs text-forest-300">{t.whyItMatters}</div>}
          </button>
        ))}
      </div>
      {suggestions.length > 0 && (
        <>
          <div className="mb-1 mt-6 text-[11px] font-semibold uppercase tracking-wider text-[#c77dff]">✦ AI suggests</div>
          <div className="flex flex-col gap-2">
            {suggestions.map((t) => (
              <button key={t.id} onClick={() => onSelect(t.id)} className="rounded-lg border border-[#c77dff33] bg-[#c77dff0d] px-3 py-2.5 text-left transition hover:border-[#c77dff66]">
                <div className="text-sm font-medium text-[#d8b6ff]">{t.title}</div>
                {t.whyItMatters && <div className="mt-0.5 line-clamp-2 text-xs text-forest-300">{t.whyItMatters}</div>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function RoadmapPicker({ onPick }: { onPick: (id: string) => void }) {
  return (
    <div className="min-h-screen bg-forest-950 text-parchment">
      <header className="flex items-center justify-between border-b border-forest-800/70 px-5 py-3">
        <a href="/" className="flex items-center gap-2 font-bold">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-forest-600 text-sm">A</span> ABH
        </a>
        <PlotNav active="roadmap" />
      </header>
      <div className="mx-auto max-w-5xl px-5 py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber">Start a roadmap</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">What do you want to learn?</h1>
        <p className="mt-3 max-w-xl text-forest-300">
          Pick a path and follow it. Your map grows as you go, and suggestions
          appear at the edges of what you know.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ROADMAPS.map((r) => (
            <button
              key={r.id}
              onClick={() => onPick(r.id)}
              className="group flex flex-col rounded-2xl border border-forest-700/60 bg-forest-900/40 p-5 text-left transition hover:-translate-y-0.5 hover:border-forest-500 hover:bg-forest-900/70"
            >
              <span className="mb-3 inline-block h-2.5 w-2.5 rounded-full" style={{ background: r.accent }} />
              <div className="text-lg font-semibold">{r.title}</div>
              <div className="mt-1 text-sm text-forest-300">{r.blurb}</div>
              <div className="mt-4 flex items-center gap-2 text-xs text-forest-400">
                <span>{r.path.length} steps</span>
                <span>·</span>
                <span>{r.branches.length} branches</span>
              </div>
              <span className="mt-4 text-sm font-medium text-amber opacity-0 transition group-hover:opacity-100">
                Start →
              </span>
            </button>
          ))}

          {/* The AI seam — deliberately honest that it isn't deployed yet. */}
          <div className="flex flex-col rounded-2xl border border-dashed border-[#c77dff44] bg-[#c77dff08] p-5">
            <span className="mb-3 inline-block text-[#c77dff]">✦</span>
            <div className="text-lg font-semibold text-[#d8b6ff]">Generate with AI</div>
            <div className="mt-1 text-sm text-forest-300">
              Name any subject and AI builds a roadmap for it — even one nobody
              has mapped yet.
            </div>
            <div className="mt-4 inline-flex w-fit rounded-full border border-[#c77dff33] px-2.5 py-1 text-[11px] text-[#c77dff]">
              Coming soon
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
