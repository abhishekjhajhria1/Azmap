# Volume Bar (Android)

A small native Android app that puts volume controls where you can reach them
without opening anything:

- **In the notification shade.** An always-on, silent notification with a row
  per stream — tap the icon to mute, `−` / `+` to step the volume, with a live
  level bar. Collapsed it shows the first stream; expand it for all of them.
  It stays in sync when the volume changes from the hardware keys or other apps.
- **In the Quick Settings drop-down.** A **Volume** tile. Tap it and sliders for
  every stream open on top of the pulled-down shade. Long-press opens the app.
  The tile's subtitle shows the current media volume.

Streams: Media, Ring, Notifications, Alarm, Call. You choose which appear in the
notification. The notification comes back after a reboot if you left it on.

Kotlin + Material 3 Views, no other dependencies. minSdk 26 (Android 8), target 35.

## Build

Needs JDK 17+ and the Android SDK (set `sdk.dir` in `local.properties` or
`ANDROID_HOME`).

```bash
./gradlew assembleDebug
adb install app/build/outputs/apk/debug/app-debug.apk
```

Or open this folder in Android Studio and hit Run.

## Using it

1. Open **Volume Bar**, turn on *Show volume controls in the notification shade*
   and allow notifications.
2. Tap *Add tile to Quick Settings* (Android 13+), or pull the shade down twice,
   tap the pencil, and drag **Volume** in.

Changing ring/notification volume to or from silent while Do Not Disturb is on
needs Do Not Disturb access; the app sends you to that setting when it's needed.

## How it's put together

| File | Role |
| --- | --- |
| `Volumes.kt` | Wraps `AudioManager`; catches the DND `SecurityException` |
| `VolumeObserver.kt` | Fires on any volume or ringer change, from anywhere |
| `VolumeNotification.kt` | Builds the custom `RemoteViews` notification |
| `VolumeNotificationService.kt` | Foreground service that keeps it alive and current |
| `VolumeActionReceiver.kt` | Handles the notification's buttons |
| `VolumeTileService.kt` | The Quick Settings tile and its slider dialog |
| `VolumePanel.kt` | The slider list, shared by the app screen and the tile dialog |
