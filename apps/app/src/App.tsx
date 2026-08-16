import { AdaptiveShell, type DockItem, type DockPosition, FloatingDock, ThemeToggle, useAbh } from "@abh/ui";
import { Brain, Compass, Inbox, Users } from "lucide-react";
import { type ReactElement, useState } from "react";
import { ProgressBadge } from "./ProgressBadge";
import { OmniBar } from "./OmniBar";
import { Onboarding } from "./Onboarding";
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
  { item: { id: "guardian", label: "Guardian", icon: <Users {...ICON} /> }, render: () => <GuardianSpace /> },
];

export function App() {
  const ready = useAbh((s) => s.ready);
  const profile = useAbh((s) => s.profile);
  const [space, setSpace] = useState<SpaceId>("brain");
  // Set when the omni-bar jumps straight to a topic, so the Brain space can
  // open its inspector on arrival.
  const [focusTopicId, setFocusTopicId] = useState<string | null>(null);

  if (!ready) {
    return <div className="grid h-[100dvh] place-items-center text-subtle">Loading your map…</div>;
  }

  if (!profile || !profile.onboardedAt) {
    return <Onboarding onComplete={(s) => setSpace(s)} />;
  }

  const active = SPACES.find((s) => s.item.id === space) ?? SPACES[0]!;

  const dockPosition = (profile?.dockPosition ?? "auto") as DockPosition;

  return (
    <>
      <AdaptiveShell dockPosition={dockPosition}>
        <div className="h-full">
          {active.render({ focusTopicId, onFocusHandled: () => setFocusTopicId(null) })}
        </div>
      </AdaptiveShell>

      <FloatingDock
        items={SPACES.map((s) => s.item)}
        activeId={space}
        onSelect={(id) => setSpace(id as SpaceId)}
        position={dockPosition}
        brand={
          <span className="grid h-7 w-7 place-items-center rounded-[9px] bg-accent text-[13px] font-bold text-accent-ink">
            A
          </span>
        }
        trailing={
          <>
            <ProgressBadge compact />
            <ThemeToggle />
          </>
        }
      />

      <OmniBar
        onGoToSpace={(id) => setSpace(id as SpaceId)}
        onSelectTopic={(id) => setFocusTopicId(id)}
      />
    </>
  );
}
