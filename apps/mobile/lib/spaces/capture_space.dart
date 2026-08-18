/// Capture — the inbox, and the part that makes it a brain.
///
/// Catching things is the easy half: one field, one key, done. The hard half is
/// that forty saved articles is a pile, not a brain. What makes it worth
/// keeping is that the things in it find each other — so the connections the
/// app has noticed sit directly above the inbox, where the unfiled pile and the
/// offer to file it are in one glance.
///
/// The matching runs on this device with no model and no network: term overlap
/// weighted by how unusual a word is in *this user's own* map. See
/// `lib/mind/local_mind.dart`.
library;

import 'package:flutter/widgets.dart';

import '../design/survey.dart';
import '../design/tokens.dart';
import '../domain/models.dart';
import '../mind/local_mind.dart';
import '../prefs/preferences.dart';
import '../state/map_controller.dart';

class CaptureSpace extends StatefulWidget {
  const CaptureSpace({super.key});

  @override
  State<CaptureSpace> createState() => _CaptureSpaceState();
}

class _CaptureSpaceState extends State<CaptureSpace> {
  final _field = TextEditingController();

  /// Links waved away this session. Deliberately not persisted: "not that one,
  /// not now" is what a dismissal means, and a link that's wrong at four notes
  /// may be right at forty.
  final _dismissed = <String>{};

  @override
  void dispose() {
    _field.dispose();
    super.dispose();
  }

  void _save() {
    final text = _field.text.trim();
    if (text.isEmpty) return;
    final isUrl = RegExp(r'^https?://', caseSensitive: false).hasMatch(text);
    MapScope.of(context).addCapture(
      kind: isUrl ? 'page' : 'note',
      title: isUrl ? text : (text.length > 80 ? text.substring(0, 80) : text),
      url: isUrl ? text : null,
      text: isUrl ? '' : text,
    );
    _field.clear();
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final c = AbhTheme.of(context);
    final m = AbhTheme.metricsOf(context);
    final prefs = PrefsScope.valueOf(context);
    final map = MapScope.of(context);

    final links = LocalMind()
        .connect(graph: map.graph, captures: map.captures, limit: 6)
        .where((l) => !_dismissed.contains(l.key))
        .toList();

    return ListView(
      padding: EdgeInsets.symmetric(horizontal: m.pagePadH),
      children: [
        Text('CAPTURE', style: AbhText.eyebrow.copyWith(color: c.fgSubtle)),
        const SizedBox(height: 10),
        Text("Catch it before it's gone.",
            style: AbhText.title1.copyWith(color: c.fg)),
        const SizedBox(height: 16),

        _CaptureField(controller: _field, onSubmit: _save),

        if (links.isNotEmpty) ...[
          const SizedBox(height: 26),
          Row(
            children: [
              Text('CONNECTIONS',
                  style: AbhText.eyebrow.copyWith(color: c.fgSubtle)),
              if (prefs.guidance == Guidance.full) ...[
                const SizedBox(width: 8),
                Text('found on this device',
                    style: AbhText.foot.copyWith(color: c.fgSubtle)),
              ],
            ],
          ),
          const SizedBox(height: 10),
          Stacked(
            children: [
              for (final link in links)
                _ConnectionRow(
                  headline: link.headline(map.topics, map.captures),
                  why: link.why,
                  onAccept: () {
                    _accept(link);
                    setState(() => _dismissed.add(link.key));
                  },
                  onDismiss: () => setState(() => _dismissed.add(link.key)),
                ),
            ],
          ),
        ],

        const SizedBox(height: 26),
        Row(
          children: [
            Text('INBOX', style: AbhText.eyebrow.copyWith(color: c.fgSubtle)),
            const Spacer(),
            if (map.captures.isNotEmpty)
              Text('${map.captures.length}',
                  style: AbhText.foot.copyWith(color: c.fgSubtle)),
          ],
        ),
        const SizedBox(height: 10),

        if (map.captures.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 26),
            child: Text(
              'Nothing captured yet. Save a link above, or share a page to ABH '
              'from any app.',
              style: AbhText.body.copyWith(color: c.fgMuted),
            ),
          )
        else
          Stacked(
            children: [
              for (final capture in map.captures)
                Padding(
                  padding: EdgeInsets.symmetric(
                      horizontal: m.rowPadH, vertical: m.rowPadV),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          capture.title.isEmpty
                              ? (capture.url ?? 'Untitled')
                              : capture.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: AbhText.body.copyWith(color: c.fg),
                        ),
                      ),
                      if (capture.linkedTopicIds.isNotEmpty)
                        Text('filed',
                            style: AbhText.foot.copyWith(color: c.known)),
                    ],
                  ),
                ),
            ],
          ),
      ],
    );
  }

  /// The three kinds do genuinely different things, and collapsing them would
  /// lose the distinction that makes the matching worth having: filing a note
  /// under a node that exists is not the same as minting a new one.
  void _accept(ProposedLink link) {
    final map = MapScope.of(context);
    switch (link.kind) {
      case LinkKind.captureTopic:
        map.linkCapture(link.fromId, link.toId);
      case LinkKind.captureNewTopic:
        final topic = map.addTopic(link.draftTitle);
        map.linkCapture(link.fromId, topic.id);
      case LinkKind.topicTopic:
        // Soft, not hard. This is a resemblance the app noticed, not a
        // prerequisite the user asserted — and a wrong hard edge would lock a
        // topic they could have started today.
        map.addEdge(link.fromId, link.toId, strength: EdgeStrength.soft);
    }
  }
}

/// Stateful for one reason: it owns a [FocusNode].
///
/// Creating one inline in `build` leaks a node on every rebuild and drops focus
/// mid-typing — the field closes the keyboard by itself and the text you were
/// entering stops arriving.
class _CaptureField extends StatefulWidget {
  const _CaptureField({required this.controller, required this.onSubmit});

  final TextEditingController controller;
  final VoidCallback onSubmit;

  @override
  State<_CaptureField> createState() => _CaptureFieldState();
}

class _CaptureFieldState extends State<_CaptureField> {
  final _focus = FocusNode();

  @override
  void initState() {
    super.initState();
    // The hint has to disappear the moment there's text, and EditableText does
    // not repaint its parent — so listen to both.
    widget.controller.addListener(_onChanged);
    _focus.addListener(_onChanged);
  }

  void _onChanged() => setState(() {});

  @override
  void dispose() {
    widget.controller.removeListener(_onChanged);
    _focus.removeListener(_onChanged);
    _focus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = AbhTheme.of(context);
    final controller = widget.controller;
    final onSubmit = widget.onSubmit;
    return Container(
      padding: const EdgeInsets.only(left: 18, right: 6),
      height: 56,
      decoration: BoxDecoration(
        color: c.surface,
        borderRadius: BorderRadius.circular(Radii.pill),
        border: Border.all(color: c.seam),
      ),
      child: Row(
        children: [
          Expanded(
            // EditableText has no placeholder of its own — that's a Material
            // TextField feature, and Material is not in this app. One Stack
            // is cheaper than pulling the whole library in for a hint.
            child: Stack(
              alignment: Alignment.centerLeft,
              children: [
                if (controller.text.isEmpty)
                  IgnorePointer(
                    child: Text(
                      'Paste a link or write a note…',
                      style: AbhText.body.copyWith(color: c.fgSubtle),
                    ),
                  ),
                EditableText(
                  controller: controller,
                  focusNode: _focus,
                  style: AbhText.body.copyWith(color: c.fg),
                  cursorColor: c.accent,
                  backgroundCursorColor: c.fgSubtle,
                  onSubmitted: (_) => onSubmit(),
                  // The keyboard's return key does the primary action. On a
                  // phone that's the difference between two taps and one.
                  textInputAction: TextInputAction.done,
                ),
              ],
            ),
          ),
          GestureDetector(
            onTap: onSubmit,
            child: Container(
              width: 44,
              height: 44,
              alignment: Alignment.center,
              decoration: BoxDecoration(color: c.accent, shape: BoxShape.circle),
              child: CustomPaint(
                size: const Size.square(18),
                painter: _PlusPainter(c.accentContrast),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _PlusPainter extends CustomPainter {
  const _PlusPainter(this.color);
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()
      ..color = color
      ..strokeWidth = 2.2
      ..strokeCap = StrokeCap.round;
    final w = size.width;
    canvas.drawLine(Offset(w * 0.5, w * 0.15), Offset(w * 0.5, w * 0.85), p);
    canvas.drawLine(Offset(w * 0.15, w * 0.5), Offset(w * 0.85, w * 0.5), p);
  }

  @override
  bool shouldRepaint(_PlusPainter old) => old.color != color;
}

/// One proposed connection, built around the sentence rather than the buttons.
///
/// An unexplained suggestion is one the user has to audit themselves, which
/// costs more than it saves. No confidence score on screen: it's a ranking
/// signal, not a probability, and showing "72%" invites trust in a number that
/// doesn't mean what it looks like.
class _ConnectionRow extends StatelessWidget {
  const _ConnectionRow({
    required this.headline,
    required this.why,
    required this.onAccept,
    required this.onDismiss,
  });

  final String headline;
  final String why;
  final VoidCallback onAccept;
  final VoidCallback onDismiss;

  @override
  Widget build(BuildContext context) {
    final c = AbhTheme.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 10, 8, 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: c.ai.withValues(alpha: 0.13),
              borderRadius: BorderRadius.circular(10),
            ),
            child: CustomPaint(painter: _LinkPainter(c.ai)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(headline,
                    style: AbhText.headline.copyWith(color: c.fg, fontSize: 14.5)),
                const SizedBox(height: 2),
                Text(why, style: AbhText.foot.copyWith(color: c.fgMuted)),
              ],
            ),
          ),
          _RoundButton(onTap: onDismiss, child: _CrossPainter(c.fgSubtle)),
          const SizedBox(width: 4),
          _RoundButton(
            onTap: onAccept,
            background: c.accent.withValues(alpha: 0.14),
            child: _TickGlyph(c.accent),
          ),
        ],
      ),
    );
  }
}

class _RoundButton extends StatelessWidget {
  const _RoundButton({required this.onTap, required this.child, this.background});

  final VoidCallback onTap;
  final CustomPainter child;
  final Color? background;

  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: onTap,
        // 40dp, not 28: the visual circle can be small, the tap target cannot.
        // Anything under 44pt on iOS / 48dp on Android is a miss waiting to
        // happen, and this row has two of them side by side.
        child: Container(
          width: 40,
          height: 40,
          alignment: Alignment.center,
          child: Container(
            width: 30,
            height: 30,
            alignment: Alignment.center,
            decoration: BoxDecoration(color: background, shape: BoxShape.circle),
            child: CustomPaint(size: const Size.square(14), painter: child),
          ),
        ),
      );
}

class _LinkPainter extends CustomPainter {
  const _LinkPainter(this.color);
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final p = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.6
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(Offset(w * 0.38, w * 0.62), Offset(w * 0.62, w * 0.38), p);
    canvas.drawArc(
        Rect.fromLTWH(w * 0.22, w * 0.5, w * 0.3, w * 0.3), 0.6, 3.6, false, p);
    canvas.drawArc(
        Rect.fromLTWH(w * 0.48, w * 0.2, w * 0.3, w * 0.3), 3.7, 3.6, false, p);
  }

  @override
  bool shouldRepaint(_LinkPainter old) => old.color != color;
}

class _TickGlyph extends CustomPainter {
  const _TickGlyph(this.color);
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    canvas.drawPath(
      Path()
        ..moveTo(w * 0.14, w * 0.55)
        ..lineTo(w * 0.4, w * 0.8)
        ..lineTo(w * 0.88, w * 0.22),
      Paint()
        ..color = color
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.9
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round,
    );
  }

  @override
  bool shouldRepaint(_TickGlyph old) => old.color != color;
}

class _CrossPainter extends CustomPainter {
  const _CrossPainter(this.color);
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final p = Paint()
      ..color = color
      ..strokeWidth = 1.8
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(Offset(w * 0.2, w * 0.2), Offset(w * 0.8, w * 0.8), p);
    canvas.drawLine(Offset(w * 0.8, w * 0.2), Offset(w * 0.2, w * 0.8), p);
  }

  @override
  bool shouldRepaint(_CrossPainter old) => old.color != color;
}
