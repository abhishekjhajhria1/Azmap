import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "ABH — your learning map",
        short_name: "ABH",
        description: "Everything you learn, on one map that grows with you.",
        // Matches the current palette. The old #0a1a12 was left over from the
        // forest-green scheme and tinted the installed app's chrome.
        theme_color: "#fbfbfd",
        background_color: "#fbfbfd",
        display: "standalone",
        icons: [
          { src: "icon.svg", sizes: "any", type: "image/svg+xml" },
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          // Maskable: padded so Android's circle/squircle crop doesn't clip it.
          { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
  server: { port: 5173 },
});
