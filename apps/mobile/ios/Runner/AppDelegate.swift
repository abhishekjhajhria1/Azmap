import Flutter
import UIKit

/// Deliberately minimal.
///
/// Everything ABH does lives in Dart. Nothing here should grow platform logic:
/// anything added at this layer exists on iOS only, and the app has to behave
/// identically on Android. Platform-specific work belongs in a plugin with a
/// declared interface, not in the app delegate.
@main
@objc class AppDelegate: FlutterAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    GeneratedPluginRegistrant.register(with: self)
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}
