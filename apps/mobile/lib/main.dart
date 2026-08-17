/// ABH, on a phone.
///
/// Deliberately built on [WidgetsApp] rather than `MaterialApp`. Material's
/// theming would fight this design at every turn — its elevation model, its
/// ripples, its `ColorScheme` — and the app already has a complete visual
/// language in `design/`. Starting from the smaller widget is less work than
/// overriding the bigger one.
///
/// Navigation is a dock, not a tab bar: on phones and folds the dock is the
/// only option, matching the web app's compact breakpoint exactly.
library;

import 'package:flutter/widgets.dart';

import 'design/survey.dart';
import 'design/tokens.dart';

void main() => runApp(const AbhApp());

class AbhApp extends StatelessWidget {
  const AbhApp({super.key});

  @override
  Widget build(BuildContext context) {
    // Follow the system until there's a profile to read a preference from.
    final platformBrightness =
        WidgetsBinding.instance.platformDispatcher.platformBrightness;
    final colors =
        platformBrightness == Brightness.dark ? AbhColors.dark : AbhColors.light;

    return AbhTheme(
      colors: colors,
      child: WidgetsApp(
        title: 'ABH',
        color: colors.accent,
        textStyle: AbhText.body.copyWith(color: colors.fg),
        // Explicit Directionality. WidgetsApp in builder-only mode does not
        // reliably supply one, and every Text below would throw "No
        // Directionality widget found" on first run — a confusing crash for
        // something this mechanical. Harmless if it turns out to be redundant.
        builder: (context, _) => const Directionality(
          textDirection: TextDirection.ltr,
          child: _Shell(),
        ),
      ),
    );
  }
}

/// The four spaces, over one survey ground.
class _Shell extends StatefulWidget {
  const _Shell();

  @override
  State<_Shell> createState() => _ShellState();
}

class _ShellState extends State<_Shell> {
  int _space = 0;

  static const _spaces = ['Brain', 'Roadmap', 'Capture', 'People'];

  @override
  Widget build(BuildContext context) {
    final c = AbhTheme.of(context);
    final inset = MediaQuery.paddingOf(context);

    return SurveyGround(
      child: Stack(
        children: [
          // The document. Padded past the dock so the last row is never
          // trapped underneath it — chrome floats over content, but content
          // must always be reachable.
          Positioned.fill(
            child: Padding(
              padding: EdgeInsets.only(
                top: inset.top + 24,
                bottom: inset.bottom + 96,
              ),
              child: _Placeholder(title: _spaces[_space]),
            ),
          ),
          Positioned(
            left: Radii.floatInset,
            right: Radii.floatInset,
            bottom: inset.bottom + Radii.floatInset,
            child: GlassPanel(
              radius: Radii.lg,
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  for (var i = 0; i < _spaces.length; i++)
                    Expanded(
                      child: GestureDetector(
                        behavior: HitTestBehavior.opaque,
                        onTap: () => setState(() => _space = i),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          child: Text(
                            _spaces[i],
                            textAlign: TextAlign.center,
                            style: AbhText.foot.copyWith(
                              color: i == _space ? c.accent : c.fgMuted,
                              fontWeight:
                                  i == _space ? FontWeight.w600 : FontWeight.w500,
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Scaffolding, and labelled as such.
///
/// The four real spaces port next; this exists so the shell, the ground and
/// the dock can be run and looked at on a device before any of them are
/// written, rather than after.
class _Placeholder extends StatelessWidget {
  const _Placeholder({required this.title});
  final String title;

  @override
  Widget build(BuildContext context) {
    final c = AbhTheme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 22),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title.toUpperCase(),
            style: AbhText.eyebrow.copyWith(color: c.fgSubtle),
          ),
          const SizedBox(height: 8),
          Text(
            'Not built yet.',
            style: AbhText.title1.copyWith(color: c.fg),
          ),
          const SizedBox(height: 10),
          Text(
            'The ground, the glass and the dock are real. The spaces port next.',
            style: AbhText.body.copyWith(color: c.fgMuted),
          ),
        ],
      ),
    );
  }
}
