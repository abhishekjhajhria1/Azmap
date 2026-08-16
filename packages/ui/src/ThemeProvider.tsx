"use client";

/**
 * Theme control — light / dark / system (default system).
 *
 * Writes `data-theme` on <html> for explicit picks and removes it for "system"
 * (so the CSS `prefers-color-scheme` rules govern). Persists to localStorage
 * `abh.theme`. Exposes the resolved light/dark value and re-renders when the
 * system preference changes, so JS consumers (the graph) can recolour live.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Theme = "light" | "dark" | "system";
export type Resolved = "light" | "dark";

const KEY = "abh.theme";

interface Ctx {
  theme: Theme;
  resolved: Resolved;
  setTheme: (t: Theme) => void;
  cycle: () => void;
}

const ThemeCtx = createContext<Ctx | null>(null);

function systemDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function apply(theme: Theme) {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  if (theme === "system") el.removeAttribute("data-theme");
  else el.setAttribute("data-theme", theme);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [sysDark, setSysDark] = useState(false);

  // Hydrate from storage / current <html> on mount.
  useEffect(() => {
    let initial: Theme = "system";
    try {
      const stored = window.localStorage.getItem(KEY) as Theme | null;
      if (stored === "light" || stored === "dark" || stored === "system") initial = stored;
    } catch { /* ignore */ }
    setThemeState(initial);
    setSysDark(systemDark());
    apply(initial);

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSysDark(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    apply(t);
    try { window.localStorage.setItem(KEY, t); } catch { /* ignore */ }
  }, []);

  const resolved: Resolved = theme === "system" ? (sysDark ? "dark" : "light") : theme;

  const cycle = useCallback(() => {
    setTheme(resolved === "dark" ? "light" : "dark");
  }, [resolved, setTheme]);

  const value = useMemo(() => ({ theme, resolved, setTheme, cycle }), [theme, resolved, setTheme, cycle]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme(): Ctx {
  const ctx = useContext(ThemeCtx);
  if (!ctx) return { theme: "system", resolved: systemDark() ? "dark" : "light", setTheme: () => {}, cycle: () => {} };
  return ctx;
}
