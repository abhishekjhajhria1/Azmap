/// Receiving things shared from other apps.
///
/// ## Why this matters more than it looks
///
/// Nobody opens a notes app to save an article. They are already reading it, in
/// Chrome or YouTube or a PDF viewer, and they hit Share. That is the capture
/// path people actually use on a phone — the in-app text field is the fallback,
/// not the main event.
///
/// The browser extension has had this from the start. Until now the phone
/// hadn't, which made mobile a second-class citizen in its own ecosystem: you
/// could capture on a laptop and read on a phone, but not the reverse.
///
/// ## Two streams, and handling only one is the classic bug
///
///   - **Cold start.** The app was not running; the OS launches it *with* the
///     payload. `getInitialMedia()` returns it exactly once.
///   - **Warm.** The app is already alive; the payload arrives on a stream.
///
/// Implement only the stream and every share that launches the app is silently
/// dropped — which is most of them, because the app is usually not running when
/// you hit Share.
///
/// Fire-and-forget throughout. A capture must never block on the network and
/// the share sheet must close instantly: an app that makes you wait after
/// tapping Share is one you stop sharing to.
library;

import 'dart:async';

import 'package:receive_sharing_intent/receive_sharing_intent.dart';

import '../state/map_controller.dart';

class ShareTarget {
  ShareTarget({required this.map, required this.onCaptured});

  final MapController map;

  /// Called after something lands, so the shell can show it arriving. Being
  /// told "saved" is what makes the round trip feel finished.
  final void Function(int count) onCaptured;

  StreamSubscription<List<SharedMediaFile>>? _subscription;

  Future<void> start() async {
    // Warm: the app is already running.
    _subscription = ReceiveSharingIntent.instance.getMediaStream().listen(
      _accept,
      // A malformed share is not worth a crash in a handler nobody can see.
      // Losing one capture beats losing the app.
      onError: (_) {},
    );

    // Cold: the app was launched *by* the share. Returns once, and must be
    // reset or it replays on every later launch — a stale article reappearing
    // days afterwards reads as the app inventing things.
    final initial = await ReceiveSharingIntent.instance.getInitialMedia();
    if (initial.isNotEmpty) {
      _accept(initial);
      ReceiveSharingIntent.instance.reset();
    }
  }

  void _accept(List<SharedMediaFile> items) {
    var saved = 0;

    for (final item in items) {
      final value = item.path.trim();
      if (value.isEmpty) continue;

      final isUrl = RegExp(r'^https?://', caseSensitive: false).hasMatch(value);
      map.addCapture(
        kind: isUrl ? 'page' : 'note',
        // A shared URL usually arrives with no title — the sending app rarely
        // passes one. The link itself is a better row label than "Untitled",
        // and LocalMind strips site furniture out of it later anyway.
        title: (item.message?.trim().isNotEmpty ?? false)
            ? item.message!.trim()
            : value,
        url: isUrl ? value : null,
        text: isUrl ? '' : value,
      );
      saved++;
    }

    if (saved > 0) onCaptured(saved);
  }

  void dispose() => _subscription?.cancel();
}
