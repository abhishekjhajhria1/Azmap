import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "ABH — your learning map",
        short_name: "ABH",
        description: "Everything you learn, on one map that grows with you.",
        theme_color: "#0a1a12",
        background_color: "#0a1a12",
        display: "standalone",
      },
    }),
  ],
  server: { port: 5173 },
});
