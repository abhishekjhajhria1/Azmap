/// Brain — the map itself, full-bleed under the floating chrome.
///
/// A [CustomPaint] rather than a widget per node. At a few hundred topics the
/// widget version means a few hundred render objects, each with layout and hit
/// testing, being rebuilt whenever anything moves — which is every frame while
/// the layout settles. One canvas draws the same thing in one pass.
///
/// The layout is a deterministic radial tree, not a force simulation. Two
/// reasons, and the second is the real one:
///
///   1. Force layouts need iterating, which on a phone means either a dropped
///      frame or a background isolate.
///   2. **They aren't stable.** The same map laid out twice lands differently,
///      so a topic is in one place today and elsewhere tomorrow — and the whole
///      value of a map is that you learn where things *are*. Depth-ordered
///      rings mean prerequisites sit toward the centre and what they unlock
///      radiates outward, which is also what the graph actually means.
library;

import 'dart:math' as math;

import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../design/layout.dart';
import '../design/tokens.dart';
import '../domain/graph.dart';
import '../domain/models.dart';
import '../state/map_controller.dart';

class BrainSpace extends StatefulWidget {
  const BrainSpace({super.key, this.focusTopicId, this.onFocusConsumed});

  /// A node to open on, handed over by search. Without it, searching for
  /// something and landing on the map is only half an answer — you still have
  /// to find it yourself, which is the work search was meant to do.
  final String? focusTopicId;
  final VoidCallback? onFocusConsumed;

  @override
  State<BrainSpace> createState() => _BrainSpaceState();
}

class _BrainSpaceState extends State<BrainSpace> {
  Offset _pan = Offset.zero;
  double _zoom = 1;
  Offset _panStart = Offset.zero;
  double _zoomStart = 1;
  String? _selected;

  @override
  void didUpdateWidget(BrainSpace old) {
    super.didUpdateWidget(old);
    _consumeFocus();
  }

  @override
  void initState() {
    super.initState();
    _consumeFocus();
  }

  /// Take the requested node, then tell the shell to forget it — otherwise
  /// coming back to the map an hour later re-selects the same thing.
  void _consumeFocus() {
    final id = widget.focusTopicId;
    if (id == null) return;
    _selected = id;
    // After the frame: calling back into the parent's setState during build
    // is the classic "setState called during build" crash.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      widget.onFocusConsumed?.call();
    });
  }

  @override
  Widget build(BuildContext context) {
    final c = AbhTheme.of(context);
    final map = MapScope.of(context);

    if (map.topics.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 40),
          child: Text(
            'Your map is empty. Everything you learn or capture lands here, '
            'wired to what it depends on.',
            textAlign: TextAlign.center,
            style: AbhText.body.copyWith(color: c.fgMuted),
          ),
        ),
      );
    }

    Topic? found;
    for (final t in map.topics) {
      if (t.id == _selected) found = t;
    }
    // Bound to a final: a non-final local does not type-promote inside the
    // closures below, so `selected.id` would not compile against `Topic?`.
    final selected = found;

    return Stack(
      children: [
        Positioned.fill(
          child: LayoutBuilder(builder: (context, box) {
            final canvas = Size(box.maxWidth, box.maxHeight);
            return GestureDetector(
            onScaleStart: (d) {
              _panStart = _pan - d.localFocalPoint;
              _zoomStart = _zoom;
            },
            onScaleUpdate: (d) => setState(() {
              // Clamped: past 4x the labels are unreadable smears, and below
              // 0.4x the whole map is a grey cloud. Neither is a view anyone
              // wants, so neither is reachable.
              _zoom = (_zoomStart * d.scale).clamp(0.4, 4);
              _pan = _panStart + d.localFocalPoint;
            }),
            onTapUp: (d) => setState(() {
              _selected = _hitTest(d.localPosition, map, canvas);
            }),
            child: CustomPaint(
              size: Size.infinite,
              painter: _GraphPainter(
                graph: map.graph,
                statuses: map.statuses,
                colors: c,
                pan: _pan,
                zoom: _zoom,
                selected: _selected,
              ),
            ),
          );
          }),
        ),

        if (selected != null)
          Positioned(
            left: Radii.floatInset,
            right: Radii.floatInset,
            top: Radii.floatInset,
            child: _Inspector(
              topic: selected,
              status: map.statuses[selected.id] ?? MapStatus.locked,
              unlocks: wouldUnlock(selected.id, map.graph).length,
              onClose: () => setState(() => _selected = null),
              onComplete: () {
                // The one moment worth a real thump: something the map was
                // holding shut just opened.
                HapticFeedback.mediumImpact();
                map.complete(selected.id);
                setState(() {});
              },
            ),
          ),
      ],
    );
  }

  /// Nearest node within a finger's reach of the tap.
  ///
  /// Distance-to-nearest rather than strict circle containment: nodes are 8dp
  /// and fingers are not, so requiring a direct hit would make the map feel
  /// broken rather than precise.
  String? _hitTest(Offset point, MapController map, Size canvas) {
    // The same size the painter used. Deriving it from MediaQuery instead put
    // every target off by the shell's padding, which reads as "tapping does
    // nothing" rather than as an offset.
    final positions = _layout(map.graph, canvas);
    String? best;
    var bestDistance = double.infinity;

    for (final entry in positions.entries) {
      final screen = entry.value * _zoom + _pan;
      final d = (screen - point).distance;
      if (d < bestDistance) {
        bestDistance = d;
        best = entry.key;
      }
    }
    return bestDistance <= 34 ? best : null;
  }
}

/// Deterministic radial layout: depth from the roots decides the ring, position
/// within the ring is fixed by traversal order.
///
/// Pure and cheap, so it is recomputed rather than cached. Caching it would mean
/// invalidating on every graph change, and the whole function is a couple of
/// passes over a few hundred nodes.
Map<String, Offset> _layout(Graph graph, Size size) {
  final index = GraphIndex(graph);
  final centre = Offset(size.width / 2, size.height / 2);

  // Depth = longest path from a root. Longest rather than shortest so a topic
  // never sits inside one of its own prerequisites.
  final depth = <String, int>{};
  final ordered = topoOrder(graph) ?? graph.topics;
  for (final t in ordered) {
    var d = 0;
    for (final e in index.incoming[t.id] ?? const <Edge>[]) {
      d = math.max(d, (depth[e.from] ?? 0) + 1);
    }
    depth[t.id] = d;
  }

  final rings = <int, List<String>>{};
  for (final t in ordered) {
    rings.putIfAbsent(depth[t.id] ?? 0, () => []).add(t.id);
  }

  final positions = <String, Offset>{};
  for (final entry in rings.entries) {
    final ids = entry.value;
    final radius = entry.key == 0 ? 0.0 : 70.0 + entry.key * 78.0;
    for (var i = 0; i < ids.length; i++) {
      if (radius == 0 && ids.length == 1) {
        positions[ids[i]] = centre;
        continue;
      }
      // Each ring is rotated by a fraction of its own step, so nodes on
      // successive rings don't line up into spokes that read as false edges.
      final step = (math.pi * 2) / ids.length;
      final angle = step * i + entry.key * 0.4;
      positions[ids[i]] =
          centre + Offset(math.cos(angle) * radius, math.sin(angle) * radius);
    }
  }
  return positions;
}

class _GraphPainter extends CustomPainter {
  const _GraphPainter({
    required this.graph,
    required this.statuses,
    required this.colors,
    required this.pan,
    required this.zoom,
    required this.selected,
  });

  final Graph graph;
  final Map<String, MapStatus> statuses;
  final AbhColors colors;
  final Offset pan;
  final double zoom;
  final String? selected;

  @override
  void paint(Canvas canvas, Size size) {
    final positions = _layout(graph, size);
    canvas.save();
    canvas.translate(pan.dx, pan.dy);
    canvas.scale(zoom);

    // Edges first, so nodes sit on top of them rather than being crossed out.
    for (final e in graph.edges) {
      final a = positions[e.from];
      final b = positions[e.to];
      if (a == null || b == null) continue;
      canvas.drawLine(
        a,
        b,
        Paint()
          ..color = e.strength == EdgeStrength.soft
              ? colors.ai.withValues(alpha: 0.28)
              : colors.fg.withValues(alpha: colors.isDark ? 0.13 : 0.11)
          ..strokeWidth = 1 / zoom,
      );
    }

    for (final t in graph.topics) {
      final p = positions[t.id];
      if (p == null) continue;
      final status = statuses[t.id] ?? MapStatus.locked;
      final isSelected = t.id == selected;

      final fill = switch (status) {
        MapStatus.known => colors.known,
        MapStatus.inProgress => colors.accent,
        MapStatus.available => colors.available,
        MapStatus.locked => colors.isDark
            ? const Color(0xFF2A2A30)
            : const Color(0xFFD6D7DB),
      };

      final radius = status == MapStatus.locked ? 5.0 : 7.0;
      if (isSelected) {
        canvas.drawCircle(p, radius + 6,
            Paint()..color = colors.accent.withValues(alpha: 0.22));
      }
      canvas.drawCircle(p, radius, Paint()..color = fill);

      // Labels only where they can be read. Drawing all of them at 0.5x zoom
      // produces overlapping grey mush that hides the structure the map exists
      // to show — so below that only the selected node is named.
      if (zoom > 0.75 || isSelected) {
        final painter = TextPainter(
          text: TextSpan(
            text: t.title,
            style: AbhText.foot.copyWith(
              fontSize: 11,
              color: status == MapStatus.locked ? colors.fgSubtle : colors.fg,
            ),
          ),
          textDirection: TextDirection.ltr,
          maxLines: 1,
          ellipsis: '…',
        )..layout(maxWidth: 110);
        painter.paint(canvas, p + Offset(-painter.width / 2, radius + 4));
      }
    }

    canvas.restore();
  }

  @override
  bool shouldRepaint(_GraphPainter old) =>
      old.pan != pan ||
      old.zoom != zoom ||
      old.selected != selected ||
      old.statuses != statuses ||
      old.graph != graph;
}

class _Inspector extends StatelessWidget {
  const _Inspector({
    required this.topic,
    required this.status,
    required this.unlocks,
    required this.onClose,
    required this.onComplete,
  });

  final Topic topic;
  final MapStatus status;
  final int unlocks;
  final VoidCallback onClose;
  final VoidCallback onComplete;

  @override
  Widget build(BuildContext context) {
    final c = AbhTheme.of(context);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: c.surface,
        borderRadius: BorderRadius.circular(Radii.lg),
        border: Border.all(color: c.seam),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(topic.title,
                    style: AbhText.title3.copyWith(color: c.fg)),
              ),
              GestureDetector(
                onTap: onClose,
                child: SizedBox(
                  width: 40,
                  height: 40,
                  child: Center(
                    child: Text('✕',
                        style: AbhText.body.copyWith(color: c.fgSubtle)),
                  ),
                ),
              ),
            ],
          ),
          if (topic.whyItMatters.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(topic.whyItMatters,
                style: AbhText.foot.copyWith(color: c.fgMuted)),
          ],
          const SizedBox(height: 12),
          if (status == MapStatus.locked)
            Text('Locked — finish what comes before it',
                style: AbhText.foot.copyWith(color: c.fgSubtle))
          else if (status == MapStatus.known)
            Text('Known', style: AbhText.foot.copyWith(color: c.known))
          else
            GestureDetector(
              onTap: onComplete,
              child: ScaledBox(
                height: 42,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: c.accent,
                  borderRadius: BorderRadius.circular(Radii.pill),
                ),
                child: Text(
                  unlocks > 0 ? 'Mark known — opens $unlocks' : 'Mark known',
                  textAlign: TextAlign.center,
                  style: AbhText.headline.copyWith(color: c.accentContrast),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
