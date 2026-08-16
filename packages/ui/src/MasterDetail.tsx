"use client";

/**
 * MasterDetail — list + detail that adapts:
 *   compact → single pane; detail slides up as a bottom sheet
 *   medium/expanded → two panes side by side
 *
 * Used by the mind-map and roadmap spaces so an inspector is a sheet on a phone
 * and a permanent pane on an iPad, from one component.
 */

import type { ReactNode } from "react";
import { useBreakpoint } from "./breakpoints.js";
import { color } from "./theme.js";

interface Props {
  master: ReactNode;
  detail: ReactNode;
  detailOpen: boolean;
  onCloseDetail?: () => void;
  /** Detail pane width on wide screens. */
  detailWidth?: number;
}

export function MasterDetail({ master, detail, detailOpen, onCloseDetail, detailWidth = 340 }: Props) {
  const compact = useBreakpoint() === "compact";

  if (!compact) {
    return (
      <div style={{ display: "flex", height: "100%", minHeight: 0 }}>
        <div style={{ flex: 1, minWidth: 0, position: "relative" }}>{master}</div>
        {detailOpen && (
          <div style={{ width: detailWidth, flexShrink: 0, borderLeft: `1px solid ${color.forest800}`, overflowY: "auto" }}>
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
          <div
            onClick={onCloseDetail}
            style={{ position: "absolute", inset: 0, background: "rgba(10,26,18,0.5)", zIndex: 20 }}
          />
          <div
            style={{
              position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 21,
              maxHeight: "72%", overflowY: "auto",
              background: color.forest900, borderTop: `1px solid ${color.forest700}`,
              borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 0" }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: color.forest700 }} />
            </div>
            {detail}
          </div>
        </>
      )}
    </div>
  );
}
