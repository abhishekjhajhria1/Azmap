import { graph as engine, getRoadmap, type Progress, type Topic } from "@abh/core";
import { STATUS } from "@abh/ui";
import { useMemo } from "react";

/**
 * Guardian — designed now, backed locally until sync ships.
 *
 * A guardian watches *someone else's* map, so this needs the sync backend to be
 * real. Until then it's an honest preview: a sample mentee's progress rendered
 * the way it will look, with a clear note that live sharing arrives with sync.
 */
const MENTEE = { name: "Aanya", roadmapId: "frontend", known: ["html", "css", "js", "es6", "dom"], streak: 9 };

export function GuardianSpace() {
  const def = getRoadmap(MENTEE.roadmapId)!;
  const { topics, learned, percent } = useMemo(() => {
    const known = new Set(MENTEE.known);
    const ns: Topic[] = def.path.map((s) => ({
      id: `${def.id}__${s.id}`, title: s.title, summary: "", whyItMatters: s.why, unlocks: "",
      progress: (known.has(s.id) ? "known" : (s.progress ?? "not_started")) as Progress,
      origin: "curated", sources: [], tags: [s.domain], createdAt: 0, updatedAt: 0, rev: 0,
    }));
    const learned = ns.filter((t) => t.progress === "known");
    return { topics: ns, learned, percent: engine.progressPercent(ns) };
  }, [def]);

  return (
    <div className="mx-auto h-full max-w-3xl overflow-y-auto px-5 py-8">
      <div className="mb-4 rounded-xl border border-ai bg-ai/10 px-4 py-3 text-sm text-ai">
        ✦ Preview — guardians watch someone else's map, so this goes live with cross-device sync. The layout and sign-off flow are real.
      </div>

      <div className="flex items-center gap-4">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-accent to-known text-xl font-bold text-accent-ink">{MENTEE.name[0]}</div>
        <div>
          <h1 className="text-2xl font-bold">{MENTEE.name}</h1>
          <p className="text-sm text-muted">Following <span className="text-fg">{def.title}</span> · you're her mentor</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Progress" value={`${percent}%`} sub={`${learned.length}/${topics.length} topics`} bar={percent} />
        <Stat label="Streak" value={`${MENTEE.streak} days`} sub="Active recently" />
        <Stat label="Sign-off" value="2" sub="Awaiting your confirmation" />
      </div>

      <div className="glass mt-6 rounded-2xl p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-accent">Recently learned</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {learned.slice(-5).reverse().map((t) => (
            <li key={t.id} className="flex items-center gap-2.5 text-sm text-fg"><span className="grid h-5 w-5 place-items-center rounded-full bg-surface-2 text-[10px]">✓</span>{t.title}</li>
          ))}
        </ul>
        <div className="mt-4 flex items-center gap-2 text-xs text-subtle"><span className="h-2 w-2 rounded-full" style={{ background: STATUS.available.dot }} />You'll be told when she slips — no need to check in.</div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, bar }: { label: string; value: string; sub: string; bar?: number }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-1 text-3xl font-bold">{value}</div>
      {bar != null && <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-accent" style={{ width: `${bar}%` }} /></div>}
      <div className="mt-2 text-xs text-subtle">{sub}</div>
    </div>
  );
}
