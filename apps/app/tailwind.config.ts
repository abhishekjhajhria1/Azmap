import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: {
          950: "#0a1a12", 900: "#0e2419", 800: "#123021", 700: "#1b4332",
          600: "#2d6a4f", 500: "#40916c", 400: "#52b788", 300: "#74c69d",
        },
        parchment: "#f4f1e8",
        amber: { DEFAULT: "#e9b949", soft: "#f2d493" },
        violet: { DEFAULT: "#c77dff", soft: "#d8b6ff" },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
