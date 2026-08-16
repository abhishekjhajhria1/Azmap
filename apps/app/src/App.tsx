import { AdaptiveShell, type NavItem, ThemeToggle, useAbh } from "@abh/ui";
import { type ReactElement, useState } from "react";
import { AskAnything } from "./AskAnything";
import { Onboarding } from "./Onboarding";
import { BrainSpace } from "./spaces/BrainSpace";
import { CaptureSpace } from "./spaces/CaptureSpace";
import { GuardianSpace } from "./spaces/GuardianSpace";
import { RoadmapSpace } from "./spaces/RoadmapSpace";

type SpaceId = "brain" | "roadmap" | "capture" | "guardian";

// Spaces are a registry — adding a use case later is one entry + one component.
const SPACES: { item: NavItem; render: () => ReactElement }[] = [
  { item: { id: "brain", label: "Brain", icon: "🧠" }, render: () => <BrainSpace /> },
  { item: { id: "roadmap", label: "Roadmap", icon: "🧭" }, render: () => <RoadmapSpace /> },
  { item: { id: "capture", label: "Capture", icon: "📥" }, render: () => <CaptureSpace /> },
  { item: { id: "guardian", label: "Guardian", icon: "👥" }, render: () => <GuardianSpace /> },
];

export function App() {
  const ready = useAbh((s) => s.ready);
  const profile = useAbh((s) => s.profile);
  const [space, setSpace] = useState<SpaceId>("brain");

  if (!ready) {
    return <div className="grid h-[100dvh] place-items-center text-subtle">Loading your map…</div>;
  }

  if (!profile || !profile.onboardedAt) {
    return <Onboarding onComplete={(s) => setSpace(s)} />;
  }

  const active = SPACES.find((s) => s.item.id === space) ?? SPACES[0]!;

  return (
    <>
      <AdaptiveShell
        items={SPACES.map((s) => s.item)}
        activeId={space}
        onSelect={(id) => setSpace(id as SpaceId)}
        brand={<span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-sm font-bold text-accent-ink">A</span>}
        action={<ThemeToggle />}
      >
        <div className="h-full">{active.render()}</div>
      </AdaptiveShell>
      <AskAnything />
    </>
  );
}
