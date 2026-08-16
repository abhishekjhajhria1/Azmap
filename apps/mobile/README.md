# apps/mobile — Flutter (iOS + Android)

> Status: **planned.** Scaffolding lands once the website + extension are in
> people's hands. This folder is reserved so the monorepo shape is stable.

The mobile app is the flagship surface — the executive summary's working
Android app in Kotlin is the proof; this is the cross-platform successor that
shares the exact same map model as every other ABH app.

## How it fits the monorepo

Flutter is Dart, so it can't import `@abh/core` (TypeScript) directly. The plan
keeps a **single source of truth** without a rewrite:

- `@abh/core` stays the canonical definition of the domain — the graph rules,
  the unlock engine, the storage contract, and the `MapSnapshot` wire format.
- The Flutter app implements the same model in Dart, validated against the same
  `MapSnapshot` JSON fixtures the TypeScript tests use, so the two can never
  drift on what a valid map is.
- Import/export/sync all move a `MapSnapshot`, so a map made in the extension
  opens on the phone and vice-versa.

## Local-first, same as the rest

On-device store (SQLite/Isar) behind the same adapter shape as
`StorageAdapter`. Optional encrypted sync plugs in later without touching the
domain layer.

## When we start

```bash
flutter create --org sh.abh --platforms=ios,android .
```

Then port `packages/core/src/graph.ts` to `lib/core/graph.dart` against the
shared fixtures.
