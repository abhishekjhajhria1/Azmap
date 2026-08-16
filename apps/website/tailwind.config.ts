import type { Config } from "tailwindcss";

/**
 * ABH palette. Rooted in the executive-summary aesthetic: deep forest green,
 * warm off-white, a single amber accent for "available / open to you now".
 */
const config: Config = {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Semantic tokens (CSS vars from @abh/ui/theme.css) — switch light/dark.
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        fg: "var(--fg)",
        muted: "var(--fg-muted)",
        subtle: "var(--fg-subtle)",
        hairline: "var(--hairline)",
        accent: { DEFAULT: "var(--accent)", ink: "var(--accent-contrast)" },
        known: "var(--known)",
        available: "var(--available)",
        ai: "var(--ai)",
      },
      borderColor: { DEFAULT: "var(--hairline)" },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out both",
        "pulse-soft": "pulse-soft 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
