/// Roadmap — deliberately the least interesting screen in the app.
///
/// One thing to do, and the case for doing it. Everything else on this screen
/// exists to make that one thing obvious: no charts, no badges, no streak
/// counter competing for the same glance. A learner opening this should be able
/// to start in under a second without deciding anything.
///
/// The path below it is a *stack* — one surface, hairline seams — not a column
/// of outlined cards. Outlining every row is what turns a list into a form.
library;

import 'package:flutter/widgets.dart';

import '../design/survey.dart';
import '../design/tokens.dart';
import '../domain/graph.dart';
import '../domain/models.dart';
import '../state/map_controller.dart';

class RoadmapSpace extends StatelessWidget {
  const RoadmapSpace({super.key, required this.onCelebrate});

  /// Called with whatever a completion opened up, so the shell can celebrate.
  final ValueChanged<List<Topic>> onCelebrate;

  @override
  Widget build(BuildContext context) {
    final c = AbhTheme.of(context);
    final map = MapScope.of(context);
    final open = map.availableNow;

    if (map.topics.isEmpty) {
      return const _Empty(
        title: 'Nothing on your map yet.',
        body: 'Add something you want to learn, and the path builds itself as '
            'you go.',
      );
    }

    final next = open.isEmpty ? null : open.first;
    final index = GraphIndex(map.graph);

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 22),
      children: [
        Text('ROADMAP', style: AbhText.eyebrow.copyWith(color: c.fgSubtle)),
        const SizedBox(height: 10),

        if (next == null) ...[
          Text('Everything here is done.',
              style: AbhText.title1.copyWith(color: c.fg)),
          const SizedBox(height: 8),
          Text(
            "You've cleared the map. Add something new, or capture what you've "
            'been reading and let it grow.',
            style: AbhText.body.copyWith(color: c.fgMuted),
          ),
        ] else ...[
          // The one thing to do. Display serif at full size — this is the only
          // place on the screen that gets to shout.
          Text(next.title, style: AbhText.title1.copyWith(color: c.fg)),
          if (next.whyItMatters.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(next.whyItMatters, style: AbhText.body.copyWith(color: c.fgMuted)),
          ],
          const SizedBox(height: 18),
          _PrimaryAction(
            label: 'Mark known',
            onTap: () => onCelebrate(map.complete(next.id)),
          ),
          const SizedBox(height: 10),
          _UnlockHint(count: wouldUnlock(next.id, map.graph).length),
        ],

        const SizedBox(height: 30),
        Row(
          children: [
            Text('YOUR PATH', style: AbhText.eyebrow.copyWith(color: c.fgSubtle)),
            const Spacer(),
            Text('${map.percentKnown}% known',
                style: AbhText.foot.copyWith(color: c.fgSubtle)),
          ],
        ),
        const SizedBox(height: 10),
        Stacked(
          children: [
            for (final t in map.topics)
              _PathRow(
                topic: t,
                status: map.statuses[t.id] ?? MapStatus.locked,
                unlocks: index.outgoing[t.id]?.length ?? 0,
                onToggle: () {
                  if (t.progress == Progress.known) {
                    map.setProgress(t.id, Progress.notStarted);
                  } else {
                    onCelebrate(map.complete(t.id));
                  }
                },
              ),
          ],
        ),
      ],
    );
  }
}

class _PathRow extends StatelessWidget {
  const _PathRow({
    required this.topic,
    required this.status,
    required this.unlocks,
    required this.onToggle,
  });

  final Topic topic;
  final MapStatus status;
  final int unlocks;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    final c = AbhTheme.of(context);
    final locked = status == MapStatus.locked;
    final known = status == MapStatus.known;

    return Semantics(
      button: !locked,
      checked: known,
      label: topic.title,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        // A locked row is not tappable, and says so by being unresponsive
        // rather than by showing an error after the fact.
        onTap: locked ? null : onToggle,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
          child: Row(
            children: [
              _StatusDot(status: status),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      topic.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: AbhText.headline.copyWith(
                        // Locked rows recede rather than disappear: you should
                        // be able to see what's ahead of you on the path.
                        color: locked ? c.fgSubtle : c.fg,
                        decoration: known ? TextDecoration.lineThrough : null,
                        decorationColor: c.fgSubtle,
                      ),
                    ),
                    if (locked && unlocks == 0)
                      Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: Text('Locked — finish what comes before it',
                            style: AbhText.foot.copyWith(color: c.fgSubtle)),
                      ),
                  ],
                ),
              ),
              if (!locked && !known && unlocks > 0)
                Text('opens $unlocks',
                    style: AbhText.foot.copyWith(color: c.fgSubtle)),
            ],
          ),
        ),
      ),
    );
  }
}

/// Status as a dot: filled when known, ringed when open, hollow when locked.
///
/// Colour alone would fail for anyone who can't distinguish it, so the *shape*
/// carries the meaning and colour only reinforces it.
class _StatusDot extends StatelessWidget {
  const _StatusDot({required this.status});
  final MapStatus status;

  @override
  Widget build(BuildContext context) {
    final c = AbhTheme.of(context);
    return switch (status) {
      MapStatus.known => _Dot(fill: c.known, border: c.known, tick: true),
      MapStatus.inProgress => _Dot(fill: c.accent.withValues(alpha: 0.2), border: c.accent),
      MapStatus.available => _Dot(fill: const Color(0x00000000), border: c.accent),
      MapStatus.locked => _Dot(fill: const Color(0x00000000), border: c.hairline),
    };
  }
}

class _Dot extends StatelessWidget {
  const _Dot({required this.fill, required this.border, this.tick = false});
  final Color fill;
  final Color border;
  final bool tick;

  @override
  Widget build(BuildContext context) {
    final c = AbhTheme.of(context);
    return Container(
      width: 22,
      height: 22,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: fill,
        shape: BoxShape.circle,
        border: Border.all(color: border, width: 1.6),
      ),
      child: tick
          ? CustomPaint(size: const Size.square(10), painter: _TickPainter(c.accentContrast))
          : null,
    );
  }
}

class _TickPainter extends CustomPainter {
  const _TickPainter(this.color);
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    canvas.drawPath(
      Path()
        ..moveTo(w * 0.1, w * 0.55)
        ..lineTo(w * 0.4, w * 0.85)
        ..lineTo(w * 0.92, w * 0.18),
      Paint()
        ..color = color
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round,
    );
  }

  @override
  bool shouldRepaint(_TickPainter old) => old.color != color;
}

class _PrimaryAction extends StatelessWidget {
  const _PrimaryAction({required this.label, required this.onTap});
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = AbhTheme.of(context);
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 50,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: c.accent,
          borderRadius: BorderRadius.circular(Radii.pill),
        ),
        child: Text(
          label,
          style: AbhText.headline.copyWith(color: c.accentContrast),
        ),
      ),
    );
  }
}

/// What finishing this opens up. The single most motivating fact available, and
/// it costs one graph query — so it's stated, not left for the user to discover.
class _UnlockHint extends StatelessWidget {
  const _UnlockHint({required this.count});
  final int count;

  @override
  Widget build(BuildContext context) {
    final c = AbhTheme.of(context);
    if (count == 0) return const SizedBox.shrink();
    return Center(
      child: Text(
        count == 1 ? 'Opens up 1 more topic' : 'Opens up $count more topics',
        style: AbhText.foot.copyWith(color: c.fgSubtle),
      ),
    );
  }
}

class _Empty extends StatelessWidget {
  const _Empty({required this.title, required this.body});
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    final c = AbhTheme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 30),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: AbhText.title1.copyWith(color: c.fg)),
          const SizedBox(height: 10),
          Text(body, style: AbhText.body.copyWith(color: c.fgMuted)),
        ],
      ),
    );
  }
}
