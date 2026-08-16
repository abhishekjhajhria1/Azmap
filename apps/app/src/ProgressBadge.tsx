import { streakIsLive, type Profile } from "@abh/core";
import { useAbh } from "@abh/ui";
import { Flame } from "lucide-react";

/**
 * Accumulated value, always visible — the "investment" half of the habit loop.
 * The map is the thing the user is building; showing it grow is what makes it
 * feel like a possession worth returning to.
 *
 * Honest by design: no fake counters, and a lapsed streak is shown quietly
 * rather than used to guilt anyone.
 */
export function ProgressBadge({ compact = false }: { compact?: boolean }) {
  const topics = useAbh((s) => s.topics);
  const profile = useAbh((s) => s.profile);
  if (topics.length === 0) return null;

  const known = topics.filter((t) => t.progress === "known").length;
  const percent = Math.round((known / topics.length) * 100);
  const live = profile ? streakIsLive(profile as Profile) : false;
  const streak = profile?.streakDays ?? 0;

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-[11px] text-muted">
        <span className="font-medium text-fg">{percent}%</span>
        {streak > 0 && (
          <span className={`flex items-center gap-1 ${live ? "text-accent" : "text-subtle"}`}>
            <Flame size={12} />
            {streak}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="w-full px-1">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-medium text-muted">{known} of {topics.length} known</span>
        <span className="text-[11px] font-semibold text-fg">{percent}%</span>
      </div>
      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-accent transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      {streak > 0 && (
        <div
          className={`mt-2 flex items-center gap-1.5 text-[11px] ${live ? "text-accent" : "text-subtle"}`}
          title={live ? "Streak is live — learn something today to keep it" : "Streak paused — pick it back up any time"}
        >
          <Flame size={12} />
          <span className="font-medium">{streak}-day streak</span>
        </div>
      )}
    </div>
  );
}
