/// ABH, on a phone.
///
/// Built on [WidgetsApp] rather than `MaterialApp`. Material's theming would
/// fight this design at every turn — its elevation model, its ripples, its
/// `ColorScheme` — and the app already has a complete visual language in
/// `design/`. Starting from the smaller widget is less work than overriding
/// the bigger one.
///
/// This file owns three things and delegates everything else: opening the
/// database, deciding where the dock sits, and holding which space is on
/// screen.
library;

import 'package:flutter/widgets.dart';

import 'data/database.dart';
import 'data/device_id.dart';
import 'data/map_repository.dart';
import 'design/dock.dart';
import 'design/survey.dart';
import 'design/tokens.dart';
import 'domain/models.dart';
import 'spaces/brain_space.dart';
import 'spaces/capture_space.dart';
import 'spaces/people_space.dart';
import 'spaces/roadmap_space.dart';
import 'state/map_controller.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final db = await AbhDatabase.open();
  final deviceId = await loadDeviceId();
  runApp(AbhApp(controller: MapController(MapRepository(db, deviceId: deviceId))));
}

class AbhApp extends StatelessWidget {
  const AbhApp({super.key, required this.controller});

  final MapController controller;

  @override
  Widget build(BuildContext context) {
    // Follow the system until there's a stored preference to read.
    final dark = WidgetsBinding.instance.platformDispatcher.platformBrightness ==
        Brightness.dark;
    final colors = dark ? AbhColors.dark : AbhColors.light;

    return AbhTheme(
      colors: colors,
      child: WidgetsApp(
        title: 'ABH',
        color: colors.accent,
        textStyle: AbhText.body.copyWith(color: colors.fg),
        // Explicit Directionality: WidgetsApp in builder-only mode does not
        // reliably supply one, and every Text below would throw "No
        // Directionality widget found". Harmless if it turns out redundant.
        builder: (context, _) => Directionality(
          textDirection: TextDirection.ltr,
          child: MapScope(controller: controller, child: const _Shell()),
        ),
      ),
    );
  }
}

class _Shell extends StatefulWidget {
  const _Shell();

  @override
  State<_Shell> createState() => _ShellState();
}

class _ShellState extends State<_Shell> {
  Space _space = Space.roadmap;
  List<Topic> _celebrating = const [];

  @override
  Widget build(BuildContext context) {
    final safe = MediaQuery.paddingOf(context);
    final size = MediaQuery.sizeOf(context);

    // Foldables: keep the dock clear of the hinge. A control that lands under
    // a physical seam is either unreadable or untappable depending on the
    // device, and both look like the app is broken rather than the hardware
    // being unusual.
    var dockBottom = safe.bottom + Radii.floatInset;
    for (final feature in MediaQuery.displayFeaturesOf(context)) {
      final hinge = feature.bounds;
      // Only horizontal hinges matter here — a vertical one splits left/right
      // and the dock spans both halves anyway.
      if (hinge.width < hinge.height) continue;
      final dockTop = size.height - dockBottom - _dockHeight(size.width);
      if (hinge.overlaps(Rect.fromLTWH(0, dockTop, size.width, _dockHeight(size.width)))) {
        dockBottom = size.height - hinge.top + Radii.floatInset;
      }
    }

    return SurveyGround(
      child: Stack(
        children: [
          Positioned.fill(
            child: Padding(
              // Content clears the dock. Chrome floats over content, but
              // content must always be reachable — the last row of a list
              // trapped under the dock is the classic version of this bug.
              padding: EdgeInsets.only(
                top: safe.top + 20,
                bottom: dockBottom + _dockHeight(size.width) + 16,
              ),
              child: _spaceFor(_space),
            ),
          ),

          Positioned(
            left: Radii.floatInset,
            right: Radii.floatInset,
            bottom: dockBottom,
            child: FloatingDock(
              active: _space,
              onSelect: (s) => setState(() => _space = s),
            ),
          ),

          if (_celebrating.isNotEmpty)
            Positioned.fill(
              child: _Celebration(
                unlocked: _celebrating,
                onDone: () => setState(() => _celebrating = const []),
              ),
            ),
        ],
      ),
    );
  }

  double _dockHeight(double width) => (width < 600 ? 52 : 46) + 12;

  Widget _spaceFor(Space space) => switch (space) {
        Space.brain => const BrainSpace(),
        Space.roadmap => RoadmapSpace(
            onCelebrate: (unlocked) {
              if (unlocked.isEmpty) return;
              setState(() => _celebrating = unlocked);
            },
          ),
        Space.capture => const CaptureSpace(),
        Space.people => const PeopleSpace(),
      };
}

/// The one moment the app raises its voice.
///
/// Finishing a topic that opens up three more is the product's whole promise
/// landing at once, and it deserves to be *seen* rather than logged in a
/// toast that slides away while you're still reading it.
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
