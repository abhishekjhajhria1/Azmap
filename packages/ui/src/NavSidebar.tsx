"use client";

/**
 * NavSidebar — the desktop navigation.
 *
 * A floating glass rail, inset from the window edge like every other piece of
 * chrome, with the content scrolling in its own column beside it. Same material
 * as `FloatingDock`, so the two navigations read as one product wearing
 * different shapes for different screens.
 *
 * What earns its place here is **context, not just links**. A dock can only
 * show four destinations; a rail can keep what you're working on permanently in
 * view — the roadmap you're following with its progress, the captures you
 * haven't filed yet — which is the difference between navigation and a
 * workspace. Sections are supplied by the app, so this component stays a shell.
 *
 * Collapsed, it drops to a 68px icon rail. The active indicator is a lozenge
 * measured from the live DOM (same technique as the dock), animated with
 * transform only so it stays cheap over a running WebGL canvas.
 */

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import type { DockItem } from "./FloatingDock.js";

export interface RailSection {
  id: string;
  /** Uppercase label above the rows. Omit for an unlabelled block. */
  title?: string;
  /** Hidden when collapsed — icon-only rows can't carry this much meaning. */
  children: ReactNode;
}

export interface NavSidebarProps {
  items: DockItem[];
  activeId: string;
  onSelect: (id: string) => void;
  /** Brand mark / account button at the top. */
  brand?: ReactNode;
  /** Context blocks below the destinations: active roadmap, recent captures… */
  sections?: RailSection[];
  /** Pinned to the bottom — sync status, theme toggle. */
  footer?: ReactNode;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function NavSidebar({
  items,
  activeId,
  onSelect,
  brand,
  sections = [],
  footer,
  collapsed = false,
  onCollapsedChange,
}: NavSidebarProps): ReactElement {
  const listRef = useRef<HTMLDivElement>(null);
  const [lozenge, setLozenge] = useState<{ y: number; h: number } | null>(null);

  // Measure the active row so the indicator fits any label at any font size.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const el = list.querySelector<HTMLElement>(`[data-rail-id="${activeId}"]`);
      if (!el) return;
      setLozenge({ y: el.offsetTop, h: el.offsetHeight });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    return () => ro.disconnect();
  }, [activeId, items, collapsed]);

  return (
    <nav
      aria-label="Main"
      className="rail"
      style={{
        position: "fixed",
        left: "var(--float-inset)",
        top: "var(--float-inset)",
        bottom: "var(--float-inset)",
        width: collapsed ? "var(--rail-w-collapsed)" : "var(--rail-w)",
        zIndex: 40,
        // Width is the one non-transform transition allowed here: it drives a
        // layout change the content column has to follow, and there is no
        // transform that expresses it.
        transition: "width 220ms cubic-bezier(.4,0,.2,1)",
      }}
    >
      {/* Brand + collapse control */}
      <div
        className="flex items-center gap-2 px-3 pt-3"
        style={{ justifyContent: collapsed ? "center" : "space-between" }}
      >
        {!collapsed && brand}
        <button
          onClick={() => onCollapsedChange?.(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="pressable grid h-8 w-8 shrink-0 place-items-center rounded-[10px] text-subtle hover:bg-[color-mix(in_srgb,var(--fg)_6%,transparent)] hover:text-fg"
        >
          {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>
      </div>

      {/* Destinations */}
      <div ref={listRef} className="relative mt-3 px-2">
        {lozenge && (
          <span
            aria-hidden
            className="absolute left-2 right-2 rounded-[12px] bg-[color-mix(in_srgb,var(--accent)_13%,transparent)]"
            style={{
              height: lozenge.h,
              transform: `translateY(${lozenge.y}px)`,
              transition: "transform 260ms cubic-bezier(.4,0,.2,1), height 200ms ease",
            }}
          />
        )}
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <button
              key={item.id}
              data-rail-id={item.id}
              onClick={() => onSelect(item.id)}
              aria-current={active ? "page" : undefined}
              title={collapsed ? item.label : undefined}
              className="relative flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left transition-colors"
              style={{
                color: active ? "var(--accent)" : "var(--fg-muted)",
                fontWeight: active ? 600 : 500,
                fontSize: "var(--t-tight)",
                justifyContent: collapsed ? "center" : undefined,
              }}
            >
              <span className="grid shrink-0 place-items-center">{item.icon}</span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </div>

      {/* Context — the part a dock cannot do. Hidden when collapsed, because an
          icon rail has no room to say anything true about it. */}
      {!collapsed && sections.length > 0 && (
        <div className="mt-2 min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {sections.map((section) => (
            <section key={section.id} className="mt-5 first:mt-3">
              {section.title && (
                <h2 className="t-eyebrow px-3 pb-1.5">{section.title}</h2>
              )}
              {section.children}
            </section>
          ))}
        </div>
      )}
      {(collapsed || sections.length === 0) && <div className="flex-1" />}

      {footer && (
        <div
          className="border-t px-3 py-2.5"
          style={{
            borderColor: "var(--seam)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            justifyContent: collapsed ? "center" : "space-between",
          }}
        >
          {footer}
        </div>
      )}
    </nav>
  );
}

/** Width the content column must clear, in px. */
export function railWidth(collapsed: boolean): number {
  return collapsed ? 68 : 264;
}
