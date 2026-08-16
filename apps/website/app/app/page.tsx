"use client";

/**
 * The map workspace — an Obsidian-style three-pane explorer, running entirely
 * on @abh/core in the browser. Left: your topics, grouped and searchable.
 * Centre: the live graph. Right: an inspector for the selected topic with its
 * prerequisites, what it unlocks, and a one-tap "mark known".
 *
 * This is a real, playable slice of the product — not a marketing mock.
 */

import { type Edge, graph as engine, type MapStatus, type Topic } from "@abh/core";
import { useMemo, useState } from "react";
import AskAnything from "@/components/AskAnything";
import GraphCanvas from "@/components/GraphCanvas";
import PlotNav from "@/components/PlotNav";
import {
  buildSampleEdges,
  buildSampleTopics,
  DOMAIN_COLOR,
  DOMAIN_LABEL,
  domainOf,
} from "@/lib/sampleMap";
import { DOMAIN_COLOR as EXTRA_COLORS } from "@/lib/roadmaps";

let exploreSeq = 0;

const STATUS_META: Record<MapStatus, { label: string; dot: string }> = {
  known: { label: "Known", dot: "#40916c" },
  in_progress: { label: "In progress", dot: "#e9b949" },
  available: { label: "Open now", dot: "#e9b949" },
  locked: { label: "Locked", dot: "#3a5c49" },
};

export default function AppWorkspace() {
  const [topics, setTopics] = useState<Topic[]>(buildSampleTopics);
  const [edges, setEdges] = useState<Edge[]>(buildSampleEdges);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const statuses = useMemo(
    () => engine.computeStatuses({ topics, edges }),
    [topics, edges],
  );

  const knownCount = topics.filter((t) => t.progress === "known").length;
  const availableCount = [...statuses.values()].filter((s) => s === "available").length;
  const percent = Math.round((knownCount / topics.length) * 100);

  const selected = topics.find((t) => t.id === selectedId) ?? null;

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const map = new Map<string, Topic[]>();
    for (const t of topics) {
      if (q && !t.title.toLowerCase().includes(q)) continue;
      const d = domainOf(t);
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(t);
    }
    return [...map.entries()];
  }, [topics, query]);

  function complete(id: string) {
    const unlocked = engine.wouldUnlock(id, { topics, edges });
    setTopics((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, progress: "known", completedAt: Date.now() } : t,
      ),
    );
    if (unlocked.length > 0) {
      setToast(
        `Unlocked ${unlocked.length} new ${unlocked.length === 1 ? "topic" : "topics"}: ${unlocked
          .map((t) => t.title)
          .join(", ")}`,
      );
      window.setTimeout(() => setToast(null), 3200);
    }
  }

  function setProgress(id: string, progress: Topic["progress"]) {
    setTopics((prev) =>
      prev.map((t) => (t.id === id ? { ...t, progress } : t)),
    );
  }

  // Prerequisites + dependents of the selected topic.
  const relations = useMemo(() => {
    if (!selected) return { prereqs: [] as Topic[], unlocks: [] as Topic[] };
    const byId = new Map(topics.map((t) => [t.id, t]));
    const prereqs = edges.filter((e) => e.to === selected.id)
      .map((e) => byId.get(e.from))
      .filter(Boolean) as Topic[];
    const unlocks = edges.filter((e) => e.from === selected.id)
      .map((e) => byId.get(e.to))
      .filter(Boolean) as Topic[];
    return { prereqs, unlocks };
  }, [selected, topics, edges]);

  // Colour + label helpers that also cover the "how things work" domains that
  // arrive when someone asks a question here.
  const colorOf = (t: Topic) =>
    DOMAIN_COLOR[domainOf(t)] ?? EXTRA_COLORS[t.tags[0] ?? ""] ?? "#c77dff";
  const labelOf = (domain: string) =>
    DOMAIN_LABEL[domain as keyof typeof DOMAIN_LABEL] ??
    (domain ? domain[0]!.toUpperCase() + domain.slice(1) : "Explorations");

  // The curious layer: an asked/opened topic joins this map. Link it to the
  // selected node if there is one, so exploration branches from where you are.
  function addExploration(input: {
    title: string;
    why?: string;
    domain?: string;
    parentId?: string;
  }): string {
    exploreSeq += 1;
    const id = `x_${Date.now().toString(36)}_${exploreSeq}`;
    const parent = input.parentId ?? selectedId ?? undefined;
    const now = Date.now();
    setTopics((prev) => [
      ...prev,
      {
        id,
        title: input.title,
        summary: "",
        whyItMatters: input.why ?? "",
        unlocks: "",
        progress: "not_started",
        origin: "capture",
        sources: [],
        tags: [input.domain ?? "everyday"],
        createdAt: now,
        updatedAt: now,
        rev: 0,
      },
    ]);
    if (parent) {
      setEdges((prev) => [
        ...prev,
        { id: `${parent}~>${id}`, from: parent, to: id, strength: "soft", origin: "capture", createdAt: 0, rev: 0 },
      ]);
    }
    return id;
  }

  return (
    <div className="flex h-screen flex-col bg-forest-950 text-parchment">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-forest-800/70 px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <a href="/" className="grid h-7 w-7 place-items-center rounded-lg bg-forest-600 text-sm font-bold">
            A
          </a>
          <span className="text-sm font-semibold">ABH</span>
          <span className="hidden text-xs text-forest-400 sm:inline">· Explore anything</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-forest-300">
          <span className="hidden sm:inline">{availableCount} open now</span>
          <span className="hidden h-3 w-px bg-forest-700 sm:block" />
          <span className="hidden sm:inline">{percent}% known</span>
          <PlotNav active="app" />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Left sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-forest-800/70 md:flex">
          <div className="p-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search topics…"
              className="w-full rounded-lg border border-forest-700 bg-forest-900 px-3 py-2 text-sm outline-none placeholder:text-forest-500 focus:border-amber"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
            {grouped.map(([domain, ts]) => (
              <div key={domain} className="mb-3">
                <div className="flex items-center gap-2 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-forest-400">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: DOMAIN_COLOR[domain as keyof typeof DOMAIN_COLOR] ?? EXTRA_COLORS[domain] ?? "#c77dff" }}
                  />
                  {labelOf(domain)}
                </div>
                {ts.map((t) => {
                  const status = statuses.get(t.id) ?? "locked";
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedId(t.id)}
                      className={`group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition ${
                        selectedId === t.id
                          ? "bg-forest-800 text-parchment"
                          : "text-forest-200 hover:bg-forest-900"
                      }`}
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: STATUS_META[status].dot }}
                      />
                      <span className="truncate">{t.title}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </aside>

        {/* Graph */}
        <main className="relative min-w-0 flex-1">
          <div className="bg-grid absolute inset-0 opacity-40" />
          <GraphCanvas
            topics={topics}
            edges={edges}
            selectedId={selectedId}
            colorOf={colorOf}
            onSelect={setSelectedId}
            onComplete={complete}
            className="absolute inset-0 h-full w-full"
          />

          {/* Legend */}
          <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-3 rounded-lg border border-forest-800/70 bg-forest-950/80 px-3 py-2 text-[11px] text-forest-300 backdrop-blur">
            {(["known", "available", "in_progress", "locked"] as MapStatus[]).map((s) => (
              <span key={s} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: STATUS_META[s].dot }} />
                {STATUS_META[s].label}
              </span>
            ))}
          </div>

          <div className="pointer-events-none absolute right-3 top-3 rounded-lg border border-forest-800/70 bg-forest-950/80 px-3 py-1.5 text-[11px] text-forest-400 backdrop-blur">
            Drag to pan · scroll to zoom · drag a node to move it
          </div>

          {toast && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-lg border border-amber/40 bg-forest-900/95 px-4 py-2.5 text-sm text-amber-soft shadow-xl">
              ✦ {toast}
            </div>
          )}
        </main>

        {/* Inspector */}
        <aside className="hidden w-80 shrink-0 flex-col border-l border-forest-800/70 lg:flex">
          {selected ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5">
              <div
                className="mb-2 inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
                style={{
                  background: `${DOMAIN_COLOR[domainOf(selected)]}22`,
                  color: DOMAIN_COLOR[domainOf(selected)],
                }}
              >
                {DOMAIN_LABEL[domainOf(selected)]}
              </div>
              <h2 className="text-xl font-semibold">{selected.title}</h2>
              <StatusBadge status={statuses.get(selected.id) ?? "locked"} />

              {selected.whyItMatters && (
                <p className="mt-4 text-sm leading-relaxed text-forest-200">
                  {selected.whyItMatters}
                </p>
              )}

              <RelationList
                title="Needs first"
                topics={relations.prereqs}
                statuses={statuses}
                onSelect={setSelectedId}
                emptyText="No prerequisites — a starting point."
              />
              <RelationList
                title="Unlocks"
                topics={relations.unlocks}
                statuses={statuses}
                onSelect={setSelectedId}
                emptyText="A leaf on the map — for now."
              />

              <div className="mt-auto pt-6">
                {statuses.get(selected.id) === "known" ? (
                  <button
                    onClick={() => setProgress(selected.id, "not_started")}
                    className="w-full rounded-lg border border-forest-700 py-2.5 text-sm font-semibold text-forest-200 transition hover:bg-forest-900"
                  >
                    ✓ Known — undo
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => complete(selected.id)}
                      disabled={statuses.get(selected.id) === "locked"}
                      className="flex-1 rounded-lg bg-amber py-2.5 text-sm font-semibold text-forest-950 transition hover:bg-amber-soft disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Mark known
                    </button>
                    <button
                      onClick={() => setProgress(selected.id, "in_progress")}
                      className="rounded-lg border border-forest-700 px-3 py-2.5 text-sm font-semibold text-forest-200 transition hover:bg-forest-900"
                    >
                      Studying
                    </button>
                  </div>
                )}
                {statuses.get(selected.id) === "locked" && (
                  <p className="mt-2 text-center text-xs text-forest-500">
                    Clear its prerequisites to open this.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <EmptyInspector
              available={topics.filter((t) => statuses.get(t.id) === "available")}
              onSelect={setSelectedId}
            />
          )}
        </aside>
      </div>

      {/* Ask anything — the curious layer, open to everyone. */}
      <AskAnything onAdd={addExploration} />
    </div>
  );
}

function StatusBadge({ status }: { status: MapStatus }) {
  return (
    <div className="mt-2 flex items-center gap-1.5 text-xs text-forest-300">
      <span className="h-2 w-2 rounded-full" style={{ background: STATUS_META[status].dot }} />
      {STATUS_META[status].label}
    </div>
  );
}

function RelationList({
  title,
  topics,
  statuses,
  onSelect,
  emptyText,
}: {
  title: string;
  topics: Topic[];
  statuses: Map<string, MapStatus>;
  onSelect: (id: string) => void;
  emptyText: string;
}) {
  return (
    <div className="mt-5">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-amber">
        {title}
      </div>
      {topics.length === 0 ? (
        <p className="text-xs text-forest-500">{emptyText}</p>
      ) : (
        <div className="flex flex-col gap-1">
          {topics.map((t) => (
            <button
              key={t.id}
              onClick={() => onSelect(t.id)}
              className="flex items-center gap-2 rounded-md border border-forest-800 px-2.5 py-1.5 text-left text-[13px] text-forest-100 transition hover:border-forest-600 hover:bg-forest-900"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: STATUS_META[statuses.get(t.id) ?? "locked"].dot }}
              />
              <span className="truncate">{t.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyInspector({
  available,
  onSelect,
}: {
  available: Topic[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-amber">
        Open to you now
      </div>
      <p className="mb-4 text-xs text-forest-400">
        Everything whose prerequisites you&apos;ve cleared. Pick one, or click a
        node in the graph.
      </p>
      <div className="flex flex-col gap-2">
        {available.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className="rounded-lg border border-forest-800 bg-forest-900/40 px-3 py-2.5 text-left transition hover:border-amber/50"
          >
            <div className="text-sm font-medium">{t.title}</div>
            {t.whyItMatters && (
              <div className="mt-0.5 line-clamp-2 text-xs text-forest-300">
                {t.whyItMatters}
              </div>
            )}
          </button>
        ))}
      </div>
      <p className="mt-auto pt-6 text-center text-xs text-forest-600">
        Select a topic to see what it needs and unlocks.
      </p>
    </div>
  );
}
