import { getRoadmap, graph as engine, ROADMAPS, roadmapNodeId, type RoadmapDef, type MapStatus } from "@abh/core";
import { STATUS, useAbh } from "@abh/ui";
import { Check, ChevronRight, Sparkles } from "lucide-react";
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
    <div className="mx-auto h-full max-w-[38rem] overflow-y-auto px-6 py-14">
      <h1 className="t-display text-balance">What do you want to learn?</h1>
      <p className="t-body mt-3 max-w-[30rem] text-muted">
        Pick a path and follow it, distraction-free. It reveals as you go, and
        everything you finish lands in your brain.
      </p>

      <div className="mt-9 group">
        {ROADMAPS.map((r) => (
          <button key={r.id} onClick={() => onPick(r)} className="row-btn group/row py-4">
            <span
              className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] text-[15px] font-bold"
              style={{ background: `color-mix(in srgb, ${r.accent} 18%, transparent)`, color: r.accent }}
            >
              {r.title[0]}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15.5px] font-semibold">{r.title}</span>
              <span className="mt-0.5 block truncate text-[13px] text-muted">{r.blurb}</span>
            </span>
            <span className="t-foot shrink-0 tabular-nums text-subtle">{r.path.length} steps</span>
            <ChevronRight size={17} className="shrink-0 text-subtle transition group-hover/row:translate-x-0.5 group-hover/row:text-fg" />
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-[18px] px-4 py-4" style={{ background: "color-mix(in srgb, var(--ai) 8%, transparent)" }}>
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl text-ai" style={{ background: "color-mix(in srgb, var(--ai) 15%, transparent)" }}>
          <Sparkles size={17} />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[14.5px] font-semibold text-ai">Generate with AI</span>
            <span className="rounded-full px-2 py-0.5 text-[10.5px] font-medium text-ai" style={{ background: "color-mix(in srgb, var(--ai) 15%, transparent)" }}>Soon</span>
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">
            Name any subject — even one nobody has mapped yet — and get a real path through it.
          </p>
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

  const remaining = def.path.length - known;

  return (
    <div className="mx-auto h-full max-w-[38rem] overflow-y-auto px-6 py-10">
      {/* Header — the roadmap is context, not the hero. Kept quiet. */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="t-eyebrow text-subtle">Following</div>
          <div className="t-title3 mt-1 truncate">{def.title}</div>
        </div>
        <button
          onClick={() => void leave(null)}
          className="pressable shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium text-muted transition hover:bg-surface-2 hover:text-fg"
        >
          Change
        </button>
      </div>

      {/* Progress — one calm line, numbers where the eye ends. */}
      <div className="mt-5 flex items-center gap-3">
        <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="t-foot tabular-nums text-muted">
          {known}<span className="text-subtle">/{def.path.length}</span>
        </span>
      </div>

      {/* THE focal point — one thing dominates this screen. */}
      {seed && nodeId && (
        <section className="mt-10">
          <div className="t-eyebrow flex items-center gap-2 text-accent">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS[status].dot }} />
            {status === "known" ? "Completed" : status === "locked" ? "Locked" : "Up next"}
          </div>
          <h2 className="t-display mt-3 text-balance">{seed.title}</h2>
          <p className="t-body mt-4 max-w-[34rem] text-muted">{seed.why}</p>

          <div className="mt-7 flex items-center gap-3">
            {status === "known" ? (
              <button
                onClick={() => void setProgress(nodeId, "not_started")}
                className="pressable inline-flex items-center gap-2 rounded-full bg-surface-2 px-5 py-3 text-[14px] font-semibold text-fg"
              >
                <Check size={16} className="text-known" /> Known
                <span className="text-muted">· undo</span>
              </button>
            ) : (
              <button
                onClick={async () => {
                  const { unlocked, streak } = await complete(nodeId);
                  celebrate({ unlocked, streak, streakAdvanced: true });
                }}
                disabled={status === "locked"}
                className="pressable inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-[14px] font-semibold text-accent-ink shadow-[var(--e2)] hover:brightness-[1.06] disabled:opacity-40 disabled:shadow-none"
              >
                <Check size={16} /> Mark known
              </button>
            )}
            {status === "locked" && (
              <span className="t-foot text-subtle">Clear its prerequisites first</span>
            )}
          </div>
        </section>
      )}

      {/* The path — one grouped list, hairline seams, no boxed rows. */}
      <section className="mt-12 pb-6">
        <div className="mb-3 flex items-baseline justify-between px-1">
          <span className="t-eyebrow text-subtle">Your path</span>
          <span className="t-foot text-subtle">
            {remaining > 0 ? `${remaining} to go` : "Complete"}
          </span>
        </div>
        <div className="group">
          {def.path.map((s, i) => {
            const st = statuses.get(roadmapNodeId(def.id, s.id)) ?? "locked";
            const active = s.id === seedId;
            const done = st === "known";
            return (
              <button
                key={s.id}
                onClick={() => setSelectedSeed(s.id)}
                className="row-btn relative"
                style={active ? { background: "color-mix(in srgb, var(--accent) 8%, transparent)" } : undefined}
              >
                {active && <span className="absolute inset-y-0 left-0 w-[3px] bg-accent" />}
                <span
                  className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full"
                  style={{
                    background: done ? "var(--known)" : "transparent",
                    border: done ? "none" : `1.5px solid ${st === "locked" ? "var(--seam)" : "var(--available)"}`,
                    color: "var(--accent-contrast)",
                  }}
                >
                  {done && <Check size={13} strokeWidth={3} />}
                </span>
                <span className={`flex-1 truncate text-[14.5px] ${done ? "text-subtle" : "text-fg"} ${active ? "font-semibold" : "font-medium"}`}>
                  {s.title}
                </span>
                <span className="t-foot tabular-nums text-subtle">{i + 1}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
