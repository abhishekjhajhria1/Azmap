/// Choosing something to learn.
///
/// The first real screen for anyone who opens ABH with nothing in it, which
/// makes it the screen that decides whether they come back. Two decisions
/// shape it:
///
/// **Exams first, skills second.** ABH's first users are Indian exam students,
/// and someone who came for JEE should not scroll past ten developer roadmaps
/// to find it. Ordering by who is actually here beats ordering alphabetically
/// or by what looks impressive.
///
/// **Every card states its size.** "60 chapters" is not a boast, it is the most
/// useful fact available before committing — and hiding it so the list looks
/// friendlier only moves the disappointment to the moment after the tap.
library;

import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../design/controls.dart';
import '../design/layout.dart';
import '../design/survey.dart';
import '../design/tokens.dart';
import '../state/map_controller.dart';
import 'library.dart';

class RoadmapPicker extends StatelessWidget {
  const RoadmapPicker({
    super.key,
    required this.library,
    required this.onStarted,
  });

  final ContentLibrary library;

  /// Fired after a roadmap is inflated, so the caller can leave the picker.
  final ValueChanged<RoadmapDef> onStarted;

  @override
  Widget build(BuildContext context) {
    final c = AbhTheme.of(context);
    final m = AbhTheme.metricsOf(context);
    final started = MapScope.of(context).startedRoadmaps;

    return ListView(
      padding: EdgeInsets.symmetric(horizontal: m.pagePadH),
      children: [
        Text('START SOMETHING',
            style: AbhText.eyebrow.copyWith(color: c.fgSubtle)),
        SizedBox(height: m.gap),
        Text('What do you want to know?',
            style: AbhText.title1.copyWith(color: c.fg)),
        SizedBox(height: m.gap),
        Text(
          'Pick a path and it becomes part of your map — not a separate list. '
          'Everything you save later can connect to it.',
          style: AbhText.body.copyWith(color: c.fgMuted),
        ),

        SizedBox(height: m.sectionGap),
        _Group(
          label: 'EXAMS',
          roadmaps: library.exams,
          started: started,
          onStarted: onStarted,
        ),
        SizedBox(height: m.sectionGap),
        _Group(
          label: 'SKILLS',
          roadmaps: library.skills,
          started: started,
          onStarted: onStarted,
        ),

        SizedBox(height: m.sectionGap),
        Text(
          'Or just add whatever you are curious about — a roadmap is a head '
          'start, not a requirement.',
          style: AbhText.foot.copyWith(color: c.fgSubtle),
        ),
      ],
    );
  }
}

class _Group extends StatelessWidget {
  const _Group({
    required this.label,
    required this.roadmaps,
    required this.started,
    required this.onStarted,
  });

  final String label;
  final List<RoadmapDef> roadmaps;
  final Set<String> started;
  final ValueChanged<RoadmapDef> onStarted;

  @override
  Widget build(BuildContext context) {
    final c = AbhTheme.of(context);
    final m = AbhTheme.metricsOf(context);
    if (roadmaps.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: AbhText.eyebrow.copyWith(color: c.fgSubtle)),
        SizedBox(height: m.gap),
        Stacked(
          children: [
            for (final def in roadmaps)
              _RoadmapRow(
                def: def,
                alreadyStarted: started.contains(def.id),
                onStarted: onStarted,
              ),
          ],
        ),
      ],
    );
  }
}

class _RoadmapRow extends StatelessWidget {
  const _RoadmapRow({
    required this.def,
    required this.alreadyStarted,
    required this.onStarted,
  });

  final RoadmapDef def;
  final bool alreadyStarted;
  final ValueChanged<RoadmapDef> onStarted;

  @override
  Widget build(BuildContext context) {
    final c = AbhTheme.of(context);
    final m = AbhTheme.metricsOf(context);
    final map = MapScope.of(context);

    // "Chapters" for a syllabus, "steps" for a career path. Same number —
    // calling an exam's units "steps" makes the app sound like it has never
    // met the exam.
    final unit = def.kind == RoadmapKind.exam ? 'chapters' : 'steps';

    return Pressable(
      onTap: () {
        HapticFeedback.mediumImpact();
        map.startRoadmap(def);
        onStarted(def);
      },
      child: ScaledBox(
        height: 64,
        alignment: Alignment.centerLeft,
        padding:
            EdgeInsets.symmetric(horizontal: m.rowPadH, vertical: m.rowPadV + 2),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(def.title, style: AbhText.headline.copyWith(color: c.fg)),
                  const SizedBox(height: 2),
                  Text(
                    def.goal.isEmpty ? def.blurb : def.goal,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: AbhText.foot.copyWith(color: c.fgMuted),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Text(
              // Says "on your map" rather than disabling the row. A tap that
              // does nothing is indistinguishable from a broken app; a tap
              // that re-focuses something you already have is fine.
              alreadyStarted ? 'on your map' : '${def.path.length} $unit',
              style: AbhText.foot.copyWith(
                color: alreadyStarted ? c.known : c.fgSubtle,
                fontSize: 11.5,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
