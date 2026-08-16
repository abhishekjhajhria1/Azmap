# ABH — Architecture

> Everything you learn, on one map that grows with you — and friends who can
> see it happening.

ABH is not four products. It is **one map** (a directed prerequisite graph of
everything a person is learning) rendered on four surfaces. This document
explains how the monorepo keeps that "one map" honest across all of them.

## The one idea

A learner's knowledge is a **directed acyclic graph**:

- **Nodes** are `Topic`s — a thing you can learn.
- **Edges** are `Prerequisite`s — `from` must be *known* before `to` becomes
  *available*.

From that single structure, everything else follows:

| Product pillar | What it is in the graph |
| --- | --- |
| **The Roadmap** | a named slice of the graph (`Roadmap.topicIds`) |
| **The Map** | the graph itself + the unlock engine |
| **The People** | `Guardian`s reading progress off the graph |
| **Second brain** | `Capture`s that get connected into the graph |

Because the connections are real, the app can answer *"what can I start right
now?"* as a fact (`availableNow`), and preview *"what does finishing this
open?"* before you commit (`wouldUnlock`). That payoff moment is the product.

## Repository shape

```
abh/
├── packages/
│   └── core/            @abh/core — the domain. Framework-agnostic TS.
├── apps/
│   ├── website/         Next.js marketing site (live demo runs core)
│   ├── extension/       WXT MV3 browser extension (capture → map)
│   ├── mobile/          Flutter iOS + Android            (planned)
│   └── desktop/         Tauri, all-OS                    (planned)
└── docs/
```

The JS/TS surfaces (`packages/*`, `website`, `extension`) form one pnpm
workspace. Flutter and Tauri manage their own toolchains but share the domain
via the wire format (below).

## `@abh/core` — the shared brain

The crown jewel. Every rule about what a map *is* lives here exactly once.

- **`types.ts`** — the domain model as Zod schemas: `Topic`, `Edge`,
  `Roadmap`, `Suggestion`, `Guardian`, `Capture`, `MapSnapshot`. Every record
  carries `rev` + timestamps so an optional sync layer can reconcile later.
- **`graph.ts`** — the pure unlock engine. No I/O, so it is provably testable:
  `availableNow`, `wouldUnlock`, `computeStatuses`, `wouldCreateCycle`,
  `topoOrder`. This is the most heavily tested module in the codebase.
- **`storage/`** — storage is an **interface** (`StorageAdapter`), not a
  database. Ships with `MemoryStorage` (tests/SSR) and `IndexedDbStorage`
  (browser/extension/desktop-webview). An encrypted-sync adapter can implement
  the same contract with zero changes to domain logic.
- **`store.ts`** — `MapStore`, the one API apps call. It composes storage +
  engine and enforces the invariants in a single place:
  1. **No prerequisite cycles.** `addEdge` throws if it would close a loop.
  2. **AI proposes, you accept.** Nothing the AI/import suggests becomes a
     `Topic` or `Edge` until `acceptSuggestion` — the product's core trust
     rule, encoded so no UI can bypass it.
  3. **Everything is versioned.** Every mutation bumps `rev` + `updatedAt`.

## Local-first + "optional sync", concretely

- The default on every surface is a fully on-device store. No account, no
  server, works offline — the privacy claim is real, not marketing.
- The unit of portability is a `MapSnapshot` (a validated JSON blob). Export,
  import, backup, and future sync all move a snapshot.
- `MemoryStorage.importSnapshot` defines the canonical **merge rule**:
  last-writer-by-`rev`. Any future sync adapter follows the same rule, so the
  behaviour is defined once and shared.

## How each surface uses core

- **Website** imports `@abh/core` directly; the hero map runs the *real*
  `computeStatuses`/`wouldUnlock` in the browser, so the marketing page is a
  working demo of the engine.
- **Extension** imports `@abh/core` + `@abh/core/storage/indexeddb`. The
  background worker and popup share one extension-origin IndexedDB — the same
  map, two entry points.
- **Mobile** re-implements the model in Dart, validated against the shared
  `MapSnapshot` fixtures so it can't drift. See `apps/mobile/README.md`.
- **Desktop** (Tauri) reuses the web frontend and imports `@abh/core`
  directly. See `apps/desktop/README.md`.

## Design rules worth keeping

1. **The domain has no framework.** If a rule about the map lives in a React
   component or a Dart widget, it's in the wrong place — it belongs in core.
2. **The engine has no I/O.** Purity is why the unlock logic can be trusted.
3. **AI is a proposer, never an author.** The map only grows by a human tap.
4. **On-device first, sync optional.** Nothing in the domain assumes a server.
