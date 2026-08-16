---
name: cross-device-continuity
description: >-
  Load when building anything that spans surfaces — the browser extension,
  mobile (Flutter), desktop (Tauri), web app, widgets, share targets, deep
  links, sync, offline behaviour, or "capture on laptop, continue on phone".
  Makes ABH feel like ONE product the user carries everywhere, not four
  separate apps that happen to share a logo.
---

# Cross-Device Continuity — one brain, every device

The promise: **capture anywhere in 2 seconds, and it's already there on every
other device.** Whatever surface a user is on, ABH must be the fastest path
from "I just learned/saw something" to "it's in my map."

## The mental model

One user, one map, many windows onto it. A surface is never a separate app — it
is a *lens* with a job:

| Surface | Its job (be excellent at ONE thing) |
| --- | --- |
| **Browser extension** | Capture while reading. Zero-friction, never steals focus. |
| **Mobile (Flutter)** | Review, learn, and capture on the move. Widgets + share sheet. |
| **Desktop (Tauri)** | Deep work: organise the map, long reading, keyboard-driven. |
| **Web app** | Full power anywhere, no install; the reference implementation. |

Don't port every feature everywhere. Port the *map* everywhere, and let each
surface nail its job.

## 1. Non-negotiables

- **Offline-first, always.** Every surface writes locally first (`MapStore`) and
  works with the network off. Sync is an enhancement, never a prerequisite.
- **Same domain model everywhere.** All logic lives in `@abh/core`; Flutter
  mirrors it and validates against the shared `MapSnapshot` fixtures. A rule
  must never be implemented twice.
- **Same visual language.** Shared tokens/breakpoints (`@abh/ui`) so the app is
  recognisably itself on every screen (see `taste`).
- **No blocking login.** Local profile first; identity is added, never demanded.

## 2. Capture must be everywhere and instant

The single biggest continuity win. Ship every entry point the OS gives you:

- Browser: context menu, keyboard shortcut, toolbar button, and (later) a
  selection popover. Confirm with a badge — never a modal.
- Mobile: **share sheet target** (the #1 mobile capture path), home-screen
  widget, quick-action long-press, clipboard detection with an opt-in prompt.
- Desktop: global hotkey, menu-bar/tray quick-capture, drag-and-drop.
- Everywhere: paste a URL and we enrich it; capture never blocks on network.

Rule: **capture must never require choosing where it goes.** Land it in the
Capture inbox; connecting to the map is a separate, later, optional step.

## 3. Continuity, not just sync

Sync moves data. *Continuity* moves **context**:

- **Resume where you left off** — the active roadmap, the current topic, and
  scroll/selection position travel with the user.
- **Deep links / universal links** — every topic, roadmap, and capture has a
  URL that opens the right screen on any surface (`abh://topic/<id>` +
  https equivalents for the web).
- **Handoff nudges** — "You captured 4 things on your laptop — connect them?"
  when they open mobile. Surface-aware, not spammy.
- **Notification coherence** — a notification acted on in one place clears
  everywhere.

## 4. Sync design (when the backend lands)

The seams already exist in `@abh/core/sync` — respect them:

- **Local writes win the UI.** Optimistic, instant; sync reconciles in the
  background. Never block the interface on a request.
- **Merge by `rev`** — the documented last-writer-by-rev rule in
  `StorageAdapter.importSnapshot("merge")` is the contract. Same rule on every
  platform, or devices will diverge.
- **Deltas, not full snapshots**, once volume grows; `Delta{since, snapshot}`.
- **Conflicts**: additive data (captures, topics) merges — never lose a user's
  capture. For true conflicts, prefer the most recent *user action*, and if a
  choice is unavoidable, keep both and let the user reconcile visibly.
- **Encrypt in transit and at rest**; the privacy claim ("your learning never
  leaves your device" → "only you can read it") must survive sync. Sync is
  **opt-in**.
- Make sync state legible: synced / syncing / offline — quietly, in one place.

## 5. Platform-native, not lowest-common-denominator

Adapt, don't clone: bottom-nav on phones, rail on tablets/foldables, sidebar on
desktop (see the `AdaptiveShell` spec); keyboard shortcuts on desktop; gestures
and haptics on mobile; respect safe areas, Dynamic Type, and reduced-motion.
Use `apple-hig-expert` when polishing iOS/macOS surfaces.

## 6. Before shipping a cross-surface feature, answer

1. What is this surface's ONE job here?
2. Does it work fully offline?
3. Can the user capture in ≤ 2 seconds without leaving what they're doing?
4. If they switch devices mid-task, does context follow?
5. Is the domain rule implemented once (in core) or duplicated?
6. Does it look and behave like the same product?

## Repo specifics

- `packages/core` — the shared brain (model, engine, storage, sync seams).
- `packages/ui` — shared tokens, adaptive shell, graph; the spec Flutter mirrors.
- `apps/extension` — capture surface (already on `MapStore` + IndexedDB).
- `apps/mobile` (Flutter) / `apps/desktop` (Tauri) — see their READMEs for how
  they consume the shared model.
