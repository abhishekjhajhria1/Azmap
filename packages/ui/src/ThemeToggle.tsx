"use client";

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
        width: 34,
        height: 34,
        borderRadius: 10,
        border: "1px solid var(--hairline)",
        background: "transparent",
        color: "var(--fg-muted)",
        cursor: "pointer",
        fontSize: 15,
        lineHeight: 1,
      }}
    >
      {resolved === "dark" ? "☀" : "☾"}
    </button>
  );
}
