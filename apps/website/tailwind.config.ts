import type { Config } from "tailwindcss";

/**
 * ABH palette. Rooted in the executive-summary aesthetic: deep forest green,
 * warm off-white, a single amber accent for "available / open to you now".
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: {
          950: "#0a1a12",
          900: "#0e2419",
          800: "#123021",
          700: "#1b4332",
          600: "#2d6a4f",
          500: "#40916c",
          400: "#52b788",
          300: "#74c69d",
        },
        parchment: "#f4f1e8",
        amber: {
          DEFAULT: "#e9b949",
          soft: "#f2d493",
        },
      },
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
