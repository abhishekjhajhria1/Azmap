"use client";

/**
 * The Guardian plot: a different view for a different user.
 *
 * A guardian doesn't roam a graph — they want to know, at a glance, how far
 * their learner has actually come, what they're on now, and what's waiting for
 * a sign-off. So this plot is a progress dashboard, not a map. It reads a
 * learner's journey off the same @abh/core model.
 */

import { graph as engine, type MapStatus, type Topic } from "@abh/core";
import { useMemo, useState } from "react";
import PlotNav from "@/components/PlotNav";
import { getRoadmap, pathEdges, pathTopics } from "@/lib/roadmaps";

// A simulated mentee. In the real app this is a learner who named you their
// guardian; here it's seeded so the plot is populated to look at.
const MENTEE = {
  name: "Aanya",
  relationship: "you're her mentor",
  roadmapId: "frontend",
  known: ["html", "css", "js", "es6", "dom"],
  inProgress: ["react"],
  // Steps she's marked done that are waiting for your sign-off.
  awaitingSignoff: ["es6", "dom"],
  lastActive: "2 hours ago",
  streakDays: 9,
};

export default function GuardianPlot() {
  const [signedOff, setSignedOff] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  const def = getRoadmap(MENTEE.roadmapId)!;

  const topics = useMemo(() => {
    const known = new Set(MENTEE.known);
    const base = pathTopics(def, known);
    return base.map((t) =>
      MENTEE.inProgress.includes(t.id) && t.progress !== "known"
        ? { ...t, progress: "in_progress" as const }
        : t,
    );
  }, [def]);

  const edges = useMemo(() => pathEdges(def), [def]);
  const statuses = engine.computeStatuses({ topics, edges });
  const percent = engine.progressPercent(topics);

  const learned = topics.filter((t) => t.progress === "known");
  const current = topics.filter(
    (t) => t.progress === "in_progress" || statuses.get(t.id) === "available",
  );
  const pendingSignoff = MENTEE.awaitingSignoff.filter((id) => !signedOff.has(id));

  function signOff(id: string) {
    setSignedOff((s) => new Set(s).add(id));
    setToast(`Signed off: ${title(id)}`);
    window.setTimeout(() => setToast(null), 2400);
  }
  function nudge() {
    setToast(`Nudge sent to ${MENTEE.name} ✦`);
    window.setTimeout(() => setToast(null), 2400);
  }
  function title(id: string) {
    return def.path.find((s) => s.id === id)?.title ?? id;
  }

  return (
    <div className="min-h-screen bg-forest-950 text-parchment">
      <header className="flex items-center justify-between border-b border-forest-800/70 px-5 py-3">
        <a href="/" className="flex items-center gap-2 font-bold">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-forest-600 text-sm">A</span> ABH
        </a>
        <PlotNav active="guardian" />
      </header>

      <div className="mx-auto max-w-5xl px-5 py-10">
        {/* Learner header */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-forest-500 to-forest-700 text-xl font-bold">
              {MENTEE.name[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{MENTEE.name}</h1>
              <p className="text-sm text-forest-300">
                Following <span className="text-parchment">{def.title}</span> · {MENTEE.relationship}
              </p>
            </div>
          </div>
          <button onClick={nudge} className="rounded-lg border border-forest-700 px-4 py-2.5 text-sm font-semibold text-forest-100 transition hover:bg-forest-900">
            Send a nudge
          </button>
        </div>

        {/* Stat row */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-forest-700/60 bg-forest-900/40 p-5">
            <div className="text-sm text-forest-300">Progress</div>
            <div className="mt-1 text-3xl font-bold">{percent}%</div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-forest-800">
              <div className="h-full rounded-full bg-amber" style={{ width: `${percent}%` }} />
            </div>
            <div className="mt-2 text-xs text-forest-400">
              {learned.length} of {topics.length} topics known
            </div>
          </div>
          <div className="rounded-2xl border border-forest-700/60 bg-forest-900/40 p-5">
            <div className="text-sm text-forest-300">Streak</div>
            <div className="mt-1 text-3xl font-bold">{MENTEE.streakDays} days</div>
            <div className="mt-3 text-xs text-forest-400">Last active {MENTEE.lastActive}</div>
          </div>
          <div className="rounded-2xl border border-forest-700/60 bg-forest-900/40 p-5">
            <div className="text-sm text-forest-300">Awaiting your sign-off</div>
            <div className="mt-1 text-3xl font-bold">{pendingSignoff.length}</div>
            <div className="mt-3 text-xs text-forest-400">
              {pendingSignoff.length ? "Confirm what she's completed" : "All caught up"}
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* Sign-off queue */}
          <section className="rounded-2xl border border-forest-700/60 bg-forest-900/30 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-amber">Needs your sign-off</h2>
            <p className="mt-1 text-xs text-forest-400">Real work, confirmed by someone who matters.</p>
            <div className="mt-4 flex flex-col gap-2">
              {pendingSignoff.length === 0 && (
                <p className="rounded-lg border border-forest-800 bg-forest-950/50 px-3 py-4 text-center text-sm text-forest-400">
                  Nothing pending — nicely done.
                </p>
              )}
              {pendingSignoff.map((id) => (
                <div key={id} className="flex items-center justify-between rounded-lg border border-forest-800 bg-forest-950/40 px-3 py-2.5">
                  <span className="text-sm">{title(id)}</span>
                  <button onClick={() => signOff(id)} className="rounded-md bg-forest-600 px-3 py-1.5 text-xs font-semibold text-parchment transition hover:bg-forest-500">
                    Sign off
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Timeline + current */}
          <section className="rounded-2xl border border-forest-700/60 bg-forest-900/30 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-amber">Currently learning</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {current.map((t) => (
                <span key={t.id} className="rounded-full border border-forest-700 bg-forest-900/60 px-3 py-1 text-xs">
                  {t.title}
                </span>
              ))}
            </div>
            <h2 className="mt-6 text-sm font-semibold uppercase tracking-wider text-amber">Recently learned</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {learned.slice(-5).reverse().map((t: Topic) => (
                <li key={t.id} className="flex items-center gap-2.5 text-sm text-forest-200">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-forest-700 text-[10px]">✓</span>
                  {t.title}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <p className="mt-8 text-center text-xs text-forest-500">
          You&apos;ll be told when {MENTEE.name} slips — no need to check in.
        </p>
      </div>

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 rounded-lg border border-amber/40 bg-forest-900/95 px-4 py-2.5 text-sm text-amber-soft shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
