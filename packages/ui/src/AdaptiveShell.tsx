"use client";

/**
 * AdaptiveShell — one nav that becomes the right thing at every size:
 *   compact  → bottom navigation bar (glass)
 *   medium   → left navigation rail (foldable unfolded / small tablet)
 *   expanded → permanent left sidebar (tablet / iPad / desktop)
 *
 * All colours come from theme tokens, and the nav is a frosted-glass surface,
 * so it follows light/dark automatically. The Flutter app mirrors this exact
 * bottom-nav ↔ rail ↔ sidebar progression.
 */

import type { CSSProperties, ReactNode } from "react";
import { useBreakpoint } from "./breakpoints.js";

export interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
}

interface Props {
  items: NavItem[];
  activeId: string;
  onSelect: (id: string) => void;
  brand?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}

const glass: CSSProperties = {
  background: "var(--glass-bg)",
  WebkitBackdropFilter: "saturate(180%) blur(var(--glass-blur))",
  backdropFilter: "saturate(180%) blur(var(--glass-blur))",
};

export function AdaptiveShell({ items, activeId, onSelect, brand, action, children }: Props) {
  const size = useBreakpoint();
  const compact = size === "compact";
  const expanded = size === "expanded";

  if (compact) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100dvh", color: "var(--fg)" }}>
        <div style={{ flex: 1, minHeight: 0, position: "relative" }}>{children}</div>
        <nav style={{ ...glass, display: "flex", borderTop: "1px solid var(--glass-border)", paddingBottom: "env(safe-area-inset-bottom)" }}>
          {items.map((it) => (
            <button
              key={it.id}
              onClick={() => onSelect(it.id)}
              style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                padding: "8px 4px", border: "none", background: "none", cursor: "pointer",
                color: it.id === activeId ? "var(--fg)" : "var(--fg-subtle)", fontSize: 11,
              }}
            >
              <span style={{ fontSize: 18, lineHeight: 1, opacity: it.id === activeId ? 1 : 0.7 }}>{it.icon}</span>
              {it.label}
            </button>
          ))}
        </nav>
      </div>
    );
  }

  const railWidth = expanded ? 216 : 74;
  return (
    <div style={{ display: "flex", height: "100dvh", color: "var(--fg)" }}>
      <nav style={{ ...glass, width: railWidth, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: "1px solid var(--glass-border)", padding: 12, gap: 4 }}>
        {brand && <div style={{ padding: expanded ? "6px 8px 16px" : "6px 0 16px", display: "flex", justifyContent: expanded ? "flex-start" : "center" }}>{brand}</div>}
        {items.map((it) => {
          const active = it.id === activeId;
          return (
            <button
              key={it.id}
              onClick={() => onSelect(it.id)}
              title={it.label}
              style={{
                display: "flex", alignItems: "center", gap: 11,
                justifyContent: expanded ? "flex-start" : "center",
                padding: expanded ? "10px 12px" : "11px 0", borderRadius: 12, border: "none",
                background: active ? "var(--surface-2)" : "transparent", cursor: "pointer",
                color: active ? "var(--fg)" : "var(--fg-muted)", fontSize: 14, fontWeight: 500,
                width: "100%", textAlign: "left",
              }}
            >
              <span style={{ fontSize: 18, lineHeight: 1, opacity: active ? 1 : 0.75 }}>{it.icon}</span>
              {expanded && <span>{it.label}</span>}
            </button>
          );
        })}
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8, alignItems: expanded ? "stretch" : "center" }}>{action}</div>
      </nav>
      <main style={{ flex: 1, minWidth: 0, position: "relative" }}>{children}</main>
    </div>
  );
}
