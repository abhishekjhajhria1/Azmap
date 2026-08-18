package sh.abh.app

import io.flutter.embedding.android.FlutterActivity

/**
 * Deliberately empty.
 *
 * Everything ABH does lives in Dart. Nothing here should grow platform logic:
 * anything added at this layer exists on Android only, and the app has to
 * behave identically on iOS. Platform-specific work belongs in a plugin with a
 * declared interface, not in the activity.
 */
class MainActivity : FlutterActivity()
