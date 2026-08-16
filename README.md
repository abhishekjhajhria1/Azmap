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
| [`packages/core`](packages/core) | `@abh/core` — the map: domain model, unlock engine, local-first storage. The shared brain every app uses. | ✅ built, tested |
| [`apps/website`](apps/website) | Marketing site (Next.js). Its hero map is a live demo running the real engine. | ✅ built |
| [`apps/extension`](apps/extension) | Browser extension (WXT, MV3). Capture what you read, straight into the map. | ✅ built |
| [`apps/mobile`](apps/mobile) | Flutter app (iOS + Android). | 🔜 planned |
| [`apps/desktop`](apps/desktop) | All-OS desktop app (Tauri). | 🔜 planned |

Architecture and the reasoning behind the "one map, four surfaces" design:
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Quick start

Requires **Node ≥ 20** and **pnpm 10**.

```bash
pnpm install          # install the whole workspace
pnpm core:test        # run the domain engine tests (23 tests)
pnpm core:build       # build @abh/core
```

### Run the website

```bash
pnpm web:dev          # http://localhost:3000
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
