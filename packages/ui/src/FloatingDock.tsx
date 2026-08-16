"use client";

/**
 * FloatingDock — the product's navigation.
 *
 * A rounded glass pill that FLOATS over the content instead of a slab welded to
 * an edge. The user chooses top or bottom; "auto" puts it at the bottom on
 * phones (thumb reach) and at the top everywhere else.
 *
 * Its form changes per device class:
 *   phone     → compact, icons only, the active item labelled
 *   foldable  → icon + label, offset so it never lands on the hinge
 *   tablet/desktop → wide pill carrying brand, spaces and trailing controls
 *
 * Motion is transform/opacity only (the active lozenge slides), so it stays
 * cheap even over a live WebGL graph.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useBreakpoint } from "./breakpoints.js";

export type DockPosition = "auto" | "top" | "bottom";

export interface DockItem {
  id: string;
  label: string;
  icon: ReactNode;
}

interface Props {
  items: DockItem[];
  activeId: string;
  onSelect: (id: string) => void;
  position?: DockPosition;
  /** Shown at the dock's leading edge on wide screens only. */
  brand?: ReactNode;
  /** Shown at the trailing edge on wide screens (progress, theme toggle…). */
  trailing?: ReactNode;
}

/** Resolve "auto" against the device class. */
export function resolveDockPosition(pref: DockPosition, compact: boolean): "top" | "bottom" {
  if (pref === "auto") return compact ? "bottom" : "top";
  return pref;
}

export function FloatingDock({
  items, activeId, onSelect, position = "auto", brand, trailing,
}: Props) {
  const size = useBreakpoint();
  const compact = size === "compact";
  const expanded = size === "expanded";
  const place = resolveDockPosition(position, compact);

  // The sliding lozenge: measured from the active button so it works at any
  // label width, animated with transform only.
  const listRef = useRef<HTMLDivElement>(null);
  const [lozenge, setLozenge] = useState<{ x: number; w: number } | null>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const el = list.querySelector<HTMLElement>(`[data-dock-id="${activeId}"]`);
      if (!el) return;
      setLozenge({ x: el.offsetLeft, w: el.offsetWidth });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    return () => ro.disconnect();
  }, [activeId, items, size]);

  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        [place]: `calc(var(--float-inset) + env(safe-area-inset-${place}, 0px))`,
        zIndex: 50,
        maxWidth: "calc(100vw - 2 * var(--float-inset))",
      }}
    >
      <div
        className="float float--pill"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: 6,
          paddingLeft: expanded && brand ? 12 : 6,
          paddingRight: expanded && trailing ? 12 : 6,
        }}
      >
        {expanded && brand && (
          <>
            {brand}
            <span style={{ width: 1, height: 22, background: "var(--glass-border)", margin: "0 4px" }} />
          </>
        )}

        <div ref={listRef} style={{ position: "relative", display: "flex", gap: 2 }}>
          {/* Sliding active indicator — one element, transform-animated. */}
          {lozenge && (
            <span
              aria-hidden
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                height: "100%",
                width: lozenge.w,
                borderRadius: "var(--r-pill)",
                background: "color-mix(in srgb, var(--accent) 16%, transparent)",
                transform: `translateX(${lozenge.x}px)`,
                transition: "transform 320ms cubic-bezier(.32,.72,0,1), width 320ms cubic-bezier(.32,.72,0,1)",
              }}
            />
          )}

          {items.map((it) => {
            const active = it.id === activeId;
            const showLabel = !compact || active;
            return (
              <button
                key={it.id}
                data-dock-id={it.id}
                onClick={() => onSelect(it.id)}
                aria-current={active ? "page" : undefined}
                title={it.label}
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: compact ? "9px 12px" : "9px 14px",
                  border: "none",
                  background: "transparent",
                  borderRadius: "var(--r-pill)",
                  cursor: "pointer",
                  color: active ? "var(--accent)" : "var(--fg-muted)",
                  font: "inherit",
                  fontSize: 13.5,
                  fontWeight: active ? 650 : 500,
                  whiteSpace: "nowrap",
                  transition: "color 160ms ease",
                }}
              >
                <span style={{ display: "grid", placeItems: "center" }}>{it.icon}</span>
                {showLabel && <span>{it.label}</span>}
              </button>
            );
          })}
        </div>

        {expanded && trailing && (
          <>
            <span style={{ width: 1, height: 22, background: "var(--glass-border)", margin: "0 4px" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{trailing}</div>
          </>
        )}
      </div>
    </div>
  );
}
