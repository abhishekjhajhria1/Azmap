import { graph as engine, getRoadmap, type Progress, type Topic } from "@abh/core";
import { BellRing, Check, Flame, Sparkles } from "lucide-react";
import { useMemo } from "react";

/**
 * People — designed now, backed locally until sync ships.
 *
 * A guardian watches *someone else's* map, so this needs the sync backend to be
 * real. Until then it's an honest preview: a sample learner's progress rendered
 * the way it will look, with a clear note that live sharing arrives with sync.
 */
const MENTEE = {
  name: "Aanya",
  roadmapId: "frontend",
  known: ["html", "css", "js", "es6", "dom"],
  streak: 9,
};

export function GuardianSpace() {
  const def = getRoadmap(MENTEE.roadmapId)!;
  const { topics, learned, percent } = useMemo(() => {
    const known = new Set(MENTEE.known);
    const ns: Topic[] = def.path.map((s) => ({
      id: `${def.id}__${s.id}`, title: s.title, summary: "", whyItMatters: s.why, unlocks: "",
      progress: (known.has(s.id) ? "known" : (s.progress ?? "not_started")) as Progress,
      origin: "curated", sources: [], tags: [s.domain], createdAt: 0, updatedAt: 0, rev: 0,
      deviceId: "", // preview data — never written, never synced
    }));
    const learned = ns.filter((t) => t.progress === "known");
    return { topics: ns, learned, percent: engine.progressPercent(ns) };
  }, [def]);

  return (
    <div className="h-full overflow-y-auto py-10">
      <div className="doc doc--wide">
        {/* Document header. */}
        <header>
          <p className="t-eyebrow">Someone you look after</p>
          <div className="mt-2 flex items-center gap-3.5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-surface-2 text-[17px] font-semibold text-muted">
              {MENTEE.name[0]}
            </span>
            <div className="min-w-0">
              <h1 className="t-title1">{MENTEE.name}</h1>
              <p className="t-tight mt-0.5 text-muted">
                Following <span className="text-fg">{def.title}</span>
              </p>
            </div>
          </div>
        </header>

        {/* A preview notice, not an outlined alert box. Tinted fill, no border —
            it's context, and context shouldn't shout louder than the content. */}
        <div
          className="mt-6 flex items-start gap-3 rounded-[16px] px-4 py-3.5"
          style={{ background: "color-mix(in srgb, var(--ai) 9%, transparent)" }}
        >
          <Sparkles size={16} className="mt-0.5 shrink-0 text-ai" />
          <p className="t-tight text-muted">
            <span className="font-semibold text-ai">Preview.</span> Guardians watch
            someone else&apos;s map, so this goes live with cross-device sync. The layout
            and the sign-off flow are real.
          </p>
        </div>

        {/* Three numbers, one surface. Three separately outlined cards was three
            boxes competing; seams group them into a single reading. */}
        <div className="stack mt-7 grid sm:grid-cols-3 sm:[&>*+*]:border-l sm:[&>*+*]:border-t-0">
          <Stat label="Progress" value={`${percent}%`} sub={`${learned.length} of ${topics.length} topics`} bar={percent} />
          <Stat label="Streak" value={`${MENTEE.streak} days`} sub="Active this week" icon={<Flame size={14} className="text-known" />} />
          <Stat label="Awaiting sign-off" value="2" sub="Your confirmation" />
        </div>

        <section className="mt-9">
          <div className="mb-2 flex items-baseline justify-between px-1">
            <h2 className="t-eyebrow">Recently learned</h2>
            <span className="t-meta">{learned.length} total</span>
          </div>
          <div className="stack">
            {learned.slice(-5).reverse().map((t) => (
              <div key={t.id} className="row-btn row-tight cursor-default">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--known)_15%,transparent)]">
                  <Check size={13} className="text-known" strokeWidth={2.75} />
                </span>
                <span className="t-tight min-w-0 flex-1 truncate">{t.title}</span>
                <button className="reveal t-meta shrink-0 rounded-full px-2.5 py-1 text-accent hover:bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]">
                  Sign off
                </button>
              </div>
            ))}
          </div>
          <p className="t-meta mt-3 flex items-center gap-2 px-1">
            <BellRing size={13} />
            You&apos;ll be told when she slips — no need to check in.
          </p>
        </section>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  bar,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  bar?: number;
  icon?: React.ReactNode;
}) {
  return (
    <div className="px-4 py-4">
      <div className="t-meta flex items-center gap-1.5">
        {icon}
        {label}
      </div>
      <div className="t-title2 mt-1.5 tabular-nums">{value}</div>
      {bar != null && (
        <div className="mt-2.5 h-[4px] w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out"
            style={{ width: `${bar}%` }}
          />
        </div>
      )}
      <div className="t-meta mt-1.5">{sub}</div>
    </div>
  );
}
