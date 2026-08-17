/// Search — a button that becomes a search bar.
///
/// ## Why a button and not a permanent field
///
/// A search field parked on every screen costs a row of vertical space forever
/// to serve an action people take a few times a session. A floating circle
/// costs 44dp in a corner and, when tapped, becomes the field — the same object
/// changing shape rather than one thing disappearing and another appearing.
///
/// That distinction is the whole design. The morph is a single
/// [AnimatedContainer] on width and radius, so at every frame there is one
/// widget with continuous identity, and it reads as the button *opening*. Two
/// widgets cross-fading would read as a glitch, which is what most
/// implementations of this actually are.
///
/// It searches what the user owns — their topics and their captures — and
/// nothing else. When there is an AI to ask, this is where it plugs in: the
/// field is already the right shape for a question, and the results list
/// already has a place for an answer above the matches.
library;

import 'package:flutter/widgets.dart';

import '../design/layout.dart';
import '../design/survey.dart';
import '../design/tokens.dart';
import '../domain/models.dart';
import '../state/map_controller.dart';

class OmniSearch extends StatefulWidget {
  const OmniSearch({super.key, required this.onOpenTopic});

  /// Called when a result is chosen. The shell decides what "open" means.
  final ValueChanged<Topic> onOpenTopic;

  @override
  State<OmniSearch> createState() => _OmniSearchState();
}

class _OmniSearchState extends State<OmniSearch> {
  final _controller = TextEditingController();
  final _focus = FocusNode();
  bool _open = false;

  @override
  void initState() {
    super.initState();
    _controller.addListener(_onChanged);
    // Closing on blur means tapping anywhere else dismisses it, with no scrim
    // and nothing to explain. A search bar that needs a Cancel button is one
    // that has already taken over the screen.
    _focus.addListener(() {
      if (!_focus.hasFocus && _open) _close();
    });
  }

  void _onChanged() => setState(() {});

  @override
  void dispose() {
    _controller.removeListener(_onChanged);
    _focus.dispose();
    _controller.dispose();
    super.dispose();
  }

  void _openField() {
    setState(() => _open = true);
    _focus.requestFocus();
  }

  void _close() {
    _controller.clear();
    setState(() => _open = false);
    _focus.unfocus();
  }

  @override
  Widget build(BuildContext context) {
    final c = AbhTheme.of(context);
    final layout = Layout.of(context);
    final map = MapScope.of(context);
    final query = _controller.text.trim().toLowerCase();

    final results = query.isEmpty ? const <_Result>[] : _search(query, map);

    // The pill never spans the full width even when open. Reaching the edges
    // makes it read as a bar bolted to the screen instead of a control floating
    // over it — and on a tablet a 900pt-wide search field is absurd.
    final openWidth = (layout.size.width - Radii.floatInset * 2)
        .clamp(0.0, layout.readableWidth);
    final height = layout.scaled(48).clamp(Metrics.tapTarget, 200.0);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (results.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: SizedBox(
              width: openWidth,
              // Capped so results never cover the whole screen — you should
              // always be able to see enough context to know what you're
              // searching within.
              child: ConstrainedBox(
                constraints:
                    BoxConstraints(maxHeight: layout.size.height * 0.42),
                child: GlassPanel(
                  radius: Radii.lg,
                  child: ListView(
                    shrinkWrap: true,
                    padding: EdgeInsets.zero,
                    children: [
                      for (final r in results)
                        _ResultRow(
                          result: r,
                          onTap: () {
                            if (r.topic != null) widget.onOpenTopic(r.topic!);
                            _close();
                          },
                        ),
                    ],
                  ),
                ),
              ),
            ),
          ),

        // The morph. One widget, animating width and radius — not a button
        // being replaced by a field.
        AnimatedContainer(
          duration:
              AbhTheme.durationOf(context, const Duration(milliseconds: 260)),
          curve: Curves.easeOutCubic,
          width: _open ? openWidth : height,
          height: height,
          decoration: BoxDecoration(
            color: c.glassBg,
            borderRadius: BorderRadius.circular(Radii.pill),
            border: Border.all(color: c.glassBorder),
            boxShadow: [
              BoxShadow(
                color: c.glassShadow,
                blurRadius: c.isDark ? 30 : 24,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: _open
              ? _Field(
                  controller: _controller,
                  focus: _focus,
                  onClear: _close,
                  height: height,
                )
              : Semantics(
                  button: true,
                  label: 'Search your map',
                  child: GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: _openField,
                    child: Center(
                      child: CustomPaint(
                        size: Size.square(layout.scaled(19)),
                        painter: _MagnifierPainter(c.fg),
                      ),
                    ),
                  ),
                ),
        ),
      ],
    );
  }

  /// Ranked, not filtered.
  ///
  /// A title that *starts with* what you typed is almost always the one you
  /// meant; a mid-word match usually isn't. Alphabetical or insertion order
  /// would bury the obvious answer under six near-misses, which is how search
  /// ends up feeling broken while technically working.
  List<_Result> _search(String query, MapController map) {
    final out = <_Result>[];

    for (final t in map.topics) {
      final title = t.title.toLowerCase();
      if (title.startsWith(query)) {
        out.add(_Result(t.title, 'Topic', 0, topic: t));
      } else if (title.contains(query)) {
        out.add(_Result(t.title, 'Topic', 1, topic: t));
      } else if (t.summary.toLowerCase().contains(query)) {
        out.add(_Result(t.title, 'Topic', 2, topic: t));
      }
    }

    for (final capture in map.captures) {
      final title = capture.title.toLowerCase();
      if (title.contains(query) || capture.text.toLowerCase().contains(query)) {
        out.add(_Result(
          capture.title.isEmpty ? (capture.url ?? 'Untitled') : capture.title,
          'Saved',
          title.startsWith(query) ? 1 : 3,
        ));
      }
    }

    out.sort((a, b) => a.rank.compareTo(b.rank));
    return out.take(8).toList();
  }
}

class _Result {
  const _Result(this.title, this.kind, this.rank, {this.topic});
  final String title;
  final String kind;
  final int rank;
  final Topic? topic;
}

class _ResultRow extends StatelessWidget {
  const _ResultRow({required this.result, required this.onTap});

  final _Result result;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = AbhTheme.of(context);
    final m = AbhTheme.metricsOf(context);
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: ScaledBox(
        height: 46,
        alignment: Alignment.centerLeft,
        padding: EdgeInsets.symmetric(horizontal: m.rowPadH, vertical: 8),
        child: Row(
          children: [
            Expanded(
              child: Text(
                result.title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: AbhText.body.copyWith(color: c.fg),
              ),
            ),
            const SizedBox(width: 10),
            Text(result.kind,
                style: AbhText.foot.copyWith(color: c.fgSubtle, fontSize: 11)),
          ],
        ),
      ),
    );
  }
}

class _Field extends StatelessWidget {
  const _Field({
    required this.controller,
    required this.focus,
    required this.onClear,
    required this.height,
  });

  final TextEditingController controller;
  final FocusNode focus;
  final VoidCallback onClear;
  final double height;

  @override
  Widget build(BuildContext context) {
    final c = AbhTheme.of(context);
    return Row(
      children: [
        SizedBox(
          width: height,
          child: Center(
            child: CustomPaint(
              size: const Size.square(17),
              painter: _MagnifierPainter(c.fgSubtle),
            ),
          ),
        ),
        Expanded(
          child: Stack(
            alignment: Alignment.centerLeft,
            children: [
              // EditableText has no placeholder; that's a Material TextField
              // feature and Material isn't in this app.
              if (controller.text.isEmpty)
                IgnorePointer(
                  child: Text('Search your map',
                      style: AbhText.body.copyWith(color: c.fgSubtle)),
                ),
              EditableText(
                controller: controller,
                focusNode: focus,
                style: AbhText.body.copyWith(color: c.fg),
                cursorColor: c.accent,
                backgroundCursorColor: c.fgSubtle,
                textInputAction: TextInputAction.search,
              ),
            ],
          ),
        ),
        GestureDetector(
          onTap: onClear,
          child: SizedBox(
            width: height,
            child: Center(
              child: CustomPaint(
                size: const Size.square(15),
                painter: _ClosePainter(c.fgSubtle),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _MagnifierPainter extends CustomPainter {
  const _MagnifierPainter(this.color);
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final p = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.8
      ..strokeCap = StrokeCap.round;
    canvas.drawCircle(Offset(w * 0.42, w * 0.42), w * 0.3, p);
    canvas.drawLine(Offset(w * 0.64, w * 0.64), Offset(w * 0.9, w * 0.9), p);
  }

  @override
  bool shouldRepaint(_MagnifierPainter old) => old.color != color;
}

class _ClosePainter extends CustomPainter {
  const _ClosePainter(this.color);
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final p = Paint()
      ..color = color
      ..strokeWidth = 1.8
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(Offset(w * 0.22, w * 0.22), Offset(w * 0.78, w * 0.78), p);
    canvas.drawLine(Offset(w * 0.78, w * 0.22), Offset(w * 0.22, w * 0.78), p);
  }

  @override
  bool shouldRepaint(_ClosePainter old) => old.color != color;
}
