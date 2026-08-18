/// How this person wants the app to behave.
///
/// ## Why these settings and not others
///
/// Every one of these changes something a learner actually *feels*, and each
/// exists because two reasonable people want opposite things from it. That was
/// the filter: a preference that everybody would set the same way isn't a
/// preference, it's a bug in the default.
///
/// The one worth arguing about is [progressStyle]. Streaks are the most
/// effective retention mechanic in consumer software and they are also actively
/// harmful to a real fraction of people: miss a day, watch a number you cared
/// about reset, quit the app entirely rather than face it. Both effects are
/// real, and neither is the "wrong" kind of user. So it is a choice — and
/// "nothing" is a first-class option, not a hidden escape hatch.
///
/// ## What is deliberately NOT here
///
/// No personality quiz. "Are you a Visual Learner or an Analytical Learner"
/// produces a label that predicts nothing, and the learning-styles theory it
/// borrows from doesn't replicate. Every question in onboarding is instead
/// about an observable preference — how dense, how much explanation, what to
/// open first — shown live so the answer is visible rather than promised.
///
/// Nothing here is a lock-in. Every value is reachable from Settings, and the
/// onboarding copy says so, because a first-run choice someone feels stuck with
/// is worse than no choice at all.
library;

import 'dart:async';
import 'dart:convert';

import 'package:flutter/widgets.dart';
import 'package:shared_preferences/shared_preferences.dart';

// AccentChoice lives with the palette it selects from, not here — it is a
// design token that happens to be user-settable, not a setting that happens
// to be a colour.
import '../design/tokens.dart';

/// How much fits on a screen.
///
/// Not a cosmetic scale factor: `compact` genuinely changes what a screen is
/// for. Someone reviewing sixty chemistry chapters wants to see thirty of them
/// at once; someone working through one hard idea wants room around it.
enum Density { comfortable, compact }

/// How much the app explains itself.
///
/// The same "why this matters" line is scaffolding to one person and clutter to
/// another, and which one you are changes over time — usually within a fortnight
/// of starting. So it moves.
enum Guidance {
  /// Full prose: why it matters, what it unlocks, coaching in empty states.
  full,

  /// Titles and structure. Explanations on tap.
  quiet,
}

/// What the app counts at you.
enum ProgressStyle {
  /// Consecutive days. Motivating right up until the day it isn't.
  streak,

  /// Share of the map known. Monotonic — it can only go up.
  percent,

  /// Nothing. The map is its own progress bar.
  none,
}

/// Which space opens on launch. People have genuinely different centres of
/// gravity: the map, the path, or the inbox.
enum HomeSpace { brain, roadmap, capture }

enum ThemeChoice { system, light, dark }

/// Where the dock sits. Bottom for thumbs on a phone, top on a tablet where
/// the bottom of a 13" screen is nowhere near your hands.
enum DockPosition { auto, bottom, top }

class Preferences {
  const Preferences({
    this.density = Density.comfortable,
    this.guidance = Guidance.full,
    this.progressStyle = ProgressStyle.percent,
    this.homeSpace = HomeSpace.roadmap,
    this.theme = ThemeChoice.system,
    this.dock = DockPosition.auto,
    this.accent = AccentChoice.blue,
    this.reduceMotion = false,
    this.showGround = true,
    this.onboarded = false,
    this.name = '',
  });

  final Density density;
  final Guidance guidance;
  final ProgressStyle progressStyle;
  final HomeSpace homeSpace;
  final ThemeChoice theme;
  final DockPosition dock;
  final AccentChoice accent;

  /// User-level override on top of the system setting. It can only ever *add*
  /// restraint — see `motionEnabled` in `AbhTheme`. Someone who has asked the
  /// OS for less motion never gets more because an app preference said so.
  final bool reduceMotion;

  /// The drawn survey field. On by default because it is the app's identity,
  /// off for anyone who wants a plain sheet — and it is the single cheapest
  /// thing to disable on an old device.
  final bool showGround;

  final bool onboarded;
  final String name;

  Preferences copyWith({
    Density? density,
    Guidance? guidance,
    ProgressStyle? progressStyle,
    HomeSpace? homeSpace,
    ThemeChoice? theme,
    DockPosition? dock,
    AccentChoice? accent,
    bool? reduceMotion,
    bool? showGround,
    bool? onboarded,
    String? name,
  }) =>
      Preferences(
        density: density ?? this.density,
        guidance: guidance ?? this.guidance,
        progressStyle: progressStyle ?? this.progressStyle,
        homeSpace: homeSpace ?? this.homeSpace,
        theme: theme ?? this.theme,
        dock: dock ?? this.dock,
        accent: accent ?? this.accent,
        reduceMotion: reduceMotion ?? this.reduceMotion,
        showGround: showGround ?? this.showGround,
        onboarded: onboarded ?? this.onboarded,
        name: name ?? this.name,
      );

  Map<String, dynamic> toJson() => {
        'density': density.name,
        'guidance': guidance.name,
        'progressStyle': progressStyle.name,
        'homeSpace': homeSpace.name,
        'theme': theme.name,
        'dock': dock.name,
        'accent': accent.name,
        'reduceMotion': reduceMotion,
        'showGround': showGround,
        'onboarded': onboarded,
        'name': name,
      };

  /// Every field falls back to its default independently.
  ///
  /// A stored blob written by an older build is missing whatever was added
  /// since, and a version that threw — or reset everything — would wipe a
  /// person's setup on upgrade. Per-field fallback means a new preference
  /// simply arrives at its default and the rest survives.
  factory Preferences.fromJson(Map<String, dynamic> j) => Preferences(
        density: _byName(Density.values, j['density'], Density.comfortable),
        guidance: _byName(Guidance.values, j['guidance'], Guidance.full),
        progressStyle: _byName(
            ProgressStyle.values, j['progressStyle'], ProgressStyle.percent),
        homeSpace: _byName(HomeSpace.values, j['homeSpace'], HomeSpace.roadmap),
        theme: _byName(ThemeChoice.values, j['theme'], ThemeChoice.system),
        dock: _byName(DockPosition.values, j['dock'], DockPosition.auto),
        accent: _byName(AccentChoice.values, j['accent'], AccentChoice.blue),
        reduceMotion: j['reduceMotion'] as bool? ?? false,
        showGround: j['showGround'] as bool? ?? true,
        onboarded: j['onboarded'] as bool? ?? false,
        name: j['name'] as String? ?? '',
      );
}

T _byName<T extends Enum>(List<T> values, Object? raw, T fallback) {
  if (raw is! String) return fallback;
  for (final v in values) {
    if (v.name == raw) return v;
  }
  return fallback;
}

/// Holds and persists the preferences.
///
/// Writes are fire-and-forget: a preference change must repaint on the same
/// frame it was tapped. Waiting on the disk to confirm a radio button is how a
/// settings screen ends up feeling laggy, and the worst case if a write is lost
/// is that one toggle reverts on next launch.
class PreferencesController extends ChangeNotifier {
  PreferencesController(this._prefs, this._value);

  static const _key = 'abh.preferences';

  final SharedPreferences _prefs;
  Preferences _value;

  Preferences get value => _value;

  static Future<PreferencesController> load() async {
    final store = await SharedPreferences.getInstance();
    final raw = store.getString(_key);
    if (raw == null) return PreferencesController(store, const Preferences());
    try {
      return PreferencesController(
        store,
        Preferences.fromJson(jsonDecode(raw) as Map<String, dynamic>),
      );
    } catch (_) {
      // Corrupt JSON is not worth a crash loop on launch. Defaults, and the
      // next write repairs the file.
      return PreferencesController(store, const Preferences());
    }
  }

  void update(Preferences next) {
    _value = next;
    notifyListeners();
    // `unawaited` from dart:async, not a hand-rolled no-op: it documents intent
    // and keeps `unawaited_futures: error` on, which is worth having because an
    // unawaited write in the *data* layer is a lost record.
    unawaited(_prefs.setString(_key, jsonEncode(next.toJson())));
  }

  /// Convenience for the common "change one thing" case.
  void patch(Preferences Function(Preferences) change) => update(change(_value));
}

class PrefsScope extends InheritedNotifier<PreferencesController> {
  const PrefsScope({
    super.key,
    required PreferencesController controller,
    required super.child,
  }) : super(notifier: controller);

  static PreferencesController of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<PrefsScope>();
    assert(scope != null, 'No PrefsScope in the tree.');
    return scope!.notifier!;
  }

  static Preferences valueOf(BuildContext context) => of(context).value;
}
