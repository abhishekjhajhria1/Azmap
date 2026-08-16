"use client";

/**
 * Canonical breakpoints — the single spec shared by the web app (here) and the
 * Flutter app (which mirrors these dp values). Drives the whole adaptive shell.
 */

import { useEffect, useState } from "react";

export type Size = "compact" | "medium" | "expanded";

/** Widths in CSS px (== dp on the web). Compact < 600 ≤ Medium < 840 ≤ Expanded. */
export const BREAKPOINTS = { medium: 600, expanded: 840 } as const;

export function sizeForWidth(width: number): Size {
  if (width >= BREAKPOINTS.expanded) return "expanded";
  if (width >= BREAKPOINTS.medium) return "medium";
  return "compact";
}

/**
 * Reactive breakpoint. Recomputes on resize so iPad multitasking (Split View /
 * Stage Manager) and foldable fold/unfold are handled at runtime, not just at
 * load.
 */
export function useBreakpoint(): Size {
  const [size, setSize] = useState<Size>(() =>
    typeof window === "undefined" ? "expanded" : sizeForWidth(window.innerWidth),
  );
  useEffect(() => {
    const onResize = () => setSize(sizeForWidth(window.innerWidth));
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return size;
}
