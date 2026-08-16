import { useAbh } from "@abh/ui";
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
    <div className="grid min-h-[100dvh] place-items-center bg-forest-950 px-5">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-forest-600 text-lg font-bold">A</span>
          <span className="text-lg font-semibold">ABH</span>
        </div>

        {step === "name" ? (
          <div className="animate-[fadeIn_.4s_ease]">
            <h1 className="text-3xl font-bold leading-tight">Everything you learn, on one map that grows with you.</h1>
            <p className="mt-3 text-forest-300">Let's start with your name — your map lives on this device, no account needed.</p>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && name.trim() && setStep("choose")}
              placeholder="Your name"
              className="mt-6 w-full rounded-xl border border-forest-700 bg-forest-900 px-4 py-3 text-lg outline-none placeholder:text-forest-600 focus:border-amber"
            />
            <button
              onClick={() => name.trim() && setStep("choose")}
              disabled={!name.trim()}
              className="mt-4 w-full rounded-xl bg-amber py-3 font-semibold text-forest-950 transition hover:bg-amber-soft disabled:opacity-40"
            >
              Continue
            </button>
          </div>
        ) : (
          <div className="animate-[fadeIn_.4s_ease]">
            <h1 className="text-2xl font-bold">Where do you want to begin, {name.trim() || "friend"}?</h1>
            <p className="mt-2 text-forest-300">You can always do both — everything you learn ends up on the same map.</p>
            <div className="mt-6 grid gap-3">
              <button onClick={() => finish("roadmap")} className="rounded-2xl border border-forest-700 bg-forest-900/50 p-5 text-left transition hover:border-amber/50 hover:bg-forest-900">
                <div className="text-lg font-semibold">🧭 Follow a roadmap</div>
                <div className="mt-1 text-sm text-forest-300">Learn one thing, distraction-free. A focused path that reveals as you go.</div>
              </button>
              <button onClick={() => finish("brain")} className="rounded-2xl border border-forest-700 bg-forest-900/50 p-5 text-left transition hover:border-amber/50 hover:bg-forest-900">
                <div className="text-lg font-semibold">🧠 Open my mind map</div>
                <div className="mt-1 text-sm text-forest-300">Your second brain — explore freely, ask anything, connect everything.</div>
              </button>
            </div>
            <button onClick={() => setStep("name")} className="mt-4 text-sm text-forest-500 hover:text-parchment">← back</button>
          </div>
        )}
      </div>
    </div>
  );
}
