import type { Topic } from "@abh/core";
import { Flame, Sparkles } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

/**
 * The payoff moment.
 *
 * Finishing one topic visibly opens several others — that cascade is the whole
 * reason the map is a graph, and it's the reward the habit loop turns on. It
 * was previously computed and thrown away; this surfaces it.
 *
 * Deliberately restrained: no confetti, no fake counters. Real progress,
 * announced well, then out of the way.
 */

interface Payload {
  unlocked: Topic[];
  streak: number;
  /** True when this activity started or extended the streak today. */
  streakAdvanced?: boolean;
}

const Ctx = createContext<(p: Payload) => void>(() => {});

export function useCelebrate() {
  return useContext(Ctx);
}

export function CelebrationProvider({ children }: { children: ReactNode }) {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [visible, setVisible] = useState(false);

  const celebrate = useCallback((p: Payload) => {
    // Nothing meaningful happened — stay quiet rather than manufacture a reward.
    if (p.unlocked.length === 0 && !p.streakAdvanced) return;
    setPayload(p);
    setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const hide = window.setTimeout(() => setVisible(false), 4200);
    const clear = window.setTimeout(() => setPayload(null), 4600);
    return () => {
      window.clearTimeout(hide);
      window.clearTimeout(clear);
    };
  }, [visible, payload]);

  return (
    <Ctx.Provider value={celebrate}>
      {children}
      {payload && (
        <div
          role="status"
          aria-live="polite"
          onClick={() => setVisible(false)}
          className={`pointer-events-auto fixed left-1/2 z-[60] w-[min(92vw,26rem)] -translate-x-1/2 cursor-pointer transition-all duration-300 ease-out ${
            visible ? "bottom-24 opacity-100 md:bottom-8" : "bottom-16 opacity-0 md:bottom-2"
          }`}
        >
          <div className="glass rounded-2xl px-4 py-3.5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent">
                <Sparkles size={18} />
              </span>
              <div className="min-w-0 flex-1">
                {payload.unlocked.length > 0 ? (
                  <>
                    <div className="text-sm font-semibold">
                      You unlocked {payload.unlocked.length}{" "}
                      {payload.unlocked.length === 1 ? "topic" : "topics"}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {payload.unlocked.slice(0, 4).map((t) => (
                        <span
                          key={t.id}
                          className="rounded-full bg-accent/12 px-2.5 py-1 text-[11px] font-medium text-accent"
                        >
                          {t.title}
                        </span>
                      ))}
                      {payload.unlocked.length > 4 && (
                        <span className="px-1 py-1 text-[11px] text-subtle">
                          +{payload.unlocked.length - 4} more
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-sm font-semibold">Nice — that's another one known</div>
                )}

                {payload.streak > 1 && (
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted">
                    <Flame size={13} className="text-accent" />
                    {payload.streak}-day streak
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
