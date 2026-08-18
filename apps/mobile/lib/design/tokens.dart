/// The palette, transliterated from `packages/ui/theme.css`.
///
/// Hand-kept in sync rather than generated, and the values are copied exactly —
/// including the ones that look like they could be rounded. `#fbfbfd` is not
/// `#fcfcfc`: the whole design rests on very small separations between planes,
/// and "close enough" on a background is how a phone ends up looking like a
/// different product from the web app sitting next to it.
///
/// Named for the CSS custom properties so the two can be diffed by eye. If you
/// change a value here, change it there in the same commit.
library;

import 'package:flutter/widgets.dart';

/// Corner radii. Nothing in this product is sharp-cornered.
abstract final class Radii {
  static const pill = 999.0;

  /// Floating panels, docks, rails, sheets.
  static const lg = 26.0;

  /// Cards and stacked lists.
  static const md = 18.0;

  /// Small controls.
  static const sm = 12.0;

  /// How far floating chrome sits off the edge. Chrome never touches an edge.
  static const floatInset = 16.0;
}

class AbhColors {
  const AbhColors({
    required this.bg,
    required this.surface,
    required this.surface2,
    required this.fg,
    required this.fgMuted,
    required this.fgSubtle,
    required this.hairline,
    required this.seam,
    required this.accent,
    required this.accentContrast,
    required this.known,
    required this.available,
    required this.ai,
    required this.danger,
    required this.glassBg,
    required this.glassBorder,
    required this.glassShadow,
    required this.rule,
    required this.ruleStrong,
    required this.contour,
    required this.ambient1,
    required this.ambient2,
    required this.isDark,
  });

  final Color bg;
  final Color surface;
  final Color surface2;
  final Color fg;
  final Color fgMuted;
  final Color fgSubtle;
  final Color hairline;
  final Color seam;

  /// One vivid accent, spent on the single most important thing per screen.
  final Color accent;
  final Color accentContrast;
  final Color known;
  final Color available;

  /// Violet, reserved for AI. Never decoration.
  final Color ai;
  final Color danger;

  final Color glassBg;
  final Color glassBorder;
  final Color glassShadow;

  /// The drawn ground: plotted rules and contour lines.
  final Color rule;
  final Color ruleStrong;
  final Color contour;
  final Color ambient1;
  final Color ambient2;

  final bool isDark;

  /// Returns this palette with a different accent.
  ///
  /// `available` moves with it too: it is the *same* semantic as "open to you
  /// now", and leaving it blue while the accent went green would put two
  /// unrelated blues on the map. `known` stays green and `ai` stays violet —
  /// those are meanings, not decoration, and taste doesn't get a vote.
  AbhColors withAccent(Color value) => AbhColors(
        bg: bg,
        surface: surface,
        surface2: surface2,
        fg: fg,
        fgMuted: fgMuted,
        fgSubtle: fgSubtle,
        hairline: hairline,
        seam: seam,
        accent: value,
        accentContrast: accentContrast,
        known: known,
        available: value,
        ai: ai,
        danger: danger,
        glassBg: glassBg,
        glassBorder: glassBorder,
        glassShadow: glassShadow,
        rule: rule,
        ruleStrong: ruleStrong,
        contour: contour,
        ambient1: ambient1,
        ambient2: ambient2,
        isDark: isDark,
      );

  static const light = AbhColors(
    bg: Color(0xFFFBFBFD),
    surface: Color(0xFFFFFFFF),
    surface2: Color(0xFFF1F2F4),
    fg: Color(0xFF09090B),
    fgMuted: Color(0xFF5C5D64),
    fgSubtle: Color(0xFF8B8C94),
    hairline: Color(0x14000000), // rgba(0,0,0,0.08)
    seam: Color(0x0F000000), // rgba(0,0,0,0.06)
    accent: Color(0xFF0071E3),
    accentContrast: Color(0xFFFFFFFF),
    known: Color(0xFF1A9F57),
    available: Color(0xFF0071E3),
    ai: Color(0xFF7C5CFF),
    danger: Color(0xFFD70015),
    glassBg: Color(0xB8FFFFFF), // rgba(255,255,255,0.72)
    glassBorder: Color(0x12000000), // rgba(0,0,0,0.07)
    glassShadow: Color(0x14000000), // rgba(0,0,0,0.08)
    rule: Color(0x0909090B),
    ruleStrong: Color(0x0F09090B),
    contour: Color(0x0B09090B),
    ambient1: Color(0x120A84FF), // rgba(10,132,255,0.07)
    ambient2: Color(0x0E7C5CFF), // rgba(124,92,255,0.055)
    isDark: false,
  );

  static const dark = AbhColors(
    bg: Color(0xFF08080A),
    surface: Color(0xFF161619),
    surface2: Color(0xFF212126),
    fg: Color(0xFFFAFAFA),
    fgMuted: Color(0xFFA5A5AE),
    fgSubtle: Color(0xFF74747D),
    hairline: Color(0x17FFFFFF), // rgba(255,255,255,0.09)
    seam: Color(0x12FFFFFF), // rgba(255,255,255,0.07)
    accent: Color(0xFF0A84FF),
    accentContrast: Color(0xFFFFFFFF),
    known: Color(0xFF30D158),
    available: Color(0xFF0A84FF),
    ai: Color(0xFFA78BFA),
    danger: Color(0xFFFF453A),
    glassBg: Color(0xA81C1C21), // rgba(28,28,33,0.66)
    glassBorder: Color(0x17FFFFFF),
    glassShadow: Color(0x8C000000), // rgba(0,0,0,0.55)
    rule: Color(0x07FFFFFF),
    ruleStrong: Color(0x0DFFFFFF),
    contour: Color(0x09FFFFFF),
    ambient1: Color(0x290A84FF), // rgba(10,132,255,0.16)
    ambient2: Color(0x217C5CFF), // rgba(124,92,255,0.13)
    isDark: true,
  );
}

/// Type scale.
///
/// Two families, one job each: the serif carries the voice, Inter does the work.
/// Sizes match the web app's `--t-*` tier so a screenshot of one can be laid
/// over the other.
abstract final class AbhText {
  static const display = 'Fraunces';
  static const ui = 'Inter';

  static const hero = TextStyle(
    fontFamily: display,
    fontSize: 40,
    height: 1.08,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.9,
  );
  static const title1 = TextStyle(
    fontFamily: display,
    fontSize: 30,
    height: 1.12,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.6,
  );
  static const title3 = TextStyle(
    fontFamily: ui,
    fontSize: 19,
    height: 1.25,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.3,
  );
  static const headline = TextStyle(
    fontFamily: ui,
    fontSize: 16,
    height: 1.3,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.2,
  );
  static const body = TextStyle(fontFamily: ui, fontSize: 15.5, height: 1.5);

  /// Row metadata and secondary lines.
  static const foot = TextStyle(fontFamily: ui, fontSize: 13, height: 1.4);

  /// Section labels. Subtle by default — an eyebrow is not worth the accent.
  static const eyebrow = TextStyle(
    fontFamily: ui,
    fontSize: 11,
    fontWeight: FontWeight.w600,
    letterSpacing: 1.3,
  );
}

/// Spacing and sizing, driven by the density preference.
///
/// A separate object rather than a multiplier on the token file, because
/// density is not a uniform scale. Row height and vertical rhythm compress a
/// lot; corner radii compress a little; tap targets do not compress **at all**.
/// A "compact" mode that shrinks the hit area is a compact mode that misses,
/// and the 44pt / 48dp floors exist for a physical reason that a preference
/// screen cannot argue with.
class Metrics {
  const Metrics({
    required this.rowPadV,
    required this.rowPadH,
    required this.gap,
    required this.sectionGap,
    required this.pagePadH,
    required this.textScale,
  });

  final double rowPadV;
  final double rowPadH;

  /// Between related elements.
  final double gap;

  /// Between sections of a document.
  final double sectionGap;
  final double pagePadH;

  /// Multiplies the type scale. Small on purpose — big jumps here break the
  /// relationship between the serif display sizes and the body text.
  final double textScale;

  /// The minimum any interactive element may be, in either density. Never
  /// derived from the others.
  static const double tapTarget = 44;

  static const comfortable = Metrics(
    rowPadV: 13,
    rowPadH: 14,
    gap: 10,
    sectionGap: 26,
    pagePadH: 22,
    textScale: 1,
  );

  static const compact = Metrics(
    rowPadV: 8.5,
    rowPadH: 12,
    gap: 6,
    sectionGap: 18,
    pagePadH: 18,
    textScale: 0.94,
  );
}

/// The six accents, checked against both themes.
///
/// Each is a (light, dark) pair rather than one colour used twice: the same hex
/// that reads as confident on white is muddy on near-black, which is why iOS
/// ships two of everything. Graphite is here for people who want no colour at
/// all — it is the accent that admits it isn't one.
/// The accent, and the one place colour is a matter of taste.
///
/// Constrained to six rather than a colour wheel, and every one is checked for
/// contrast against both themes. A free picker guarantees somebody chooses pale
/// yellow, can't read their own primary button, and concludes the app is broken.
enum AccentChoice {
  blue,
  violet,
  green,
  amber,
  rose,
  graphite;

  AccentPair get pair => switch (this) {
        AccentChoice.blue => AccentPair.blue,
        AccentChoice.violet => AccentPair.violet,
        AccentChoice.green => AccentPair.green,
        AccentChoice.amber => AccentPair.amber,
        AccentChoice.rose => AccentPair.rose,
        AccentChoice.graphite => AccentPair.graphite,
      };

  Color resolve(bool dark) => dark ? pair.dark : pair.light;
}

class AccentPair {
  const AccentPair(this.light, this.dark);
  final Color light;
  final Color dark;

  static const blue = AccentPair(Color(0xFF0071E3), Color(0xFF0A84FF));
  static const violet = AccentPair(Color(0xFF6D48D7), Color(0xFFA78BFA));
  static const green = AccentPair(Color(0xFF12855A), Color(0xFF30D158));
  static const amber = AccentPair(Color(0xFF9A6200), Color(0xFFFFB340));
  static const rose = AccentPair(Color(0xFFC0295B), Color(0xFFFF6482));
  static const graphite = AccentPair(Color(0xFF3A3A40), Color(0xFFB8B8C0));
}

/// Reaches the palette without threading it through every constructor.
class AbhTheme extends InheritedWidget {
  const AbhTheme({
    super.key,
    required this.colors,
    required this.metrics,
    required this.motion,
    required super.child,
  });

  final AbhColors colors;
  final Metrics metrics;

  /// False when either the OS or the user has asked for less motion.
  ///
  /// The direction is one-way on purpose: a person who set "Reduce Motion" in
  /// their system settings did so for a reason — often vestibular, sometimes
  /// medical — and no in-app preference gets to override that upward.
  final bool motion;

  static AbhColors of(BuildContext context) => _read(context).colors;
  static Metrics metricsOf(BuildContext context) => _read(context).metrics;
  static bool motionOf(BuildContext context) => _read(context).motion;

  static AbhTheme _read(BuildContext context) {
    final t = context.dependOnInheritedWidgetOfExactType<AbhTheme>();
    assert(t != null, 'No AbhTheme in the tree — wrap the app in AbhTheme.');
    return t!;
  }

  /// A duration that collapses to zero when motion is off, so call sites don't
  /// each have to remember the check.
  static Duration durationOf(BuildContext context, Duration full) =>
      motionOf(context) ? full : Duration.zero;

  @override
  bool updateShouldNotify(AbhTheme old) =>
      old.colors != colors || old.metrics != metrics || old.motion != motion;
}
