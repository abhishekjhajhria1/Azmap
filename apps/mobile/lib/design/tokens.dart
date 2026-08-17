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

/// Reaches the palette without threading it through every constructor.
class AbhTheme extends InheritedWidget {
  const AbhTheme({super.key, required this.colors, required super.child});

  final AbhColors colors;

  static AbhColors of(BuildContext context) {
    final t = context.dependOnInheritedWidgetOfExactType<AbhTheme>();
    assert(t != null, 'No AbhTheme in the tree — wrap the app in AbhTheme.');
    return t!.colors;
  }

  @override
  bool updateShouldNotify(AbhTheme old) => old.colors != colors;
}
