import type { Config } from "tailwindcss";

// Colours are CSS variables (see @abh/ui/theme.css), so utilities switch
// light/dark automatically — no `dark:` variants needed.
const config: Config = {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
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
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "SF Pro Text", "Segoe UI", "Roboto", "sans-serif"],
      },
      borderRadius: { xl: "0.9rem", "2xl": "1.15rem" },
    },
  },
  plugins: [],
};

export default config;
