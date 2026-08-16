# apps/mobile — Flutter (iOS + Android)

> Status: **spec, not yet scaffolded.** One Flutter codebase serves iOS and
> Android. This document is the implementable design contract — the web app
> (`apps/app`) is the working reference to mirror.

## How it fits the monorepo

Flutter is Dart, so it can't import `@abh/core` directly. The plan keeps a
single source of truth without a rewrite:

- `@abh/core` stays the canonical definition of the domain — graph rules, the
  unlock engine, the storage contract and the `MapSnapshot` wire format.
- The Flutter app implements the same model in Dart, validated against the same
  `MapSnapshot` JSON fixtures the TypeScript tests use, so the two can't drift.
- Import/export/sync all move a `MapSnapshot`, so a map made in the extension
  opens on the phone.

Local store: SQLite (Drift) behind the same shape as `StorageAdapter`. Offline
first; optional encrypted sync plugs in later without touching the domain.

## Design contract (mirror `packages/ui/theme.css`)

**Palette — near-monochrome + one accent.** Mirror the CSS variables exactly:

| Token | Light | Dark |
| --- | --- | --- |
| bg | `#FBFBFD` | `#09090B` |
| surface | `#FFFFFF` | `#141417` |
| surface-2 | `#F1F2F4` | `#1E1E22` |
| fg | `#09090B` | `#FAFAFA` |
| fg-muted | `#62636A` | `#A1A1AA` |
| fg-subtle | `#9A9BA2` | `#6B6B73` |
| accent | `#0071E3` | `#0A84FF` |
| known | `#1A9F57` | `#30D158` |
| ai | `#7C5CFF` | `#A78BFA` |

Green and violet are **semantic only** (success, AI). No beige/cream/mustard.

**Shape & material.** Nothing sharp-cornered: pill (999), large 26, medium 18,
small 12. Chrome **floats** inset ~16dp from the edges and never touches them;
content scrolls underneath. Use `BackdropFilter(ImageFilter.blur(sigma≈12))`
with a translucent fill + hairline border + soft shadow for the glass material
— and **ration it**: the dock, one panel, one overlay at most. Blur is the most
expensive effect on both platforms.

**Type.** Mirror the scale (caption 11 → hero 56) with negative tracking on
display sizes only. Weight carries hierarchy. Respect Dynamic Type / text
scaling — never hard-code sizes that can't grow.

**Motion.** 150–250ms, standard easing; animate transform/opacity only. Press =
scale 0.975. Honour reduced-motion.

## Navigation — the FloatingDock

A rounded glass pill floating over the content, **not** a Material bottom bar.

- Position is a **user preference** persisted on the core `Profile`
  (`dockPosition: auto | top | bottom`). `auto` → **bottom on phones** (thumb
  reach), top on tablets.
- Active item: a single accent-tinted lozenge that **slides** between items
  (transform-animated), matching the web.

**Per device class** (mirror `useBreakpoint`: <600 / 600–840 / >840 dp):

- **Phone (compact)** — compact pill, icons only, active item labelled; sits
  above the home indicator; safe-area aware; condenses on scroll.
- **Foldable (medium)** — icon + label. Read `MediaQuery.displayFeatures` and
  place the dock so it never lands under the hinge; map the two panes onto the
  two halves when unfolded; **preserve state across fold/unfold**.
- **Tablet / iPad (expanded)** — wider pill carrying brand, spaces, progress and
  the theme toggle. Respond to runtime size changes (Split View, Stage Manager)
  — never assume full screen.

## The four spaces

Mirror `apps/app/src/spaces/`:

- **Brain** — the graph, full-bleed under the floating chrome. Render with
  `CustomPainter`; run the force layout on a **background `Isolate`** so the UI
  isolate never drops frames. Floating on-canvas controls: a search pill that
  highlights matches and dims the rest, plus zoom/fit.
- **Roadmap** — deliberately distraction-free: one large display title for the
  current topic, a pill primary action, and the path as a **grouped list**
  (one container, hairline seams, no per-row boxes) with checkmark circles.
- **Capture** — one pill input, one round primary action, grouped inbox. Wire
  the **share sheet target** — the #1 mobile capture path — plus a home-screen
  widget and quick actions.
- **Guardian** — read-mostly progress; goes live with sync.

Plus the **omni-search** (`OmniBar` equivalent): one sheet that searches the
user's own topics and captures, the how-things-work library, and runs commands.

## Platform adaptation

Cupertino niceties on iOS (back-swipe, sheet behaviour, haptics), Material
behaviour on Android; system back handling; safe areas; and the `design`
skill's Apple-HIG references for iOS polish (44pt targets, contrast on
translucent materials).

## When we start

```bash
flutter create --org sh.abh --platforms=ios,android .
```

Then port `packages/core/src/graph.ts` to `lib/core/graph.dart` against the
shared fixtures, and build the dock first — everything else hangs off it.
