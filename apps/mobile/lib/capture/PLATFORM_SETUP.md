# Share-sheet setup (native, one-time)

`receive_sharing_intent` needs platform manifests that `flutter create` does not
generate. None of it is Dart, which is why it lives in a note — and why it is
the first thing that will appear not to work if skipped. The Dart side is
complete and stays silent until the OS is told this app can receive shares.

## Android — `android/app/src/main/AndroidManifest.xml`

Inside the existing `<activity>`:

```xml
<intent-filter>
    <action android:name="android.intent.action.SEND" />
    <category android:name="android.intent.category.DEFAULT" />
    <data android:mimeType="text/*" />
</intent-filter>
<intent-filter>
    <action android:name="android.intent.action.SEND_MULTIPLE" />
    <category android:name="android.intent.category.DEFAULT" />
    <data android:mimeType="text/*" />
</intent-filter>
```

`text/*` rather than `*/*`: ABH captures links and notes. Advertising every MIME
type puts it in the share sheet for video files it can do nothing useful with,
which is worse than not appearing at all.

## iOS

1. Add a **Share Extension** target in Xcode named `Share Extension`.
2. The app and the extension need the same **App Group**
   (`group.sh.abh.share`) — that shared container is how the extension hands the
   payload to the app.
3. In the extension's `Info.plist`, accept text and URLs only:

```xml
<key>NSExtensionActivationSupportsText</key><true/>
<key>NSExtensionActivationSupportsWebURLWithMaxCount</key><integer>1</integer>
```

4. Set `CFBundleURLSchemes` to `ShareMedia-$(PRODUCT_BUNDLE_IDENTIFIER)`.

Copy the extension's Swift and plist contents from the package's own README
rather than from here, so a version bump doesn't leave this note quietly wrong.

## Verifying it

Share a link from Chrome. It should land in Capture without the app visibly
loading a screen first. Test **both** paths — ABH closed (cold start) and ABH
already open (warm stream). Only one working is the usual bug, and the cold path
matters most: the app is normally not running when you hit Share.
