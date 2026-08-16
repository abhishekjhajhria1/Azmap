"use client";

/**
 * AdaptiveShell — the layout host.
 *
 * Navigation lives in the FloatingDock, which floats *over* this content, so
 * the shell's only job is to give the app a full-viewport canvas and reserve
 * enough padding that content can scroll under the dock without ever being
 * hidden behind it.
 */

import type { ReactNode } from "react";
import { useBreakpoint } from "./breakpoints.js";
import { resolveDockPosition, type DockPosition } from "./FloatingDock.js";

interface Props {
  children: ReactNode;
  /** Where the dock sits, so we can reserve room for it. */
  dockPosition?: DockPosition;
}

/** Dock height + inset + a little breathing room. */
const DOCK_CLEARANCE = 84;

export function AdaptiveShell({ children, dockPosition = "auto" }: Props) {
  const compact = useBreakpoint() === "compact";
  const place = resolveDockPosition(dockPosition, compact);

  return (
    <div
      style={{
        height: "100dvh",
        overflow: "hidden",
        color: "var(--fg)",
        paddingTop: place === "top" ? DOCK_CLEARANCE : 0,
        paddingBottom: place === "bottom" ? DOCK_CLEARANCE : 0,
        boxSizing: "border-box",
      }}
    >
      <main style={{ position: "relative", height: "100%", minHeight: 0 }}>{children}</main>
    </div>
  );
}
