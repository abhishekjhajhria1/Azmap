# android/

Hand-written rather than generated, and **committed** rather than ignored.

## Why it's in the repo

An earlier version of this project gitignored `android/` on the theory that
`flutter create .` regenerates it. That was wrong, and it is worth writing down
so nobody re-does it:

- **The share-sheet intent filters live in `AndroidManifest.xml`.** Ignoring the
  folder means every clone loses them and the app silently stops appearing in
  the share sheet, with nothing in the Dart code to explain why.
- The application id, app label, launch screen, icon, `minSdk` and signing
  config all live here too. Regenerating resets each of them to Flutter's
  defaults.
- Committed platform folders are also how the build stays reproducible: a
  teammate's `flutter create` and yours would otherwise differ by whatever
  Flutter version each of you happens to have.

## What's here, and what isn't

Everything except the Gradle wrapper jar and `local.properties`, both of which
are generated:

```sh
cd apps/mobile
flutter pub get     # writes android/local.properties
flutter run         # generates the wrapper on first build
```

There are **no PNG icons**. The launcher icon is
`res/drawable/ic_launcher.xml` — vectors, because a repo written without an
image editor cannot produce five density buckets, and a vector is the honest
starting point anyway. The mark is three nodes and the edges between them: the
map, which is what ABH is. Replace it with a proper adaptive icon
(`mipmap-anydpi-v26` plus raster fallbacks) before store submission; Play's
listing surfaces want raster at fixed sizes.

## Decisions that are not defaults

| | |
|---|---|
| `minSdk 23` | `sqlite3_flutter_libs` wants 23+. Below that the bundled SQLite loads differently — a whole branch of complexity for a fraction of a percent of devices. |
| `text/*` share filter | Not `*/*`. Advertising every MIME type puts ABH in the share sheet for video files it can do nothing with, which is worse than not appearing. |
| `<queries>` block | Android 11+ package visibility. Without it, opening a captured link does nothing at all — the app cannot see that a browser exists. |
| `values-night/styles.xml` | A dark launch screen. Without it a dark-mode phone flashes white before a near-black app, and the flash is more visible in dark mode than light. |
| `minifyEnabled false` | R8 strips classes Flutter plugins reach by reflection, and it fails **only in release builds**, as missing platform channels. Enable deliberately, with plugin ProGuard rules, once there's a device to test a release build on. |
| Pinned AGP/Kotlin | A toolchain bump arriving on its own is the classic "it built yesterday", and it always lands on whoever is trying to ship. |

## Signing for release

Release currently uses the **debug** signing config so `flutter run --release`
works immediately. That is deliberate and deliberately obvious — a release build
silently signed with a debug key is rejected by Play at the worst possible
moment. Before shipping:

```sh
keytool -genkey -v -keystore ~/abh-upload.jks -keyalg RSA \
        -keysize 2048 -validity 10000 -alias upload
```

Create `android/key.properties` (already gitignored — a keystore in version
control is unrecoverable if the repo ever goes public):

```properties
storePassword=…
keyPassword=…
keyAlias=upload
storeFile=/absolute/path/to/abh-upload.jks
```

Then load it in `app/build.gradle` and point `signingConfig` at it instead of
`signingConfigs.debug`.

## iOS

Not hand-written. Xcode's `project.pbxproj` is hundreds of lines of UUID-keyed
plist where a single wrong reference produces an error that names the wrong
file. Generate it with the toolchain and commit the result:

```sh
cd apps/mobile
flutter create --platforms=ios .
```

Then follow `lib/capture/PLATFORM_SETUP.md` for the Share Extension, which is
the iOS half of the share sheet.
