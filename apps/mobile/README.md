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
| `lib/design/` | Tokens, survey ground, glass, the dock |
| `lib/mind/` | On-device matching — no model, no network |
| `lib/spaces/` | Brain, Roadmap, Capture, People |
| `test/` | Conformance corpus + `LocalMind` |

**Not done yet:** sync (the schema carries the envelope for it, but nothing
talks to the relay), onboarding, the share-sheet capture target, the omni-search
sheet, and the guide reader.

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
