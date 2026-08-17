/// ABH, on a phone.
///
/// Built on [WidgetsApp] rather than `MaterialApp`. Material's theming would
/// fight this design at every turn — its elevation model, its ripples, its
/// `ColorScheme` — and the app already has a complete visual language in
/// `design/`. Starting from the smaller widget is less work than overriding
/// the bigger one.
///
/// This file owns four things and delegates the rest: opening the database,
/// resolving preferences into a theme, deciding where the dock sits, and
/// holding which space is on screen.
library;

import 'dart:async';

import 'package:flutter/widgets.dart';

import 'data/database.dart';
import 'data/device_id.dart';
import 'data/map_repository.dart';
import 'design/dock.dart';
import 'design/layout.dart';
import 'design/survey.dart';
import 'design/tokens.dart';
import 'domain/models.dart';
import 'onboarding/onboarding.dart';
import 'prefs/preferences.dart';
import 'settings/settings_sheet.dart';
import 'search/omni.dart';
import 'spaces/brain_space.dart';
import 'spaces/capture_space.dart';
import 'spaces/people_space.dart';
import 'spaces/roadmap_space.dart';
import 'state/map_controller.dart';
import 'sync/sync_controller.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final db = await AbhDatabase.open();
  final deviceId = await loadDeviceId();
  final prefs = await PreferencesController.load();
  final repository = MapRepository(db, deviceId: deviceId);

  // Restored, not awaited. A device with a slow network must not sit on a
  // blank screen while a sync completes — the local map is already on disk and
  // is the thing the user came for.
  final sync = SyncController(repository: repository, deviceId: deviceId);
  unawaited(sync.restore());

  runApp(AbhApp(
    controller: MapController(repository),
    prefs: prefs,
    sync: sync,
  ));
}

class AbhApp extends StatelessWidget {
  const AbhApp({
    super.key,
    required this.controller,
    required this.prefs,
    required this.sync,
  });

  final MapController controller;
  final PreferencesController prefs;
  final SyncController sync;

  @override
  Widget build(BuildContext context) {
    // PrefsScope is above the theme, because the theme is derived *from* the
    // preferences — a change to the accent has to rebuild everything below.
    return PrefsScope(
      controller: prefs,
      child: ListenableBuilder(
        listenable: prefs,
        builder: (context, _) => _Themed(controller: controller, sync: sync),
      ),
    );
  }
}

class _Themed extends StatelessWidget {
  const _Themed({required this.controller, required this.sync});

  final MapController controller;
  final SyncController sync;

  @override
  Widget build(BuildContext context) {
    final p = PrefsScope.valueOf(context);
    final systemDark =
        WidgetsBinding.instance.platformDispatcher.platformBrightness ==
            Brightness.dark;

    final dark = switch (p.theme) {
      ThemeChoice.system => systemDark,
      ThemeChoice.light => false,
      ThemeChoice.dark => true,
    };

    final base = dark ? AbhColors.dark : AbhColors.light;
    final colors = base.withAccent(p.accent.resolve(dark));
    final metrics =
        p.density == Density.compact ? Metrics.compact : Metrics.comfortable;

    // Motion is one-way: the OS setting can turn it off, the app preference can
    // only also turn it off. Someone who asked their phone for less motion
    // usually did so for a vestibular or medical reason, and an app preference
    // does not get to override that upward.
    // Read off the platform dispatcher, not MediaQuery: this widget sits
    // ABOVE WidgetsApp, which is what creates the MediaQuery — so
    // `MediaQuery.maybeOf` here is always null and the system setting would
    // have been silently ignored.
    final systemWantsMotion = !WidgetsBinding
        .instance.platformDispatcher.accessibilityFeatures.disableAnimations;
    final motion = systemWantsMotion && !p.reduceMotion;

    return AbhTheme(
      colors: colors,
      metrics: metrics,
      motion: motion,
      child: WidgetsApp(
        title: 'ABH',
        color: colors.accent,
        textStyle: AbhText.body.copyWith(color: colors.fg),
        // Explicit Directionality: WidgetsApp in builder-only mode does not
        // reliably supply one, and every Text below would throw "No
        // Directionality widget found". Harmless if it turns out redundant.
        builder: (context, _) => Directionality(
          textDirection: TextDirection.ltr,
          child: MapScope(
            controller: controller,
            child: SyncScope(controller: sync, child: const _Root()),
          ),
        ),
      ),
    );
  }
}

/// Onboarding or the app.
///
/// Gated on the stored flag rather than on "is the map empty", so someone who
/// clears their map doesn't get the setup questions again — and so "Run the
/// setup questions again" in Settings actually works.
class _Root extends StatelessWidget {
  const _Root();

  @override
  Widget build(BuildContext context) {
    final prefs = PrefsScope.of(context);
    final showGround = prefs.value.showGround;

    final body = prefs.value.onboarded
        ? const _Shell()
        : Onboarding(onDone: prefs.update);

    // The ground is behind both, so onboarding is visibly the same app — and
    // toggling it on the last question changes what you are already looking at.
    return showGround ? SurveyGround(child: body) : _PlainGround(child: body);
  }
}

/// The ground, off. A flat fill rather than nothing, because a transparent
/// root would show whatever the platform paints behind the Flutter view.
class _PlainGround extends StatelessWidget {
  const _PlainGround({required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) =>
      ColoredBox(color: AbhTheme.of(context).bg, child: child);
}

class _Shell extends StatefulWidget {
  const _Shell();

  @override
  State<_Shell> createState() => _ShellState();
}

class _ShellState extends State<_Shell> {
  Space? _space;
  List<Topic> _celebrating = const [];
  bool _settingsOpen = false;

  /// The home-space preference is a *starting* point, not a permanent binding —
  /// so it seeds this once and then the user's taps own it. Re-reading the
  /// preference on every build would snap them back to Roadmap mid-session.
  Space get _current =>
      _space ??
      switch (PrefsScope.valueOf(context).homeSpace) {
        HomeSpace.brain => Space.brain,
        HomeSpace.roadmap => Space.roadmap,
        HomeSpace.capture => Space.capture,
      };

  @override
  Widget build(BuildContext context) {
    final safe = MediaQuery.paddingOf(context);
    final size = MediaQuery.sizeOf(context);
    final p = PrefsScope.valueOf(context);
    final dockHeight = (size.width < 600 ? 52.0 : 46.0) + 12;

    // Auto: thumb reach on a phone, top on a tablet where the bottom of a 13"
    // screen is nowhere near anybody's hands.
    final atTop = switch (p.dock) {
      DockPosition.top => true,
      DockPosition.bottom => false,
      DockPosition.auto => size.shortestSide >= 600,
    };

    var dockOffset =
        (atTop ? safe.top : safe.bottom) + Radii.floatInset;

    // Foldables: keep the dock clear of the hinge. A control under a physical
    // seam is unreadable or untappable depending on the device, and both look
    // like a broken app rather than unusual hardware.
    for (final feature in MediaQuery.displayFeaturesOf(context)) {
      final hinge = feature.bounds;
      if (hinge.width < hinge.height) continue; // vertical hinge: dock spans it
      final top = atTop ? dockOffset : size.height - dockOffset - dockHeight;
      if (!hinge.overlaps(Rect.fromLTWH(0, top, size.width, dockHeight))) {
        continue;
      }
      dockOffset = atTop
          ? hinge.bottom + Radii.floatInset
          : size.height - hinge.top + Radii.floatInset;
    }

    final clearance = dockOffset + dockHeight + 16;

    return Stack(
      children: [
        Positioned.fill(
          child: Padding(
            // Content clears the dock. Chrome floats over content, but content
            // must always be reachable — the last row of a list trapped under
            // the dock is the classic version of this bug.
            padding: EdgeInsets.only(
              top: atTop ? clearance : safe.top + 20,
              bottom: atTop ? safe.bottom + 20 : clearance,
            ),
            // DocColumn caps the line length. Without it a 1024pt iPad renders
            // body text at ~150 characters per line, which is roughly double
            // what anyone can read without losing their place.
            child: DocColumn(child: _spaceFor(_current)),
          ),
        ),

        Positioned(
          left: Radii.floatInset,
          right: Radii.floatInset,
          top: atTop ? dockOffset : null,
          bottom: atTop ? null : dockOffset,
          child: FloatingDock(
            active: _current,
            onSelect: (s) => setState(() => _space = s),
            onLongPress: () => setState(() => _settingsOpen = true),
          ),
        ),

        // Opposite the dock, so a thumb never has to choose between them.
        Positioned(
          right: Radii.floatInset,
          top: atTop ? null : safe.top + Radii.floatInset,
          bottom: atTop ? safe.bottom + Radii.floatInset : clearance,
          child: Align(
            alignment: atTop ? Alignment.bottomRight : Alignment.topRight,
            child: OmniSearch(
              onOpenTopic: (topic) => setState(() => _space = Space.brain),
            ),
          ),
        ),

        if (_celebrating.isNotEmpty)
          Positioned.fill(
            child: _Celebration(
              unlocked: _celebrating,
              onDone: () => setState(() => _celebrating = const []),
            ),
          ),

        if (_settingsOpen)
          Positioned.fill(
            child: SettingsSheet(
              onClose: () => setState(() => _settingsOpen = false),
            ),
          ),
      ],
    );
  }

  Widget _spaceFor(Space space) => switch (space) {
        Space.brain => const BrainSpace(),
        Space.roadmap => RoadmapSpace(
            onCelebrate: (unlocked) {
              if (unlocked.isEmpty) return;
              setState(() => _celebrating = unlocked);
            },
          ),
        Space.capture => const CaptureSpace(),
        Space.people => PeopleSpace(
            onOpenSettings: () => setState(() => _settingsOpen = true),
          ),
      };
}

/// The one moment the app raises its voice.
///
/// Finishing a topic that opens up three more is the product's whole promise
/// landing at once, and it deserves to be *seen* rather than logged in a toast
/// that slides away while you're still reading it.
///
/// Dismissed by tapping anywhere, and it never blocks: the map underneath is
/// already updated, so a user who taps straight through loses nothing.
class _Celebration extends StatelessWidget {
  const _Celebration({required this.unlocked, required this.onDone});

  final List<Topic> unlocked;
  final VoidCallback onDone;

  @override
  Widget build(BuildContext context) {
    final c = AbhTheme.of(context);
    return GestureDetector(
      onTap: onDone,
      child: ColoredBox(
        color: c.bg.withValues(alpha: 0.86),
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 34),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  unlocked.length == 1
                      ? 'That opened something up.'
                      : 'That opened up ${unlocked.length} things.',
                  textAlign: TextAlign.center,
                  style: AbhText.title1.copyWith(color: c.fg),
                ),
                const SizedBox(height: 18),
                for (final t in unlocked.take(4))
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 5),
                    child: Text(
                      t.title,
                      textAlign: TextAlign.center,
                      style: AbhText.headline.copyWith(color: c.accent),
                    ),
                  ),
                const SizedBox(height: 26),
                Text('Tap to carry on',
                    style: AbhText.foot.copyWith(color: c.fgSubtle)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
