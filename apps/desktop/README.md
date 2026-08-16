# apps/desktop — all-OS desktop app (Tauri)

> Status: **planned.** Reserved folder; the web app (`apps/app`) is the shell it
> will wrap, so most of the work is window chrome, not UI.

The desktop app is where long reading and deep organising of the map happen —
the big-screen companion to the browser extension's quick capture.

## Why Tauri

- **Cheap and small.** A Tauri binary is a few MB and sips memory — consistent
  with "costs almost nothing to run". Electron ships a whole Chromium per app.
- **Reuses the web app directly.** Same React/TypeScript surface, same
  `@abh/core`, same `@abh/ui` design system — no second implementation.
- **Local-first by default.** The Rust side only ever touches the local disk.

Rust is already available in this environment (`cargo`), so bootstrapping is:

```bash
pnpm create tauri-app@latest   # point the frontend at apps/app
```

## Making the floating chrome read as native

The app's design language is **floating glass over a canvas** — which only looks
right if the window itself participates:

- **Transparent + vibrancy window.** Set `"transparent": true` and enable the
  platform blur (macOS `NSVisualEffectView` vibrancy; Windows 11 Mica/Acrylic)
  so the `.float` dock and panels blur real desktop content, not a flat fill.
- **Hidden title bar with an inset traffic-light position** on macOS
  (`titleBarStyle: "Overlay"`), so the floating dock is the only chrome. Add a
  drag region behind the dock.
- **Rounded window corners** to match `--r-lg`; no square edges anywhere.
- Respect the OS light/dark setting — the app already follows
  `prefers-color-scheme`, so pass the system theme through.

## Desktop-only affordances worth adding

- **Global hotkey** for quick capture (Tauri global shortcut) and a tray /
  menu-bar quick-capture window — capture without leaving the current app.
- **Deep links** (`abh://topic/<id>`) registered as a URL scheme so links from
  other surfaces open the right screen.
- Full keyboard control: ⌘K omni-search, arrow navigation, shortcuts for the
  spaces.

## Adaptivity

Desktop is the "expanded" breakpoint: the wide floating dock carrying brand,
spaces, progress and theme, with multi-pane master–detail. It must still handle
being resized small — the same breakpoints as the web app apply.
