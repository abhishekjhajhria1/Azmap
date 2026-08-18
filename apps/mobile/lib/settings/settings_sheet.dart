/// Settings — everything onboarding asked, plus everything it didn't.
///
/// Onboarding gets four questions because setup abandonment is the most
/// expensive thing that can happen on a first run. Everything else ships with a
/// defensible default and lives here, where a person arrives on purpose and has
/// time to read.
///
/// Two rules this screen follows:
///
/// **Changes apply instantly.** No Save button, no confirmation. A settings
/// screen with a Save button is one that can be left in a state the user
/// believes they set and didn't, and every value here is one tap to undo.
///
/// **Every row says what it does, not what it is called.** "Draw the survey
/// ground" with "the plotted grid and contours behind everything" beats
/// "Background: On" — the second is only legible to whoever wrote it.
library;

import 'package:flutter/widgets.dart';

import '../design/controls.dart';
import '../design/survey.dart';
import '../design/tokens.dart';
import '../prefs/preferences.dart';
import '../sync/sync_controller.dart';

class SettingsSheet extends StatelessWidget {
  const SettingsSheet({
    super.key,
    required this.onClose,
    required this.onOpenPairing,
  });

  final VoidCallback onClose;
  final VoidCallback onOpenPairing;

  @override
  Widget build(BuildContext context) {
    final c = AbhTheme.of(context);
    final m = AbhTheme.metricsOf(context);
    final prefs = PrefsScope.of(context);
    final p = prefs.value;
    final safe = MediaQuery.paddingOf(context);

    void patch(Preferences next) => prefs.update(next);

    return ColoredBox(
      color: c.bg,
      child: ListView(
        padding: EdgeInsets.fromLTRB(
            m.pagePadH, safe.top + 20, m.pagePadH, safe.bottom + 40),
        children: [
          Row(
            children: [
              Expanded(
                child: Text('Settings',
                    style: AbhText.title1.copyWith(color: c.fg)),
              ),
              GestureDetector(
                onTap: onClose,
                child: SizedBox(
                  width: Metrics.tapTarget,
                  height: Metrics.tapTarget,
                  child: Center(
                    child: Text('Done',
                        style: AbhText.foot.copyWith(color: c.accent)),
                  ),
                ),
              ),
            ],
          ),
          SizedBox(height: m.sectionGap),

          _Section(title: 'READING'),
          Stacked(children: [
            ChoiceRow(
              label: 'Room to breathe',
              detail: 'Bigger rows, more space',
              selected: p.density == Density.comfortable,
              onTap: () => patch(p.copyWith(density: Density.comfortable)),
            ),
            ChoiceRow(
              label: 'Fit more in',
              detail: 'Tighter rows, denser lists',
              selected: p.density == Density.compact,
              onTap: () => patch(p.copyWith(density: Density.compact)),
            ),
          ]),
          SizedBox(height: m.gap),
          Stacked(children: [
            ChoiceRow(
              label: 'Talk me through it',
              detail: 'Why each step matters, what it unlocks',
              selected: p.guidance == Guidance.full,
              onTap: () => patch(p.copyWith(guidance: Guidance.full)),
            ),
            ChoiceRow(
              label: 'Just the map',
              detail: 'Titles and structure only',
              selected: p.guidance == Guidance.quiet,
              onTap: () => patch(p.copyWith(guidance: Guidance.quiet)),
            ),
          ]),

          SizedBox(height: m.sectionGap),
          _Section(title: 'PROGRESS'),
          Stacked(children: [
            ChoiceRow(
              label: 'Keep a streak',
              detail: 'Days in a row',
              selected: p.progressStyle == ProgressStyle.streak,
              onTap: () =>
                  patch(p.copyWith(progressStyle: ProgressStyle.streak)),
            ),
            ChoiceRow(
              label: 'Show how far along',
              detail: 'Share of the map known — only ever goes up',
              selected: p.progressStyle == ProgressStyle.percent,
              onTap: () =>
                  patch(p.copyWith(progressStyle: ProgressStyle.percent)),
            ),
            ChoiceRow(
              label: 'Count nothing',
              detail: 'The map is the progress',
              selected: p.progressStyle == ProgressStyle.none,
              onTap: () => patch(p.copyWith(progressStyle: ProgressStyle.none)),
            ),
          ]),

          SizedBox(height: m.sectionGap),
          _Section(title: 'APPEARANCE'),
          Segmented(
            options: const ['System', 'Light', 'Dark'],
            index: p.theme.index,
            onSelect: (i) => patch(p.copyWith(theme: ThemeChoice.values[i])),
          ),
          SizedBox(height: m.gap + 6),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final choice in AccentChoice.values)
                Swatch(
                  choice: choice,
                  selected: p.accent == choice,
                  onTap: () => patch(p.copyWith(accent: choice)),
                ),
            ],
          ),
          SizedBox(height: m.gap),
          Toggle(
            label: 'Draw the survey ground',
            detail: 'The plotted grid and contours behind everything',
            value: p.showGround,
            onChanged: (v) => patch(p.copyWith(showGround: v)),
          ),
          Toggle(
            label: 'Reduce motion',
            // Says exactly what it can and cannot do. A toggle that appears to
            // have no effect — because the OS already turned motion off — reads
            // as a broken app rather than a respected system setting.
            detail: 'Stops things sliding. Your system setting already wins '
                'over this one.',
            value: p.reduceMotion,
            onChanged: (v) => patch(p.copyWith(reduceMotion: v)),
          ),

          SizedBox(height: m.sectionGap),
          _Section(title: 'NAVIGATION'),
          Text(
            'Which space opens when you launch ABH.',
            style: AbhText.foot.copyWith(color: c.fgMuted),
          ),
          SizedBox(height: m.gap),
          Segmented(
            options: const ['Brain', 'Roadmap', 'Capture'],
            index: p.homeSpace.index,
            onSelect: (i) => patch(p.copyWith(homeSpace: HomeSpace.values[i])),
          ),
          SizedBox(height: m.gap + 6),
          Text(
            'Where the dock sits. Auto puts it in thumb reach on a phone and at '
            'the top on a tablet.',
            style: AbhText.foot.copyWith(color: c.fgMuted),
          ),
          SizedBox(height: m.gap),
          Segmented(
            options: const ['Auto', 'Bottom', 'Top'],
            index: p.dock.index,
            onSelect: (i) => patch(p.copyWith(dock: DockPosition.values[i])),
          ),

          SizedBox(height: m.sectionGap),
          _Section(title: 'DEVICES'),
          GestureDetector(
            onTap: onOpenPairing,
            child: Container(
              height: Metrics.tapTarget + 8,
              alignment: Alignment.centerLeft,
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                            SyncScope.of(context).connected
                                ? 'Synced to your other devices'
                                : 'Private — saved on this device',
                            style: AbhText.headline.copyWith(color: c.fg)),
                        const SizedBox(height: 2),
                        Text('End-to-end encrypted. The server cannot read it.',
                            style: AbhText.foot.copyWith(color: c.fgMuted)),
                      ],
                    ),
                  ),
                  Text(SyncScope.of(context).connected ? 'Manage' : 'Pair',
                      style: AbhText.foot.copyWith(color: c.accent)),
                ],
              ),
            ),
          ),

          SizedBox(height: m.sectionGap),
          _Section(title: 'PREVIEW'),
          _LivePreview(prefs: p),

          SizedBox(height: m.sectionGap),
          // Deliberately at the bottom and deliberately not styled as a
          // warning. Re-running setup is a reasonable thing to want, not a
          // dangerous one — it changes preferences, never the map.
          GestureDetector(
            onTap: () => patch(p.copyWith(onboarded: false)),
            child: Container(
              height: Metrics.tapTarget,
              alignment: Alignment.centerLeft,
              child: Text('Run the setup questions again',
                  style: AbhText.body.copyWith(color: c.accent)),
            ),
          ),
        ],
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title});
  final String title;

  @override
  Widget build(BuildContext context) {
    final c = AbhTheme.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Text(title, style: AbhText.eyebrow.copyWith(color: c.fgSubtle)),
    );
  }
}

/// The same live preview onboarding uses, so a change made here is as visible
/// as one made there.
class _LivePreview extends StatelessWidget {
  const _LivePreview({required this.prefs});
  final Preferences prefs;

  @override
  Widget build(BuildContext context) {
    final c = AbhTheme.of(context);
    final m = prefs.density == Density.compact
        ? Metrics.compact
        : Metrics.comfortable;
    final accent = prefs.accent.resolve(c.isDark);

    return Stacked(
      children: [
        for (final (title, why) in const [
          ('Rotational motion', 'Explains why a spinning top stays up.'),
          ('Moment of inertia', 'The mass that resists being spun.'),
        ])
          Padding(
            padding:
                EdgeInsets.symmetric(horizontal: m.rowPadH, vertical: m.rowPadV),
            child: Row(
              children: [
                Container(
                  width: 18,
                  height: 18,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: accent, width: 1.6),
                  ),
                ),
                SizedBox(width: m.gap),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: AbhText.headline.copyWith(
                              color: c.fg, fontSize: 15 * m.textScale)),
                      if (prefs.guidance == Guidance.full)
                        Padding(
                          padding: const EdgeInsets.only(top: 2),
                          child: Text(why,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: AbhText.foot.copyWith(
                                  color: c.fgMuted,
                                  fontSize: 12.5 * m.textScale)),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}
