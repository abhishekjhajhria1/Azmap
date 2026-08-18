"use client";

/**
 * AdaptiveShell — the layout host.
 *
 * Navigation floats *over* this content, so the shell's only job is to give the
 * app a full-viewport canvas and reserve exactly enough room that content can
 * scroll past the chrome without ever hiding behind it.
 *
 * Which chrome depends on the device and the user's preference: a rail on the
 * left for screens with room for one, or the dock at top/bottom. Compact
 * screens always get the dock — a rail on a 390px phone is a wall, not a
 * navigation.
 */

import type { ReactNode } from "react";
import { useBreakpoint } from "./breakpoints.js";
import { resolveDockPosition, type DockPosition } from "./FloatingDock.js";
import { railWidth } from "./NavSidebar.js";

export type NavLayout = "sidebar" | "dock";

interface Props {
  children: ReactNode;
  /** Where the dock sits, so we can reserve room for it. */
  dockPosition?: DockPosition;
  /** Which navigation the user prefers on screens that can host either. */
  navLayout?: NavLayout;
  /** Whether the rail is collapsed to its icon width. */
  railCollapsed?: boolean;
}

/** Dock height + inset + a little breathing room. */
const DOCK_CLEARANCE = 84;
/**
 * On phones the omni-bar trigger also lives above the bottom edge, stacked over
 * the dock. Reserve its height too, or the last rows of a list sit underneath a
 * floating pill — which is exactly what it looked like before.
 */
const OMNI_CLEARANCE = 66;

/**
 * The rail only applies where there's width for it *and* the user wants it.
 * Exported so the app can render the matching component without re-deriving
 * the rule — one source of truth for "which navigation am I wearing".
 */
export function useResolvedNav(navLayout: NavLayout = "sidebar"): NavLayout {
  const size = useBreakpoint();
  return size === "expanded" && navLayout === "sidebar" ? "sidebar" : "dock";
}

export function AdaptiveShell({
  children,
  dockPosition = "auto",
  navLayout = "sidebar",
  railCollapsed = false,
}: Props) {
  const compact = useBreakpoint() === "compact";
  const nav = useResolvedNav(navLayout);
  const place = resolveDockPosition(dockPosition, compact);
  const rail = nav === "sidebar";

  return (
    <div
      style={{
        height: "100dvh",
        overflow: "hidden",
        color: "var(--fg)",
        paddingTop: !rail && place === "top" ? DOCK_CLEARANCE : 0,
        paddingBottom:
          !rail && place === "bottom"
            ? DOCK_CLEARANCE + (compact ? OMNI_CLEARANCE : 0)
            : 0,
        // The rail floats at --float-inset, so the content clears its width
        // plus that inset on both of its sides.
        paddingLeft: rail ? railWidth(railCollapsed) + 24 : 0,
        boxSizing: "border-box",
        transition: "padding-left 220ms cubic-bezier(.4,0,.2,1)",
      }}
    >
      <main style={{ position: "relative", height: "100%", minHeight: 0 }}>{children}</main>
    </div>
  );
}
