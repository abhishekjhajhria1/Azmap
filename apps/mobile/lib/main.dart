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

import 'package:flutter/services.dart';
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
import 'settings/pairing_sheet.dart';
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
  final map = MapController(repository);
  final sync = SyncController(
    repository: repository,
    deviceId: deviceId,
    // The link that makes the ecosystem real: records arriving from a laptop
    // or the browser extension repaint the phone without a restart.
    onRemoteChange: map.reloadFromDisk,
  );
  unawaited(sync.restore());

  runApp(AbhApp(
    controller: map,
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
  bool _pairingOpen = false;

  /// Set when a search result is chosen, so Brain opens *on* that node rather
  /// than dumping you on the map to find it again yourself. A search that
  /// navigates to the right screen and then abandons you is barely a search.
  String? _focusTopicId;

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
            // On a tablet the leftover width becomes a second column rather
            // than empty margin — the difference between "designed for tablet"
            // and "phone, stretched". Below that width the detail pane is
            // dropped, not stacked: stacking buries it under a screen of
            // scrolling, which is worse than absent.
            child: TwoPane(
              primary: DocColumn(child: _spaceFor(_current)),
              detail: _ContextPane(
                onCelebrate: (unlocked) {
                  if (unlocked.isEmpty) return;
                  setState(() => _celebrating = unlocked);
                },
              ),
            ),
          ),
        ),

        Positioned(
          left: Radii.floatInset,
          right: Radii.floatInset,
          top: atTop ? dockOffset : null,
          bottom: atTop ? null : dockOffset,
          child: FloatingDock(
            active: _current,
            onSelect: (s) {
              // A light tick on every space change. Cheap, and it is most of
              // what separates an app that feels built from one that feels
              // assembled — the dock now confirms itself before the pixels do.
              HapticFeedback.selectionClick();
              setState(() => _space = s);
            },
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
              onOpenTopic: (topic) => setState(() {
                _space = Space.brain;
                _focusTopicId = topic.id;
              }),
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
              onOpenPairing: () => setState(() => _pairingOpen = true),
            ),
          ),

        if (_pairingOpen)
          Positioned.fill(
            child: PairingSheet(
              onClose: () => setState(() => _pairingOpen = false),
            ),
          ),
      ],
    );
  }

  Widget _spaceFor(Space space) => switch (space) {
        Space.brain => BrainSpace(
            focusTopicId: _focusTopicId,
            // Cleared once consumed, so the node isn't re-selected every time
            // you come back to the map an hour later.
            onFocusConsumed: () => setState(() => _focusTopicId = null),
          ),
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
class _Celebration extends StatefulWidget {
  const _Celebration({required this.unlocked, required this.onDone});

  final List<Topic> unlocked;
  final VoidCallback onDone;

  @override
  State<_Celebration> createState() => _CelebrationState();
}

/// The one moment the app raises its voice.
///
/// Finishing a topic that opens three more is the whole promise landing at
/// once, and it deserves to be *staged* rather than logged in a toast that
/// slides away while you're still reading it.
///
/// The staging is a stagger: the headline settles, then each unlocked topic
/// arrives 70ms behind the last. That cadence is the entire effect — showing
/// all four at once reads as a dialog, while showing them in sequence reads as
/// doors opening, which is what actually happened to the map.
///
/// It never blocks. The map underneath is already updated, so tapping straight
/// through costs nothing, and the whole thing is skippable by design — a
/// reward you cannot dismiss stops being a reward around the fourth time.
class _CelebrationState extends State<_Celebration>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 900),
  );

  bool _started = false;

  @override
  void initState() {
    super.initState();
    HapticFeedback.heavyImpact();
  }

  /// Not `initState`: reading an InheritedWidget there is illegal —
  /// `dependOnInheritedWidgetOfExactType` needs the element to be mounted in
  /// the tree, and Flutter asserts on it. `didChangeDependencies` is the first
  /// callback where the theme is legitimately readable.
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    // Jumped to the end when motion is off, so the content is simply *there*.
    // Reduced motion means no movement, never no information.
    if (AbhTheme.motionOf(context)) {
      _controller.forward();
    } else {
      _controller.value = 1;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  /// A window of the timeline for item [i], each starting after the last.
  Animation<double> _step(int i) => CurvedAnimation(
        parent: _controller,
        curve: Interval(
          (0.18 + i * 0.14).clamp(0.0, 0.85),
          (0.5 + i * 0.14).clamp(0.15, 1.0),
          // Slight overshoot: things that arrive land, they don't glide to a
          // halt. It's the difference between a spring and a fade.
          curve: Curves.easeOutBack,
        ),
      );

  @override
  Widget build(BuildContext context) {
    final c = AbhTheme.of(context);
    final shown = widget.unlocked.take(4).toList();

    return GestureDetector(
      onTap: widget.onDone,
      child: ColoredBox(
        color: c.bg.withValues(alpha: 0.92),
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 34),
            child: AnimatedBuilder(
              animation: _controller,
              builder: (context, _) => Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _Rise(
                    t: CurvedAnimation(
                      parent: _controller,
                      curve: const Interval(0, 0.4, curve: Curves.easeOutCubic),
                    ).value,
                    child: Text(
                      widget.unlocked.length == 1
                          ? 'That opened something up.'
                          : 'That opened up ${widget.unlocked.length} things.',
                      textAlign: TextAlign.center,
                      style: AbhText.title1.copyWith(color: c.fg),
                    ),
                  ),
                  const SizedBox(height: 20),
                  for (var i = 0; i < shown.length; i++)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 5),
                      child: _Rise(
                        t: _step(i).value,
                        child: Text(
                          shown[i].title,
                          textAlign: TextAlign.center,
                          style: AbhText.headline.copyWith(color: c.accent),
                        ),
                      ),
                    ),
                  const SizedBox(height: 28),
                  _Rise(
                    t: CurvedAnimation(
                      parent: _controller,
                      curve: const Interval(0.65, 1),
                    ).value,
                    child: Text('Tap to carry on',
                        style: AbhText.foot.copyWith(color: c.fgSubtle)),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Fade and lift, driven by a 0–1 value. Opacity and transform only — anything
/// that triggers layout here would drop the frames this exists to spend well.
class _Rise extends StatelessWidget {
  const _Rise({required this.t, required this.child});

  final double t;
  final Widget child;

  @override
  Widget build(BuildContext context) => Opacity(
        opacity: t.clamp(0.0, 1.0),
        child: Transform.translate(
          offset: Offset(0, (1 - t.clamp(0.0, 1.0)) * 14),
          child: child,
        ),
      );
}

/// The second column on a tablet: what to do now, and what you just saved.
///
/// Deliberately *not* a duplicate of whatever is on the left. A two-pane layout
/// that shows the same list twice is worse than one column, because it spends
/// half the screen confirming what you can already see. This answers the
/// question the primary pane doesn't: of everything open to me, what next?
class _ContextPane extends StatelessWidget {
  const _ContextPane({required this.onCelebrate});

  final ValueChanged<List<Topic>> onCelebrate;

  @override
  Widget build(BuildContext context) {
    final c = AbhTheme.of(context);
    final m = AbhTheme.metricsOf(context);
    final map = MapScope.of(context);
    final open = map.availableNow;

    return ListView(
      padding: EdgeInsets.symmetric(horizontal: m.pagePadH),
      children: [
        Text('OPEN TO YOU', style: AbhText.eyebrow.copyWith(color: c.fgSubtle)),
        SizedBox(height: m.gap),

        if (open.isEmpty)
          Text(
            map.topics.isEmpty
                ? 'Nothing on your map yet.'
                : "You've cleared everything that was open.",
            style: AbhText.body.copyWith(color: c.fgMuted),
          )
        else
          Stacked(
            children: [
              for (final t in open.take(5))
                GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () {
                    HapticFeedback.mediumImpact();
                    onCelebrate(map.complete(t.id));
                  },
                  child: ScaledBox(
                    height: 52,
                    alignment: Alignment.centerLeft,
                    padding: EdgeInsets.symmetric(
                        horizontal: m.rowPadH, vertical: m.rowPadV),
                    child: Text(
                      t.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: AbhText.body.copyWith(color: c.fg),
                    ),
                  ),
                ),
            ],
          ),

        SizedBox(height: m.sectionGap),
        Text('JUST SAVED', style: AbhText.eyebrow.copyWith(color: c.fgSubtle)),
        SizedBox(height: m.gap),

        if (map.captures.isEmpty)
          Text('Nothing captured yet.',
              style: AbhText.body.copyWith(color: c.fgMuted))
        else
          Stacked(
            children: [
              for (final capture in map.captures.take(4))
                Padding(
                  padding: EdgeInsets.symmetric(
                      horizontal: m.rowPadH, vertical: m.rowPadV),
                  child: Text(
                    capture.title.isEmpty
                        ? (capture.url ?? 'Untitled')
                        : capture.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AbhText.foot.copyWith(color: c.fgMuted),
                  ),
                ),
            ],
          ),
      ],
    );
  }
}
