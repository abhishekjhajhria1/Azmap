"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider.js";

/**
 * A minimal light/dark toggle. Tap flips the resolved theme; the icon reflects
 * what a tap will switch to. Styled with tokens so it fits either theme.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolved, cycle } = useTheme();
  return (
    <button
      onClick={cycle}
      aria-label={resolved === "dark" ? "Switch to light" : "Switch to dark"}
      title={resolved === "dark" ? "Light mode" : "Dark mode"}
      className={className}
      style={{
        display: "grid",
        placeItems: "center",
        width: 36,
        height: 36,
        borderRadius: 10,
        border: "1px solid var(--hairline)",
        background: "transparent",
        color: "var(--fg-muted)",
        cursor: "pointer",
      }}
    >
      {resolved === "dark" ? <Sun size={17} strokeWidth={2} /> : <Moon size={17} strokeWidth={2} />}
    </button>
  );
}
