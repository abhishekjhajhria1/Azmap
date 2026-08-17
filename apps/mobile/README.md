# apps/mobile — Flutter (iOS + Android)

One Flutter codebase for phone, tablet, iPad and foldable. Desktop is
deliberately out of scope. `apps/app` is the working reference to mirror.

## Status, stated plainly

**None of this Dart has been compiled or run.** It was written without a Flutter
toolchain available. Expect the first `flutter run` to surface import paths,
package versions and analyzer complaints — that's the cost of the code existing
at all, not a sign something is conceptually wrong.

| | |
|---|---|
| `lib/domain/` | Records, the unlock engine, the merge order |
| `lib/data/` | SQLite schema, repository, device identity |
| `lib/state/` | `MapController` + `MapScope` |
| `lib/design/` | Tokens, metrics, survey ground, glass, dock, controls |
| `lib/prefs/` | The preference model and its persistence |
| `lib/onboarding/` | Four questions, each with a live preview |
| `lib/settings/` | Everything onboarding asked, plus what it didn't |
| `lib/mind/` | On-device matching — no model, no network |
| `lib/spaces/` | Brain, Roadmap, Capture, People |
| `test/` | Conformance corpus, `LocalMind`, preferences |

**Not done yet:** the share-sheet capture target, pairing UI (the client is
written; nothing shows a QR scanner yet), and the guide reader.

## Adaptive layout — what was actually broken

Three failures found by audit, all of which would have shipped:

**Nothing read the system text size.** Every `height: 52` button clips its own
label at 200% text — the third notch in iOS Accessibility, not an exotic
setting — and clipping is silent in release builds. `ScaledBox` grows with the
scale and keeps the 44dp floor. Scale is clamped at 2.0, as iOS's own apps do:
past that a phone fits three words per line and no layout survives.

**No max content width.** A `ListView` with 22dp padding on a 1024pt iPad
produces ~150 characters per line. Comfortable reading is 45–75; past ~90 the
eye loses its place returning to the next line. `DocColumn` caps it.

**Vertical hinges were ignored entirely.** The dock avoided a horizontal hinge,
but a book-style fold cuts a single column of text physically in half.
`TwoPane` splits along the seam and renders the gap as the seam itself, so
nothing is ever drawn underneath it. On compact widths the detail pane is
*dropped*, not stacked — stacking buries secondary content under a screen of
scrolling, which is worse than absent because it still costs a scroll to pass.

## Sync

`lib/sync/` talks to `apps/server`, which is an append-only log of sealed blobs
it cannot read. AES-GCM-256, wire-identical to the TypeScript side — including
the detail that breaks silently if you get it wrong: `cryptography` keeps the
MAC separate while WebCrypto appends it to the ciphertext, so the Dart client
concatenates before encoding. Miss that and decryption fails *on the other
platform only*.

Three failure modes handled: **offline** (a durable outbox table, not a memory
queue — a capture saved on the underground is still queued tomorrow),
**half-sent** (the cursor advances only after changes are applied; replay is
safe because the merge is idempotent, losing a page is not), and **two syncs at
once** (single-flight).

The outbox holds *references*, not copies, so eleven edits to one topic collapse
to one entry and a retry ships the current version. Incoming records are written
with `enqueue: false` — echoing a peer's record back into your own outbox is an
infinite sync loop between two devices politely returning what the other sent.

Deployment: `apps/server/Dockerfile` and `fly.toml`. **The volume is not
optional** — see that README for why losing the log is data loss rather than a
fresh start.

## Search

A floating circle that becomes a search bar: one `AnimatedContainer` morphing
width and radius, so there is one widget with continuous identity at every
frame. Two widgets cross-fading reads as a glitch, which is what most
implementations of this actually are. It searches topics and captures, ranked
so a prefix match beats a mid-word one — search that returns the right answer
sixth feels broken while technically working. When there is an AI to ask, the
field is already the right shape for a question.

## Adaptive by preference, not by profiling

Nine settings, and each one earns its place by the same test: **two reasonable
people want opposite things from it.** A setting everybody would set the same
way isn't a setting, it's a bug in the default.

| | |
|---|---|
| Density | How much fits on a screen |
| Guidance | How much the app explains itself |
| Progress | Streak, percentage, or nothing |
| Home space | Which space opens on launch |
| Dock | Auto / bottom / top |
| Theme | System / light / dark |
| Accent | Six, each a light/dark pair |
| Survey ground | The drawn grid, on or off |
| Reduce motion | Adds restraint; never removes it |

**No personality quiz.** "Are you a Visual Learner" produces a label that
predicts nothing, from a theory that doesn't replicate. Every question asks
about an observable preference instead.

**Every question has a live preview** — the real widgets under the real theme,
not a picture of them. Asking someone on day zero whether they prefer compact
rows is unanswerable: compared to what? So they look at compact rows and decide.
Nothing can drift out of sync with the app because the preview *is* the app.

Four questions in onboarding, everything else in Settings. Each question is
weighed against the cost of somebody abandoning setup, which is the most
expensive thing that can happen on a first run. "Set this up later" is always
visible and never styled to be avoided.

Two rules the whole system obeys:

- **Density never shrinks a tap target.** Rows compress, type compresses, hit
  areas do not. A compact mode that misses is not compact, it's broken. The
  44dp floor is a constant, not a function of density.
- **Motion is one-way.** The OS setting can turn animation off; the app
  preference can only *also* turn it off. Someone who asked their phone for
  less motion usually did so for a vestibular or medical reason.

The one worth arguing about is progress. Streaks are the most effective
retention mechanic in consumer software *and* actively harmful to a real
fraction of people — miss a day, watch a number reset, quit rather than face it.
Both effects are real. So it's a choice, the onboarding copy says why in plain
words, and "count nothing" is a first-class option rather than a hidden escape
hatch.

## First run

```sh
cd apps/mobile
flutter create . --platforms=ios,android   # fills in ios/ and android/
flutter pub get
flutter test
flutter run
```

`flutter create .` on an existing directory generates the platform folders and
config without touching `lib/`, `test/` or `pubspec.yaml`.

Fonts are declared but not committed — drop [Inter](https://rsms.me/inter/) and
[Fraunces](https://fonts.google.com/specimen/Fraunces) variable TTFs into
`fonts/` before the first build. Without them Flutter falls back to the platform
sans: it looks fine, but it loses the serif voice that makes ABH recognisable.

## Why the engine is Dart, and how that's kept safe

Flutter is Dart, so `@abh/core` can't be imported. The unlock engine and the sync
merge order therefore exist in two languages. That's a real risk, taken
deliberately — the alternative, embedding a JS runtime, costs a megabyte, a
bridge on every graph query, and a build step nobody can debug at 2am.

The risk is handled by not trusting it:

```sh
pnpm --filter @abh/core vectors   # regenerate test/fixtures/conformance.json
flutter test                       # Dart must reproduce every case
```

The expectations in that file are derived by *running* `@abh/core`, not written
by hand — and `packages/core/src/conformance/conformance.test.ts` re-derives
them on every TypeScript run, so the corpus can't drift from the reference
without going red.

It covers the rules that fail **silently**: hard edges gate and soft edges never
do; what completing a topic actually unlocks; acyclicity; teaching order; the
`rev → updatedAt → deviceId` total order; and whether a delete beats an edit.
Get the merge wrong and two devices converge on different states and both report
success. Get soft edges wrong and a topic is locked on the phone and open on the
laptop. Neither produces a stack trace. Both suites also assert the comparator is
antisymmetric — one that's right on every recorded pair but not antisymmetric
still loses data.

Not covered: UI, storage, transport, crypto. Those fail loudly.

**Changing the engine:** change TypeScript first, regenerate the vectors, then
make Dart pass. If a conformance case fails, the fix is almost never to edit the
JSON — that file describes what the rest of the product actually does.

## Design contract

Tokens are transliterated into `lib/design/tokens.dart`, values copied exactly
from `packages/ui/theme.css`. `#fbfbfd` is not `#fcfcfc`: the whole design rests
on small separations between planes, and "close enough" on a background is how
the phone ends up looking like a different product from the web app beside it.
If you change one, change the other in the same commit.

**Material.** Nothing sharp-cornered: pill 999, large 26, medium 18, small 12.
Chrome floats inset 16dp and never touches an edge; content scrolls underneath
and is always padded clear of it. Glass is `BackdropFilter` + translucent fill +
hairline border + soft shadow, and it is **rationed** — the dock and one overlay
at most. Blur is the most expensive effect on both platforms.

**The ground.** `SurveyGround` paints the identity: a plotted grid with heavier
rules every fifth line, contour rings where the land rises, one faint colour
wash. Drawn, not glowed — gradient orbs are the single most recognisable tell of
a generated interface and say nothing about the product.

**Icons are drawn, not shipped.** Four glyphs isn't worth an icon package, a font
file, or a licence to track, and drawing them means they inherit stroke weight
from the design.

**Not MaterialApp.** Material's elevation model, ripples and `ColorScheme` fight
this design at every turn. Starting from `WidgetsApp` is less work than
overriding the bigger widget.

## The spaces

- **Brain** — the graph on one `CustomPaint`. The layout is a deterministic
  radial tree, *not* a force simulation: force layouts aren't stable, so the
  same map lands differently each time, and the whole value of a map is learning
  where things are. Depth-ordered rings also match what the graph means —
  prerequisites toward the centre, what they unlock radiating out.
- **Roadmap** — one thing to do and the case for doing it. The path below is a
  stack sharing one surface, not a column of outlined cards.
- **Capture** — one field, one key. Above the inbox sit the connections the app
  found on this device, built around the sentence rather than the buttons. No
  confidence score on screen: it's a ranking signal, not a probability.
- **People** — says plainly that guardians need account-to-account sharing that
  doesn't exist yet, and shows what a guardian *would* see. A preview that
  pretends to work is worse than an honest gap.

## Platform notes

The dock keeps clear of a foldable's hinge (`MediaQuery.displayFeaturesOf`) —
a control under a physical seam reads as a broken app, not unusual hardware.
Tap targets are 40dp minimum even where the drawn circle is smaller. Text scales
with the system setting; nothing hard-codes a size that can't grow.
