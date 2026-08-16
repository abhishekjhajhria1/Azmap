import { getRoadmap, graph as engine, ROADMAPS, roadmapNodeId, type RoadmapDef, type MapStatus } from "@abh/core";
import { STATUS, useAbh } from "@abh/ui";
import { useMemo, useState } from "react";
import { useCelebrate } from "../Celebration";

/**
 * The Roadmap space — deliberately distraction-free.
 *
 * No graph, no sprawl: your path as a quiet checklist and the current topic to
 * focus on. It's a lens over the one shared graph (roadmap-namespaced nodes), so
 * everything you complete here still lands in your second brain.
 */
export function RoadmapSpace() {
  const { topics, profile } = useAbh();
  const startRoadmap = useAbh((s) => s.startRoadmap);
  const activeId = profile?.activeRoadmapId ?? null;
  const def = activeId ? getRoadmap(activeId) ?? null : null;

  if (!def) return <Picker onPick={(d) => void startRoadmap(d)} />;
  return <Runner def={def} topics={topics} />;
}

function Picker({ onPick }: { onPick: (def: RoadmapDef) => void }) {
  return (
    <div className="mx-auto h-full max-w-3xl overflow-y-auto px-5 py-10">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Start a roadmap</p>
      <h1 className="mt-2 text-3xl font-bold">What do you want to learn?</h1>
      <p className="mt-2 text-muted">Pick a path and follow it, distraction-free. It reveals as you go and joins your brain.</p>
      <div className="mt-8 grid gap-3">
        {ROADMAPS.map((r) => (
          <button key={r.id} onClick={() => onPick(r)} className="group glass flex items-center justify-between rounded-2xl p-5 text-left transition hover:-translate-y-0.5 hover:border-accent">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.accent }} />
                <span className="text-lg font-semibold">{r.title}</span>
              </div>
              <div className="mt-1 text-sm text-muted">{r.blurb}</div>
              <div className="mt-2 text-xs text-subtle">{r.path.length} steps · {r.branches.length} branches</div>
            </div>
            <span className="text-accent opacity-0 transition group-hover:opacity-100">Start →</span>
          </button>
        ))}
        <div className="rounded-2xl border border-dashed border-ai bg-ai/10 p-5">
          <div className="flex items-center gap-2 text-ai"><span>✦</span><span className="text-lg font-semibold">Generate with AI</span></div>
          <div className="mt-1 text-sm text-muted">Name any subject and AI builds a roadmap for it — even one nobody has mapped yet.</div>
          <span className="mt-3 inline-block rounded-full border border-ai px-2.5 py-1 text-[11px] text-ai">Coming soon</span>
        </div>
      </div>
    </div>
  );
}

function Runner({ def, topics }: { def: RoadmapDef; topics: ReturnType<typeof useAbh.getState>["topics"] }) {
  const complete = useAbh((s) => s.complete);
  const celebrate = useCelebrate();
  const setProgress = useAbh((s) => s.setProgress);
  const leave = useAbh((s) => s.setActiveRoadmap);
  const [selectedSeed, setSelectedSeed] = useState<string | null>(null);

  // The roadmap's slice of the global graph.
  const ids = def.path.map((s) => roadmapNodeId(def.id, s.id));
  const inRoadmap = useMemo(() => topics.filter((t) => ids.includes(t.id)), [topics, def.id]);
  const edges = useMemo(() => {
    const out: { from: string; to: string; strength: "hard" | "soft" }[] = [];
    for (const s of def.path) for (const need of s.needs ?? []) out.push({ from: roadmapNodeId(def.id, need), to: roadmapNodeId(def.id, s.id), strength: "hard" });
    return out;
  }, [def.id]);
  const statuses = useMemo(() => engine.computeStatuses({ topics: inRoadmap, edges: edges.map((e, i) => ({ id: String(i), origin: "curated" as const, createdAt: 0, rev: 0, ...e })) }), [inRoadmap, edges]);
  const known = inRoadmap.filter((t) => t.progress === "known").length;
  const percent = Math.round((known / Math.max(1, def.path.length)) * 100);

  const seedId = selectedSeed ?? def.path.find((s) => (statuses.get(roadmapNodeId(def.id, s.id)) ?? "locked") === "available")?.id ?? def.path[0]?.id ?? null;
  const seed = def.path.find((s) => s.id === seedId) ?? null;
  const nodeId = seed ? roadmapNodeId(def.id, seed.id) : null;
  const status: MapStatus = nodeId ? statuses.get(nodeId) ?? "locked" : "locked";

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col px-5 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">{def.title}</div>
          <div className="text-xs text-subtle">{def.goal}</div>
        </div>
        <button onClick={() => void leave(null)} className="rounded-md border border-hairline px-2.5 py-1.5 text-xs text-muted transition hover:bg-surface-2">Change</button>
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${percent}%` }} /></div>
      <div className="mt-1 text-right text-xs text-subtle">{percent}% · {known}/{def.path.length}</div>

      {/* Focused current topic */}
      {seed && nodeId && (
        <div className="mt-6 glass rounded-2xl p-6">
          <div className="flex items-center gap-1.5 text-xs text-muted"><span className="h-2 w-2 rounded-full" style={{ background: STATUS[status].dot }} />{STATUS[status].label}</div>
          <h2 className="mt-2 text-2xl font-bold">{seed.title}</h2>
          <p className="mt-3 leading-relaxed text-fg">{seed.why}</p>
          <div className="mt-5">
            {status === "known" ? (
              <button onClick={() => void setProgress(nodeId, "not_started")} className="rounded-lg border border-hairline px-4 py-2.5 text-sm font-semibold text-fg transition hover:bg-surface">✓ Known — undo</button>
            ) : (
              <button
                onClick={async () => {
                  const { unlocked, streak } = await complete(nodeId);
                  celebrate({ unlocked, streak, streakAdvanced: true });
                }}
                disabled={status === "locked"}
                className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink transition hover:brightness-110 active:scale-[0.98] disabled:opacity-40"
              >
                Mark known
              </button>
            )}
            {status === "locked" && <span className="ml-3 text-xs text-subtle">Clear its prerequisites first.</span>}
          </div>
        </div>
      )}

      {/* The path as a quiet checklist */}
      <div className="mt-6 min-h-0 flex-1 overflow-y-auto">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-subtle">Your path</div>
        {def.path.map((s, i) => {
          const st = statuses.get(roadmapNodeId(def.id, s.id)) ?? "locked";
          const active = s.id === seedId;
          return (
            <button key={s.id} onClick={() => setSelectedSeed(s.id)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${active ? "bg-surface-2" : "hover:bg-surface"}`}>
              <span className="w-4 text-center text-[11px] text-subtle">{i + 1}</span>
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: STATUS[st].dot }} />
              <span className={st === "known" ? "text-subtle line-through" : "text-fg"}>{s.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
