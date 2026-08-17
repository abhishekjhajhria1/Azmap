/// The floating dock — the one piece of chrome that's always on screen.
///
/// A glass pill floating inset from the edges, not a bar welded to the bottom.
/// The active item is a single accent-tinted lozenge that *slides* between
/// positions rather than four backgrounds fading in and out. That is the detail
/// that makes navigation feel like one object moving instead of a set of states
/// switching, and it costs one [AnimatedPositioned].
///
/// Per the mobile spec's breakpoints (<600 / 600–840 / >840 dp):
///   - phone: icons only, the active item labelled
///   - fold and tablet: icon and label together
///
/// Foldables get one extra rule that is easy to skip and very visible when you
/// do: the dock must never land under the hinge. That lives in `main.dart`,
/// which owns where the dock sits; this file only owns what it looks like.
library;

import 'package:flutter/widgets.dart';

import 'survey.dart';
import 'tokens.dart';

enum Space { brain, roadmap, capture, people }

extension SpaceLabel on Space {
  String get label => switch (this) {
        Space.brain => 'Brain',
        Space.roadmap => 'Roadmap',
        Space.capture => 'Capture',
        Space.people => 'People',
      };
}

class FloatingDock extends StatelessWidget {
  const FloatingDock({
    super.key,
    required this.active,
    required this.onSelect,
    this.onLongPress,
  });

  final Space active;
  final ValueChanged<Space> onSelect;

  /// Long-press anywhere on the dock opens Settings.
  ///
  /// A shortcut, never the only route — an undiscoverable gesture as the sole
  /// path to a screen is a screen most people never find. People space carries
  /// the visible entry.
  final VoidCallback? onLongPress;

  @override
  Widget build(BuildContext context) {
    final c = AbhTheme.of(context);
    final width = MediaQuery.sizeOf(context).width;
    final compact = width < 600;
    final spaces = Space.values;

    return LayoutBuilder(
      builder: (context, box) {
        // 6px of padding either side of the row, so the lozenge lines up with
        // the item rather than with the panel.
        final itemWidth = (box.maxWidth - 12) / spaces.length;

        return GestureDetector(
          onLongPress: onLongPress,
          child: GlassPanel(
          radius: Radii.lg,
          padding: const EdgeInsets.all(6),
          child: SizedBox(
            height: compact ? 52 : 46,
            child: Stack(
              children: [
                // The lozenge. One widget that moves, not four that fade.
                AnimatedPositioned(
                  duration: AbhTheme.durationOf(
                      context, const Duration(milliseconds: 240)),
                  curve: Curves.easeOutCubic,
                  left: itemWidth * active.index,
                  width: itemWidth,
                  top: 0,
                  bottom: 0,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      color: c.accent.withValues(alpha: 0.14),
                      borderRadius: BorderRadius.circular(Radii.md),
                    ),
                  ),
                ),
                Row(
                  children: [
                    for (final space in spaces)
                      Expanded(
                        child: _DockItem(
                          space: space,
                          selected: space == active,
                          compact: compact,
                          onTap: () => onSelect(space),
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
          ),
        );
      },
    );
  }
}

class _DockItem extends StatelessWidget {
  const _DockItem({
    required this.space,
    required this.selected,
    required this.compact,
    required this.onTap,
  });

  final Space space;
  final bool selected;
  final bool compact;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = AbhTheme.of(context);
    final tint = selected ? c.accent : c.fgMuted;

    return Semantics(
      button: true,
      selected: selected,
      label: space.label,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              _SpaceIcon(space: space, color: tint, size: compact ? 20 : 18),
              // On a phone only the active item is labelled: four labels at
              // this width forces them to 9px, and an unreadable label is worse
              // than none. The icon plus the lozenge already says where you are.
              if (!compact || selected) ...[
                const SizedBox(height: 3),
                Text(
                  space.label,
                  style: AbhText.foot.copyWith(
                    fontSize: 10.5,
                    height: 1,
                    color: tint,
                    fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// Icons drawn rather than shipped.
///
/// Four glyphs is not worth an icon package, a font file, or a licence to
/// track — and drawing them means they inherit stroke weight from the design
/// instead of from whatever the pack's designer chose.
class _SpaceIcon extends StatelessWidget {
  const _SpaceIcon({required this.space, required this.color, required this.size});

  final Space space;
  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) => CustomPaint(
        size: Size.square(size),
        painter: _IconPainter(space, color),
      );
}

class _IconPainter extends CustomPainter {
  const _IconPainter(this.space, this.color);

  final Space space;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.7
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    final w = size.width;

    switch (space) {
      // Brain: three nodes and the edges between them — the map itself.
      case Space.brain:
        canvas.drawLine(Offset(w * 0.25, w * 0.3), Offset(w * 0.72, w * 0.5), p);
        canvas.drawLine(Offset(w * 0.72, w * 0.5), Offset(w * 0.32, w * 0.78), p);
        final node = Paint()
          ..color = color
          ..style = PaintingStyle.fill;
        for (final centre in [
          Offset(w * 0.25, w * 0.3),
          Offset(w * 0.72, w * 0.5),
          Offset(w * 0.32, w * 0.78),
        ]) {
          canvas.drawCircle(centre, w * 0.11, node);
        }

      // Roadmap: a path with a waypoint.
      case Space.roadmap:
        final path = Path()
          ..moveTo(w * 0.2, w * 0.8)
          ..cubicTo(w * 0.2, w * 0.45, w * 0.8, w * 0.6, w * 0.8, w * 0.2);
        canvas.drawPath(path, p);
        canvas.drawCircle(Offset(w * 0.8, w * 0.2), w * 0.1, p);

      // Capture: an inbox tray.
      case Space.capture:
        canvas.drawRRect(
          RRect.fromRectAndRadius(
            Rect.fromLTWH(w * 0.16, w * 0.22, w * 0.68, w * 0.56),
            Radius.circular(w * 0.14),
          ),
          p,
        );
        canvas.drawLine(Offset(w * 0.16, w * 0.56), Offset(w * 0.35, w * 0.56), p);
        canvas.drawLine(Offset(w * 0.65, w * 0.56), Offset(w * 0.84, w * 0.56), p);
        canvas.drawLine(Offset(w * 0.35, w * 0.56), Offset(w * 0.42, w * 0.66), p);
        canvas.drawLine(Offset(w * 0.58, w * 0.66), Offset(w * 0.65, w * 0.56), p);
        canvas.drawLine(Offset(w * 0.42, w * 0.66), Offset(w * 0.58, w * 0.66), p);

      // People: two figures.
      case Space.people:
        canvas.drawCircle(Offset(w * 0.38, w * 0.34), w * 0.15, p);
        final arc = Path()
          ..moveTo(w * 0.16, w * 0.8)
          ..arcToPoint(Offset(w * 0.6, w * 0.8),
              radius: Radius.circular(w * 0.28), clockwise: true);
        canvas.drawPath(arc, p);
        canvas.drawCircle(Offset(w * 0.72, w * 0.36), w * 0.11, p);
    }
  }

  @override
  bool shouldRepaint(_IconPainter old) =>
      old.color != color || old.space != space;
}
