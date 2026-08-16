import { defineConfig } from "wxt";

// ABH browser extension config. Cross-browser (Chrome + Firefox) MV3.
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  // We use explicit imports throughout; disable auto-imports so WXT's scanner
  // never rewrites bare identifiers inside dependencies (e.g. @abh/core).
  imports: false,
  manifest: {
    name: "ABH — Save to your map",
    description:
      "Capture what you read on the web straight into your ABH learning map. On-device, private.",
    permissions: ["contextMenus", "storage", "activeTab"],
    action: {
      default_title: "ABH — your map",
    },
    commands: {
      "save-page": {
        suggested_key: { default: "Ctrl+Shift+S" },
        description: "Save the current page to your ABH map",
      },
    },
  },
});
