"use client";

/**
 * MasterDetail — list + detail that adapts:
 *   compact → single pane; detail slides up as a glass bottom sheet
 *   medium/expanded → two panes side by side
 *
 * Token-driven, so it follows light/dark. Used by the mind-map and roadmap
 * spaces so an inspector is a sheet on a phone and a pane on an iPad.
 */

import type { CSSProperties, ReactNode } from "react";
import { useBreakpoint } from "./breakpoints.js";

interface Props {
  master: ReactNode;
  detail: ReactNode;
  detailOpen: boolean;
  onCloseDetail?: () => void;
  detailWidth?: number;
}

const glass: CSSProperties = {
  background: "var(--glass-bg)",
  WebkitBackdropFilter: "saturate(180%) blur(var(--glass-blur))",
  backdropFilter: "saturate(180%) blur(var(--glass-blur))",
};

export function MasterDetail({ master, detail, detailOpen, onCloseDetail, detailWidth = 340 }: Props) {
  const compact = useBreakpoint() === "compact";

  if (!compact) {
    return (
      <div style={{ display: "flex", height: "100%", minHeight: 0 }}>
        <div style={{ flex: 1, minWidth: 0, position: "relative" }}>{master}</div>
        {detailOpen && (
          <div style={{ ...glass, width: detailWidth, flexShrink: 0, borderLeft: "1px solid var(--glass-border)", overflowY: "auto" }}>
            {detail}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ height: "100%", position: "relative" }}>
      {master}
      {detailOpen && (
        <>
          <div onClick={onCloseDetail} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 20 }} />
          <div
            style={{
              ...glass, position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 21,
              maxHeight: "72%", overflowY: "auto",
              borderTop: "1px solid var(--glass-border)",
              borderTopLeftRadius: 20, borderTopRightRadius: 20,
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 0" }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--hairline)" }} />
            </div>
            {detail}
          </div>
        </>
      )}
    </div>
  );
}
