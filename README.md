# ABH

> **Everything you learn, on one map that grows with you — and friends who can
> see it happening.**

You learn constantly and keep almost none of it. Course platforms hand you a
playlist and no idea where it fits. Note apps capture everything and organise
nothing. Roadmap sites show a beautiful path and forget you the moment you
close the tab. Nothing holds what you know as a *living thing*.

ABH does. Name anything you want to learn and get a real path through it — or
let AI build one for a subject nobody has mapped yet. Your progress becomes a
**graph, not a list**: topics unlock as you clear what they need, finishing one
thing visibly opens several others, and the people who matter can see how far
you've actually come. It works offline, needs no account, and your learning
never leaves your device.

This repo is the multi-surface home for that idea.

## What's here

| Path | What it is | Status |
| --- | --- | --- |
| [`packages/core`](packages/core) | `@abh/core` — the shared brain: domain model, unlock/reveal engine, roadmaps, suggestions, local-first storage + sync seams. Every surface reuses it. | ✅ built, 35 tests |
| [`packages/ui`](packages/ui) | `@abh/ui` — design system: theme, adaptive shell (bottom-nav↔rail↔sidebar), the WebGL `GraphView` (Sigma + graphology, worker layout), and the reactive `useAbh` store. | ✅ built |
| [`apps/app`](apps/app) | **The product** — a local-first, offline PWA (Vite + React). One map, distinct spaces: second brain, focused roadmaps, ask-anything, capture. Runs on the real store. | ✅ built |
| [`apps/website`](apps/website) | Marketing site (Next.js). Landing page + live-demo hero. | ✅ built |
| [`apps/extension`](apps/extension) | Browser extension (WXT, MV3). Capture what you read, straight into the map. | ✅ built |
| [`apps/mobile`](apps/mobile) | Flutter — one codebase for iOS + Android, adaptive for phone/foldable/tablet/iPad. Mirrors `apps/app`. | 🔜 planned |
| [`apps/desktop`](apps/desktop) | All-OS desktop app (Tauri wraps `apps/app`). | 🔜 planned |

Architecture and the reasoning behind "one shared model, distinct experiences":
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Quick start

Requires **Node ≥ 20** and **pnpm 10**.

```bash
pnpm install                       # install the whole workspace
pnpm --filter @abh/core test       # run the domain engine tests (35)
pnpm -r build                      # build core, ui, and every app
```

### Run the app (the product)

```bash
pnpm --filter @abh/app dev         # http://localhost:5173
```

Onboard, start a roadmap, and watch it flow into your second-brain mind map.
Everything persists on-device (IndexedDB); it works offline.

### Run the website

```bash
pnpm --filter @abh/website dev     # http://localhost:3000
```

The hero map is playable — click an amber ("open to you now") node and the
real `@abh/core` engine recomputes what unlocks.

### Run the extension

```bash
pnpm ext:dev          # launches a dev browser with the extension loaded
# or build an unpacked extension:
pnpm --filter @abh/extension build   # → apps/extension/.output/chrome-mv3
```

Load `apps/extension/.output/chrome-mv3` as an unpacked extension in Chrome
(`chrome://extensions` → Developer mode → Load unpacked). Try the right-click
**"Save to ABH map"** and the popup.

## The core idea, in one snippet

```ts
import { MapStore, MemoryStorage } from "@abh/core";

const map = new MapStore(new MemoryStorage());
const html = await map.addTopic({ title: "HTML" });
const react = await map.addTopic({ title: "React" });
await map.addEdge(html.id, react.id);      // React needs HTML first

await map.availableNow();                   // [HTML]  — React is locked
const { unlocked } = await map.complete(html.id);
// unlocked === [React]  — finishing one thing opens the next
```

## Principles

- **The domain has no framework.** Every rule about the map lives in
  `@abh/core`, once.
- **AI proposes, you accept.** Nothing the AI suggests joins your map until you
  tap to accept it.
- **On-device first, sync optional.** No server assumed anywhere in the domain;
  your data is yours.

## Status

Pre-launch. Building the web surfaces first (extension + site), then the mobile
and desktop apps. Data (roadmaps, sources, prerequisite links) is fed in later
— the foundation comes first.
