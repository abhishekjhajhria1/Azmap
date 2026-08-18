import { useAbh } from "@abh/ui";
import { Brain, Compass } from "lucide-react";
import { useState } from "react";

/**
 * First-run onboarding — a real local profile, no login. Name yourself, then
 * choose where to begin: a focused roadmap, or straight into your mind map.
 */
export function Onboarding({ onComplete }: { onComplete: (space: "roadmap" | "brain") => void }) {
  const updateProfile = useAbh((s) => s.updateProfile);
  const [name, setName] = useState("");
  const [step, setStep] = useState<"name" | "choose">("name");

  async function finish(space: "roadmap" | "brain") {
    await updateProfile({ name: name.trim(), onboardedAt: Date.now() });
    onComplete(space);
  }

  return (
    <div className="grid min-h-[100dvh] place-items-center bg-bg px-5">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-lg font-bold text-accent-ink">A</span>
          <span className="text-lg font-semibold">ABH</span>
        </div>

        {step === "name" ? (
          <div className="animate-[fadeIn_.4s_ease]">
            <h1 className="text-3xl font-bold leading-tight">Everything you learn, on one map that grows with you.</h1>
            <p className="mt-3 text-muted">Let's start with your name — your map lives on this device, no account needed.</p>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && name.trim() && setStep("choose")}
              placeholder="Your name"
              className="mt-6 w-full rounded-xl border border-hairline bg-surface px-4 py-3 text-lg outline-none placeholder:text-subtle focus:border-accent"
            />
            <button
              onClick={() => name.trim() && setStep("choose")}
              disabled={!name.trim()}
              className="mt-4 w-full rounded-xl bg-accent py-3 font-semibold text-accent-ink transition hover:brightness-110 disabled:opacity-40"
            >
              Continue
            </button>
          </div>
        ) : (
          <div className="animate-[fadeIn_.4s_ease]">
            <h1 className="text-2xl font-bold">Where do you want to begin, {name.trim() || "friend"}?</h1>
            <p className="mt-2 text-muted">You can always do both — everything you learn ends up on the same map.</p>
            <div className="mt-6 grid gap-3">
              <button onClick={() => finish("roadmap")} className="glass flex items-start gap-4 rounded-2xl p-5 text-left transition hover:-translate-y-0.5 hover:border-accent">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent"><Compass size={22} /></span>
                <span>
                  <span className="block text-lg font-semibold">Follow a roadmap</span>
                  <span className="mt-1 block text-sm text-muted">Learn one thing, distraction-free. A focused path that reveals as you go.</span>
                </span>
              </button>
              <button onClick={() => finish("brain")} className="glass flex items-start gap-4 rounded-2xl p-5 text-left transition hover:-translate-y-0.5 hover:border-accent">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ai/15 text-ai"><Brain size={22} /></span>
                <span>
                  <span className="block text-lg font-semibold">Open my mind map</span>
                  <span className="mt-1 block text-sm text-muted">Your second brain — explore freely, ask anything, connect everything.</span>
                </span>
              </button>
            </div>
            <button onClick={() => setStep("name")} className="mt-4 text-sm text-subtle hover:text-fg">← back</button>
          </div>
        )}
      </div>
    </div>
  );
}
