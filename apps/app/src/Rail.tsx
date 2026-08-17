import { getRoadmap } from "@abh/core";
import { NavSidebar, ThemeToggle, useAbh, type DockItem, type RailSection } from "@abh/ui";
import { Cloud, CloudOff, Globe, Inbox, Loader2, StickyNote, TriangleAlert } from "lucide-react";
import { useMemo, type ReactElement } from "react";

/**
 * The app's sidebar content.
 *
 * `NavSidebar` is a shell; this is what makes it worth having. Below the four
 * destinations it keeps the two things you are actually in the middle of — the
 * roadmap you're following, and the captures you haven't filed — permanently
 * visible. That's the difference between navigation and a workspace, and it's
 * the reason a rail beats a dock on a screen with room for one.
 */
export function Rail({
  items,
  activeId,
  onSelect,
  onOpenDevices,
  onSelectTopic,
  collapsed,
  onCollapsedChange,
}: {
  items: DockItem[];
  activeId: string;
  onSelect: (id: string) => void;
  onOpenDevices: () => void;
  onSelectTopic: (id: string) => void;
  collapsed: boolean;
  onCollapsedChange: (v: boolean) => void;
}): ReactElement {
  const profile = useAbh((s) => s.profile);
  const topics = useAbh((s) => s.topics);
  const captures = useAbh((s) => s.captures);
  const sync = useAbh((s) => s.sync);

  const def = profile?.activeRoadmapId ? getRoadmap(profile.activeRoadmapId) : null;

  const progress = useMemo(() => {
    if (!def) return null;
    const ids = new Set(def.path.map((s) => `${def.id}__${s.id}`));
    const mine = topics.filter((t) => ids.has(t.id));
    const known = mine.filter((t) => t.progress === "known").length;
    return { known, total: def.path.length };
  }, [def, topics]);

  const recent = useMemo(
    () => [...captures].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5),
    [captures],
  );

  const sections: RailSection[] = [];

  if (def && progress) {
    sections.push({
      id: "following",
      title: "Following",
      children: (
        <button
          onClick={() => onSelect("roadmap")}
          className="w-full rounded-[12px] px-3 py-2.5 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--fg)_5%,transparent)]"
        >
          <div className="truncate text-[13.5px] font-semibold">{def.title}</div>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-[4px] flex-1 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out"
                style={{ width: `${Math.round((progress.known / Math.max(1, progress.total)) * 100)}%` }}
              />
            </div>
            <span className="t-meta shrink-0">
              {progress.known}/{progress.total}
            </span>
          </div>
        </button>
      ),
    });
  }

  if (recent.length > 0) {
    sections.push({
      id: "captures",
      title: "Recent captures",
      children: (
        <div>
          {recent.map((c) => {
            const Icon = c.kind === "note" ? StickyNote : Globe;
            return (
              <button
                key={c.id}
                onClick={() => onSelect("capture")}
                className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-1.5 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--fg)_5%,transparent)]"
              >
                <Icon size={13} className="shrink-0 text-subtle" />
                <span className="truncate text-[13px] text-muted">
                  {c.title || c.url || "Untitled"}
                </span>
              </button>
            );
          })}
        </div>
      ),
    });
  }

  // A rail with nothing in it is worse than no rail — say what will fill it.
  if (sections.length === 0) {
    sections.push({
      id: "empty",
      children: (
        <div className="px-3 py-2">
          <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-[color-mix(in_srgb,var(--accent)_11%,transparent)] text-accent">
            <Inbox size={17} strokeWidth={1.75} />
          </span>
          <p className="mt-2.5 text-[13px] leading-relaxed text-muted">
            Start a roadmap or capture something — what you&apos;re working on shows up here.
          </p>
        </div>
      ),
    });
  }

  const starred = useMemo(
    () => topics.filter((t) => t.progress === "in_progress").slice(0, 4),
    [topics],
  );
  if (starred.length > 0) {
    sections.push({
      id: "in-progress",
      title: "In progress",
      children: (
        <div>
          {starred.map((t) => (
            <button
              key={t.id}
              onClick={() => onSelectTopic(t.id)}
              className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-1.5 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--fg)_5%,transparent)]"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span className="truncate text-[13px] text-muted">{t.title}</span>
            </button>
          ))}
        </div>
      ),
    });
  }

  return (
    <NavSidebar
      items={items}
      activeId={activeId}
      onSelect={onSelect}
      sections={sections}
      collapsed={collapsed}
      onCollapsedChange={onCollapsedChange}
      brand={
        <button
          onClick={onOpenDevices}
          title="Your devices"
          aria-label="Your devices and account"
          className="pressable flex items-center gap-2 rounded-[10px] px-1 py-1 text-left"
        >
          <span className="grid h-7 w-7 place-items-center rounded-[9px] bg-accent text-[13px] font-bold text-accent-ink">
            A
          </span>
          <span className="truncate text-[14px] font-semibold">
            {profile?.name || "ABH"}
          </span>
        </button>
      }
      footer={
        <>
          <SyncPip status={sync?.status ?? null} pending={sync?.pending ?? 0} collapsed={collapsed} />
          <ThemeToggle />
        </>
      }
    />
  );
}

/** Sync state as one quiet line. Offline is normal here, not a failure. */
function SyncPip({
  status,
  pending,
  collapsed,
}: {
  status: string | null;
  pending: number;
  collapsed: boolean;
}) {
  if (!status) return <span />;
  const icon =
    status === "syncing" ? <Loader2 size={13} className="animate-spin text-accent" /> :
    status === "error" ? <TriangleAlert size={13} style={{ color: "var(--danger)" }} /> :
    status === "offline" ? <CloudOff size={13} /> :
    <Cloud size={13} className="text-known" />;

  // "26 to sync" reads as a backlog you're failing to clear. Until a device is
  // paired there is nowhere to sync *to*, and that is the normal, intended
  // state — so say what's true: the work is safe on this device.
  const label =
    status === "syncing" ? "Syncing…" :
    status === "error" ? "Sync failed — will retry" :
    status === "offline" ? "Saved on this device" :
    pending > 0 ? `${pending} to sync` :
    "Up to date";

  return (
    <span
      className="t-meta flex min-w-0 items-center gap-1.5"
      title={collapsed ? label : undefined}
    >
      {icon}
      {!collapsed && <span className="truncate">{label}</span>}
    </span>
  );
}
