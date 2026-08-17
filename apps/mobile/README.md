# ABH — mobile

Flutter. Phone, tablet, iPad and foldable; desktop is deliberately out of scope.

## Status, stated plainly

This was written without a Flutter toolchain in the room. **None of the Dart in
here has been compiled or run.** Expect the first `flutter run` to surface
import paths, package versions and analyzer complaints — write it off as the
cost of the code existing at all, not as a sign something is conceptually wrong.

What is done:

| | |
|---|---|
| `lib/domain/models.dart` | Records, wire-compatible with `@abh/core` |
| `lib/domain/graph.dart` | The unlock engine |
| `lib/domain/merge.dart` | The deterministic sync merge order |
| `lib/design/tokens.dart` | Palette and type, transliterated from `theme.css` |
| `lib/design/survey.dart` | The survey ground, frosted glass, stacked rows |
| `lib/main.dart` | App shell and dock |
| `test/conformance_test.dart` | Proves the engine matches TypeScript |

Not done: storage, sync, and the four spaces. The shell renders a labelled
placeholder for each so the ground and the material can be looked at on a real
device first.

## First run

```sh
cd apps/mobile
flutter create . --platforms=ios,android   # generate the platform folders
flutter pub get
flutter test                                # conformance suite
flutter run
```

`flutter create .` on an existing directory fills in `ios/`, `android/` and the
generated config without touching `lib/`, `test/` or `pubspec.yaml`.

Fonts are declared but not committed — drop
[Inter](https://rsms.me/inter/) and
[Fraunces](https://fonts.google.com/specimen/Fraunces) variable TTFs into
`fonts/` before the first build. Without them Flutter falls back to the platform
sans, which looks fine but loses the serif voice.

## Why the engine is Dart and not shared

The unlock engine and the merge order now exist in two languages. That is a real
risk, taken deliberately, because the alternatives are worse: embedding a JS
runtime costs a megabyte, a bridge on every graph query, and a build step nobody
can debug at 2am.

The risk is handled by not trusting it. `test/conformance_test.dart` runs a
corpus generated from the TypeScript implementation:

```sh
pnpm --filter @abh/core vectors   # regenerate test/fixtures/conformance.json
```

The expectations in that file are derived by *running* `@abh/core`, not written
by hand — and `packages/core/src/conformance/conformance.test.ts` re-derives
them on every TypeScript test run, so the corpus cannot drift from the reference
without going red. Two implementations that pass the same corpus agree on
everything the corpus covers.

It covers the rules that fail **silently**: hard edges gate and soft edges never
do; what completing a topic actually unlocks; acyclicity; teaching order; the
`rev → updatedAt → deviceId` total order; and whether a delete beats an edit.
Get the merge wrong and two devices converge on different states and both report
success. Get soft edges wrong and a topic is locked on the phone and open on the
laptop. Neither produces a stack trace, which is exactly why they are tested
this way.

Not covered: UI, storage, transport, crypto. Those fail loudly.

### Changing the engine

Change TypeScript first, regenerate the vectors, then make Dart pass. If a
conformance case fails, the fix is almost never to edit the JSON — that file
describes what the rest of the product actually does.
