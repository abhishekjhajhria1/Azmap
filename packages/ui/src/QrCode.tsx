"use client";

/**
 * A QR code, rendered as inline SVG.
 *
 * SVG rather than canvas on purpose: it stays crisp at any size, needs no
 * device-pixel-ratio handling, and prints. The whole code is emitted as a
 * single `<path>` — one DOM node instead of several hundred rects, which is
 * what keeps it cheap to re-render while the pairing screen counts down.
 */

import qrcode from "qrcode-generator";
import { useMemo, type ReactElement } from "react";

export interface QrCodeProps {
  value: string;
  /** Rendered size in px. The SVG scales, so this is layout, not resolution. */
  size?: number;
  /**
   * Error-correction level. "M" is the right default here: a pairing payload is
   * scanned from a screen a foot away, so the extra redundancy of "H" would
   * only make the modules smaller for no gain.
   */
  level?: "L" | "M" | "Q" | "H";
  /** Quiet-zone width, in modules. The spec asks for 4; scanners need it. */
  margin?: number;
  className?: string;
  title?: string;
}

export function QrCode({
  value,
  size = 220,
  level = "M",
  margin = 4,
  className,
  title = "Pairing QR code",
}: QrCodeProps): ReactElement {
  const { path, dimension } = useMemo(() => {
    // Type 0 = pick the smallest version that fits the data.
    const qr = qrcode(0, level);
    qr.addData(value);
    qr.make();
    const count = qr.getModuleCount();

    // One path, built as a run of "move to, draw 1x1 box" commands.
    let d = "";
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (qr.isDark(row, col)) {
          d += `M${col + margin} ${row + margin}h1v1h-1z`;
        }
      }
    }
    return { path: d, dimension: count + margin * 2 };
  }, [value, level, margin]);

  return (
    <svg
      role="img"
      aria-label={title}
      className={className}
      width={size}
      height={size}
      viewBox={`0 0 ${dimension} ${dimension}`}
      shapeRendering="crispEdges"
    >
      {/* The quiet zone must be light for the code to scan, in either theme. */}
      <rect width={dimension} height={dimension} fill="#ffffff" />
      <path d={path} fill="#000000" />
    </svg>
  );
}
