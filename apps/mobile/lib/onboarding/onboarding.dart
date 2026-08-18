/// First run: four questions, each with the answer rendered live.
///
/// ## The idea this is built on
///
/// Onboarding questionnaires usually fail for one reason: they ask people to
/// predict a preference about a thing they have never seen. "Do you prefer a
/// compact layout?" is unanswerable on day zero — compared to what?
///
/// So every question here changes a **working preview** on the same screen. You
/// don't decide whether you like compact rows; you look at compact rows and
/// decide. The preview is the real widgets under the real theme, not a picture
/// of them, so there is nothing to keep in sync and nothing to over-promise.
///
/// Four questions, and the count is a decision. Each one has to earn its place
/// against the cost of a person abandoning setup — which is the most expensive
/// thing that can happen on this screen. Everything else ships with a defensible
/// default and lives in Settings.
///
/// The skip button is real, always visible, and not styled to be avoided. A
/// person who wants to *use the thing* should be able to, and "Set this up
/// later" is a legitimate answer to every question here.
library;

import 'package:flutter/widgets.dart';

import '../design/controls.dart';
import '../design/survey.dart';
import '../design/tokens.dart';
import '../prefs/preferences.dart';

class Onboarding extends StatefulWidget {
  const Onboarding({super.key, required this.onDone});

  final ValueChanged<Preferences> onDone;

  @override
  State<Onboarding> createState() => _OnboardingState();
}

class _OnboardingState extends State<Onboarding> {
  int _step = 0;
  late Preferences _draft = PrefsScope.valueOf(context);

  static const _lastStep = 3;

  void _set(Preferences next) => setState(() => _draft = next);

  void _finish() => widget.onDone(_draft.copyWith(onboarded: true));

  @override
  Widget build(BuildContext context) {
    final c = AbhTheme.of(context);
    final m = AbhTheme.metricsOf(context);
    final safe = MediaQuery.paddingOf(context);

    return Padding(
      padding: EdgeInsets.only(
        top: safe.top + 24,
        bottom: safe.bottom + 20,
        left: m.pagePadH,
        right: m.pagePadH,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Progress as four ticks, not a percentage. Four is small enough to
          // count at a glance, and a number would imply more steps than exist.
          Row(
            children: [
              for (var i = 0; i <= _lastStep; i++)
                Padding(
                  padding: const EdgeInsets.only(right: 5),
                  child: AnimatedContainer(
                    duration: AbhTheme.durationOf(
                        context, const Duration(milliseconds: 220)),
                    width: i == _step ? 22 : 8,
                    height: 4,
                    decoration: BoxDecoration(
                      color: i <= _step ? c.accent : c.hairline,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
              const Spacer(),
              GestureDetector(
                onTap: _finish,
                child: Padding(
                  // Padded to a real tap target even though the text is small.
                  padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 6),
                  child: Text('Set this up later',
                      style: AbhText.foot.copyWith(color: c.fgSubtle)),
                ),
              ),
            ],
          ),

          const SizedBox(height: 18),
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [_question(context)],
              ),
            ),
          ),

          const SizedBox(height: 12),
          PrimaryButton(
            label: _step == _lastStep ? 'Start' : 'Next',
            onTap: () {
              if (_step == _lastStep) {
                _finish();
              } else {
                setState(() => _step++);
              }
            },
          ),
          if (_step > 0)
            GestureDetector(
              onTap: () => setState(() => _step--),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Center(
                  child: Text('Back',
                      style: AbhText.foot.copyWith(color: c.fgSubtle)),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _question(BuildContext context) => switch (_step) {
        0 => _DensityQuestion(draft: _draft, onChange: _set),
        1 => _GuidanceQuestion(draft: _draft, onChange: _set),
        2 => _ProgressQuestion(draft: _draft, onChange: _set),
        _ => _LookQuestion(draft: _draft, onChange: _set),
      };
}

// ---------------------------------------------------------------------------
// questions
// ---------------------------------------------------------------------------

class _DensityQuestion extends StatelessWidget {
  const _DensityQuestion({required this.draft, required this.onChange});

  final Preferences draft;
  final ValueChanged<Preferences> onChange;

  @override
  Widget build(BuildContext context) {
    return _QuestionFrame(
      title: 'How much do you want to see at once?',
      body: 'Some people want the whole syllabus on one screen. Some want room '
          'to think about one thing.',
      choices: [
        ChoiceRow(
          label: 'Room to breathe',
          detail: 'Bigger rows, more space',
          selected: draft.density == Density.comfortable,
          onTap: () => onChange(draft.copyWith(density: Density.comfortable)),
        ),
        ChoiceRow(
          label: 'Fit more in',
          detail: 'Tighter rows, denser lists',
          selected: draft.density == Density.compact,
          onTap: () => onChange(draft.copyWith(density: Density.compact)),
        ),
      ],
      preview: _PreviewList(draft: draft),
    );
  }
}

class _GuidanceQuestion extends StatelessWidget {
  const _GuidanceQuestion({required this.draft, required this.onChange});

  final Preferences draft;
  final ValueChanged<Preferences> onChange;

  @override
  Widget build(BuildContext context) {
    return _QuestionFrame(
      title: 'How much should the app explain?',
      body: 'ABH can tell you why each step matters and what it opens up — or '
          'stay out of the way and let you tap for it.',
      choices: [
        ChoiceRow(
          label: 'Talk me through it',
          detail: 'Why it matters, what it unlocks',
          selected: draft.guidance == Guidance.full,
          onTap: () => onChange(draft.copyWith(guidance: Guidance.full)),
        ),
        ChoiceRow(
          label: 'Just the map',
          detail: 'Titles and structure only',
          selected: draft.guidance == Guidance.quiet,
          onTap: () => onChange(draft.copyWith(guidance: Guidance.quiet)),
        ),
      ],
      preview: _PreviewList(draft: draft),
    );
  }
}

class _ProgressQuestion extends StatelessWidget {
  const _ProgressQuestion({required this.draft, required this.onChange});

  final Preferences draft;
  final ValueChanged<Preferences> onChange;

  @override
  Widget build(BuildContext context) {
    return _QuestionFrame(
      title: 'What should progress look like?',
      // Says the quiet part out loud. A streak is a commitment device that
      // works right up until it breaks, and people deserve to know that before
      // they opt into one rather than after.
      body: 'A streak pushes harder, but a broken one makes some people quit. '
          'A percentage only ever goes up. Neither is the right answer for '
          'everyone.',
      choices: [
        ChoiceRow(
          label: 'Keep a streak',
          detail: 'Days in a row',
          selected: draft.progressStyle == ProgressStyle.streak,
          onTap: () =>
              onChange(draft.copyWith(progressStyle: ProgressStyle.streak)),
        ),
        ChoiceRow(
          label: 'Show how far along',
          detail: 'Share of the map known',
          selected: draft.progressStyle == ProgressStyle.percent,
          onTap: () =>
              onChange(draft.copyWith(progressStyle: ProgressStyle.percent)),
        ),
        ChoiceRow(
          label: 'Count nothing',
          detail: 'The map is the progress',
          selected: draft.progressStyle == ProgressStyle.none,
          onTap: () =>
              onChange(draft.copyWith(progressStyle: ProgressStyle.none)),
        ),
      ],
      preview: _PreviewHeader(draft: draft),
    );
  }
}

class _LookQuestion extends StatelessWidget {
  const _LookQuestion({required this.draft, required this.onChange});

  final Preferences draft;
  final ValueChanged<Preferences> onChange;

  @override
  Widget build(BuildContext context) {
    final c = AbhTheme.of(context);
    return _QuestionFrame(
      title: 'And how should it look?',
      body: 'All of this is in Settings too — nothing here is permanent.',
      choices: const [],
      extra: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('ACCENT', style: AbhText.eyebrow.copyWith(color: c.fgSubtle)),
          const SizedBox(height: 10),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              for (final choice in AccentChoice.values)
                Swatch(
                  choice: choice,
                  selected: draft.accent == choice,
                  onTap: () => onChange(draft.copyWith(accent: choice)),
                ),
            ],
          ),
          const SizedBox(height: 22),
          Text('THEME', style: AbhText.eyebrow.copyWith(color: c.fgSubtle)),
          const SizedBox(height: 10),
          Segmented(
            options: const ['System', 'Light', 'Dark'],
            index: draft.theme.index,
            onSelect: (i) =>
                onChange(draft.copyWith(theme: ThemeChoice.values[i])),
          ),
          const SizedBox(height: 22),
          Toggle(
            label: 'Draw the survey ground',
            detail: 'The plotted grid and contours behind everything',
            value: draft.showGround,
            onChanged: (v) => onChange(draft.copyWith(showGround: v)),
          ),
        ],
      ),
      preview: _PreviewList(draft: draft),
    );
  }
}

// ---------------------------------------------------------------------------
// frame + preview
// ---------------------------------------------------------------------------

class _QuestionFrame extends StatelessWidget {
  const _QuestionFrame({
    required this.title,
    required this.body,
    required this.choices,
    required this.preview,
    this.extra,
  });

  final String title;
  final String body;
  final List<ChoiceRow> choices;
  final Widget preview;
  final Widget? extra;

  @override
  Widget build(BuildContext context) {
    final c = AbhTheme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: AbhText.title1.copyWith(color: c.fg)),
        const SizedBox(height: 10),
        Text(body, style: AbhText.body.copyWith(color: c.fgMuted)),
        const SizedBox(height: 20),
        if (choices.isNotEmpty) Stacked(children: choices),
        if (extra != null) extra!,
        const SizedBox(height: 24),

        Row(
          children: [
            Text('PREVIEW', style: AbhText.eyebrow.copyWith(color: c.fgSubtle)),
            const SizedBox(width: 8),
            Expanded(child: Container(height: 1, color: c.seam)),
          ],
        ),
        const SizedBox(height: 12),
        // The real widgets under the real theme, not a screenshot. There is
        // nothing here that can drift out of sync with the app because it *is*
        // the app.
        preview,
      ],
    );
  }
}

/// A miniature of a path list, obeying the draft preferences.
class _PreviewList extends StatelessWidget {
  const _PreviewList({required this.draft});
  final Preferences draft;

  static const _rows = [
    ('Rotational motion', 'Explains why a spinning top stays up.'),
    ('Moment of inertia', 'The mass that resists being spun.'),
    ('Angular momentum', 'What is conserved when nothing pushes.'),
  ];

  @override
  Widget build(BuildContext context) {
    final c = AbhTheme.of(context);
    final m = draft.density == Density.compact ? Metrics.compact : Metrics.comfortable;
    final accent = draft.accent.resolve(c.isDark);

    return Stacked(
      children: [
        for (final (title, why) in _rows)
          Padding(
            padding: EdgeInsets.symmetric(
                horizontal: m.rowPadH, vertical: m.rowPadV),
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
                      Text(
                        title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: AbhText.headline.copyWith(
                          color: c.fg,
                          fontSize: 15 * m.textScale,
                        ),
                      ),
                      // The guidance preference, visible rather than described.
                      if (draft.guidance == Guidance.full)
                        Padding(
                          padding: const EdgeInsets.only(top: 2),
                          child: Text(
                            why,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: AbhText.foot.copyWith(
                              color: c.fgMuted,
                              fontSize: 12.5 * m.textScale,
                            ),
                          ),
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

/// A miniature of the header, so the progress choice is seen not read.
class _PreviewHeader extends StatelessWidget {
  const _PreviewHeader({required this.draft});
  final Preferences draft;

  @override
  Widget build(BuildContext context) {
    final c = AbhTheme.of(context);
    final accent = draft.accent.resolve(c.isDark);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      decoration: BoxDecoration(
        color: c.surface,
        borderRadius: BorderRadius.circular(Radii.md),
        border: Border.all(color: c.seam),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text('Rotational motion',
                style: AbhText.title3.copyWith(color: c.fg)),
          ),
          switch (draft.progressStyle) {
            ProgressStyle.streak => Row(
                children: [
                  Text('🔥', style: AbhText.foot.copyWith(fontSize: 13)),
                  const SizedBox(width: 4),
                  Text('7 days',
                      style: AbhText.foot.copyWith(color: accent)),
                ],
              ),
            ProgressStyle.percent => Text('34% known',
                style: AbhText.foot.copyWith(color: c.fgMuted)),
            // Genuinely empty, so "count nothing" previews as nothing rather
            // than as a placeholder that says "nothing".
            ProgressStyle.none => const SizedBox.shrink(),
          },
        ],
      ),
    );
  }
}
