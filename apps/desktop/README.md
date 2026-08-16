# apps/desktop — all-OS desktop app

> Status: **planned.** Reserved folder; scaffolding follows the mobile app.

The desktop app is where long reading and deep organising of the map happen —
the big-screen companion to the browser extension's quick capture.

## Chosen approach: Tauri

Tauri (Rust shell + web UI) fits ABH's values better than Electron:

- **Cheap + small.** A Tauri binary is a few MB and sips memory — consistent
  with "costs almost nothing to run".
- **Reuses the web app.** The desktop UI is the same React/TypeScript surface
  the website and extension already share, so `@abh/core` is imported directly
  — no second implementation on desktop.
- **Local-first by default.** The map lives in an on-device store via the same
  `StorageAdapter` contract; the Rust side only ever touches the local disk.

Rust is already available in this environment (`cargo`), so bootstrapping is a
matter of:

```bash
pnpm create tauri-app@latest
```

pointed at a shared web frontend that consumes `@abh/core`.

## Why not Electron

Electron would work, but ships a full Chromium per app and a heavier memory
footprint — the opposite of the product's "barely moves the bill" promise.
