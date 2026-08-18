import {
  AdaptiveShell,
  FloatingDock,
  ThemeToggle,
  useAbh,
  useResolvedNav,
  type DockItem,
  type DockPosition,
  type NavLayout,
} from "@abh/ui";
import { Brain, Compass, Inbox, Users } from "lucide-react";
import { type ReactElement, useState } from "react";
import { DeviceSheet } from "./DeviceSheet";
import { ProgressBadge } from "./ProgressBadge";
import { OmniBar } from "./OmniBar";
import { Onboarding } from "./Onboarding";
import { Rail } from "./Rail";
import { BrainSpace } from "./spaces/BrainSpace";
import { CaptureSpace } from "./spaces/CaptureSpace";
import { GuardianSpace } from "./spaces/GuardianSpace";
import { RoadmapSpace } from "./spaces/RoadmapSpace";

type SpaceId = "brain" | "roadmap" | "capture" | "guardian";

// Spaces are a registry — adding a use case later is one entry + one component.
const ICON = { size: 18, strokeWidth: 2 } as const;

interface SpaceProps {
  focusTopicId?: string | null;
  onFocusHandled?: () => void;
}

const SPACES: { item: DockItem; render: (p: SpaceProps) => ReactElement }[] = [
  { item: { id: "brain", label: "Brain", icon: <Brain {...ICON} /> }, render: (p) => <BrainSpace {...p} /> },
  { item: { id: "roadmap", label: "Roadmap", icon: <Compass {...ICON} /> }, render: () => <RoadmapSpace /> },
  { item: { id: "capture", label: "Capture", icon: <Inbox {...ICON} /> }, render: () => <CaptureSpace /> },
  { item: { id: "guardian", label: "People", icon: <Users {...ICON} /> }, render: () => <GuardianSpace /> },
];

/** Rail collapse is a per-device view preference, not account data. */
const RAIL_KEY = "abh:rail-collapsed";

export function App() {
  const ready = useAbh((s) => s.ready);
  const profile = useAbh((s) => s.profile);
  const [space, setSpace] = useState<SpaceId>("brain");
  // Set when the omni-bar jumps straight to a topic, so the Brain space can
  // open its inspector on arrival.
  const [focusTopicId, setFocusTopicId] = useState<string | null>(null);
  const [devicesOpen, setDevicesOpen] = useState(false);
  const [railCollapsed, setRailCollapsed] = useState(
    () => globalThis.localStorage?.getItem(RAIL_KEY) === "1",
  );

  const navLayout = (profile?.navLayout ?? "sidebar") as NavLayout;
  const nav = useResolvedNav(navLayout);

  if (!ready) {
    return <div className="grid h-[100dvh] place-items-center text-subtle">Loading your map…</div>;
  }

  if (!profile || !profile.onboardedAt) {
    return <Onboarding onComplete={(s) => setSpace(s)} />;
  }

  const active = SPACES.find((s) => s.item.id === space) ?? SPACES[0]!;
  const dockPosition = (profile?.dockPosition ?? "auto") as DockPosition;

  function collapseRail(v: boolean) {
    setRailCollapsed(v);
    globalThis.localStorage?.setItem(RAIL_KEY, v ? "1" : "0");
  }

  function goToSpace(id: string) {
    setSpace(id as SpaceId);
  }

  return (
    <>
      <AdaptiveShell
        dockPosition={dockPosition}
        navLayout={navLayout}
        railCollapsed={railCollapsed}
      >
        {/* Keyed so each space fades in on its own — the document moves, the
            chrome never does. */}
        <div key={space} className="h-full animate-[spaceIn_180ms_cubic-bezier(.4,0,.2,1)]">
          {active.render({ focusTopicId, onFocusHandled: () => setFocusTopicId(null) })}
        </div>
      </AdaptiveShell>

      {nav === "sidebar" ? (
        <Rail
          items={SPACES.map((s) => s.item)}
          activeId={space}
          onSelect={goToSpace}
          onOpenDevices={() => setDevicesOpen(true)}
          onSelectTopic={(id) => {
            setFocusTopicId(id);
            setSpace("brain");
          }}
          collapsed={railCollapsed}
          onCollapsedChange={collapseRail}
        />
      ) : (
        <FloatingDock
          items={SPACES.map((s) => s.item)}
          activeId={space}
          onSelect={goToSpace}
          position={dockPosition}
          brand={
            <button
              onClick={() => setDevicesOpen(true)}
              aria-label="Your devices and account"
              title="Your devices"
              className="pressable grid h-7 w-7 place-items-center rounded-[9px] bg-accent text-[13px] font-bold text-accent-ink"
            >
              A
            </button>
          }
          trailing={
            <>
              <ProgressBadge compact />
              <ThemeToggle />
            </>
          }
        />
      )}

      <OmniBar
        onGoToSpace={goToSpace}
        onSelectTopic={(id) => setFocusTopicId(id)}
        onOpenDevices={() => setDevicesOpen(true)}
      />

      {devicesOpen && <DeviceSheet onClose={() => setDevicesOpen(false)} />}
    </>
  );
}
