/**
 * Lightweight entry — everything except the WebGL GraphView (and its `sigma`
 * import). SSR surfaces (the Next.js marketing site) import from here so a
 * server prerender never touches WebGL. The app uses the full barrel.
 */

export * from "./theme.js";
export * from "./breakpoints.js";
export { ThemeProvider, useTheme, type Theme, type Resolved } from "./ThemeProvider.js";
export { ThemeToggle } from "./ThemeToggle.js";
export { AdaptiveShell } from "./AdaptiveShell.js";
export {
  FloatingDock,
  resolveDockPosition,
  type DockItem,
  type DockPosition,
} from "./FloatingDock.js";
export { MasterDetail } from "./MasterDetail.js";
