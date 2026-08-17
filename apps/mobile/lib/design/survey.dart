/// The survey field and the frosted material — ABH's identity, in Flutter.
///
/// The web version of this is pure CSS gradients; here it is a [CustomPainter],
/// which is the closer analogue than stacking translucent [Container]s and gets
/// the contour rings for free.
///
/// The concept, restated because it's the thing that stops this looking
/// generated: **a survey of what you know.** Not gradient orbs — every AI
/// landing page has the same purple-and-blue bokeh, it says nothing about the
/// product, and it is the single most recognisable tell of a generated
/// interface. A survey sheet says something: a fine measured grid with heavier
/// rules every fifth line, and contour rings where the land rises. It is drawn,
/// not glowed.
library;

import 'dart:ui' as ui;

import 'package:flutter/widgets.dart';

import 'tokens.dart';

/// The ground everything floats on. Paint it once, behind the whole app.
class SurveyGround extends StatelessWidget {
  const SurveyGround({super.key, this.child});
  final Widget? child;

  @override
  Widget build(BuildContext context) {
    final c = AbhTheme.of(context);
    return ColoredBox(
      color: c.bg,
      child: CustomPaint(
        painter: _SurveyPainter(c),
        // `isComplex` earns its keep: the field is static for the life of a
        // screen, so raster-caching it means the contour rings are drawn once
        // rather than on every frame of every scroll.
        isComplex: true,
        willChange: false,
        child: child,
      ),
    );
  }
}

class _SurveyPainter extends CustomPainter {
  const _SurveyPainter(this.c);
  final AbhColors c;

  /// Matches the web's 28px minor / 140px major rhythm.
  static const _minor = 28.0;
  static const _majorEvery = 5;

  @override
  void paint(Canvas canvas, Size size) {
    _paintWash(canvas, size);
    _paintGrid(canvas, size);
    _paintContours(canvas, size);
  }

  /// One faint wash of colour, so the glass has something to catch. Two
  /// radial pools, off-centre, so it never reads as a spotlight.
  void _paintWash(Canvas canvas, Size size) {
    final long = size.longestSide;

    canvas.drawRect(
      Offset.zero & size,
      Paint()
        ..shader = ui.Gradient.radial(
          Offset(size.width * 0.08, -size.height * 0.1),
          long * 0.85,
          [c.ambient1, c.ambient1.withValues(alpha: 0)],
          [0.0, 0.62],
        ),
    );
    canvas.drawRect(
      Offset.zero & size,
      Paint()
        ..shader = ui.Gradient.radial(
          Offset(size.width * 0.96, size.height * 1.08),
          long * 0.7,
          [c.ambient2, c.ambient2.withValues(alpha: 0)],
          [0.0, 0.62],
        ),
    );
  }

  /// 1px rules at 28, heavier every fifth, like a plotted sheet.
  ///
  /// Faded toward the bottom-right by a destination-in mask so the grid never
  /// fights the content sitting on top of it. Saving a layer for the mask is
  /// why this is one `saveLayer` rather than per-line alpha maths.
  void _paintGrid(Canvas canvas, Size size) {
    canvas.saveLayer(Offset.zero & size, Paint());

    final minor = Paint()
      ..color = c.rule
      ..strokeWidth = 1;
    final major = Paint()
      ..color = c.ruleStrong
      ..strokeWidth = 1;

    var i = 0;
    for (var x = 0.0; x <= size.width; x += _minor, i++) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height),
          i % _majorEvery == 0 ? major : minor);
    }
    i = 0;
    for (var y = 0.0; y <= size.height; y += _minor, i++) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y),
          i % _majorEvery == 0 ? major : minor);
    }

    canvas.drawRect(
      Offset.zero & size,
      Paint()
        ..blendMode = BlendMode.dstIn
        ..shader = ui.Gradient.radial(
          Offset(size.width * 0.12, 0),
          size.longestSide * 1.15,
          [const Color(0xFF000000), const Color(0x00000000)],
          [0.15, 0.78],
        ),
    );
    canvas.restore();
  }

  /// Concentric rings where the ground rises. Two centres, offset and at
  /// different spacings, so the pattern never reads as a target.
  void _paintContours(Canvas canvas, Size size) {
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1
      ..color = c.contour;

    void rings(Offset centre, double spacing, double maxRadius) {
      for (var r = spacing; r < maxRadius; r += spacing) {
        canvas.drawCircle(centre, r, paint);
      }
    }

    canvas.save();
    canvas.clipRect(Offset.zero & size);
    rings(Offset(size.width * 0.82, size.height * 0.18), 46, size.longestSide * 0.55);
    rings(Offset(size.width * 0.68, size.height * 0.96), 62, size.longestSide * 0.5);
    canvas.restore();
  }

  @override
  bool shouldRepaint(_SurveyPainter old) => old.c != c;
}

/// A pane of frosted glass: chrome that floats over the document.
///
/// Rationed on purpose — the dock, sheets, and the omnibar. Everything wearing
/// glass is the same as nothing wearing it, because depth only reads as depth
/// when some things are flat.
class GlassPanel extends StatelessWidget {
  const GlassPanel({
    super.key,
    required this.child,
    this.radius = Radii.lg,
    this.blur = 24,
    this.padding = EdgeInsets.zero,
  });

  final Widget child;
  final double radius;
  final double blur;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    final c = AbhTheme.of(context);
    final shape = BorderRadius.circular(radius);

    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: shape,
        boxShadow: [
          BoxShadow(
            color: c.glassShadow,
            blurRadius: c.isDark ? 40 : 34,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      // The clip must wrap the BackdropFilter, not the other way round: an
      // unclipped backdrop filter samples — and blurs — the entire screen.
      child: ClipRRect(
        borderRadius: shape,
        child: BackdropFilter(
          filter: ui.ImageFilter.blur(sigmaX: blur, sigmaY: blur),
          child: Container(
            padding: padding,
            decoration: BoxDecoration(
              color: c.glassBg,
              borderRadius: shape,
              border: Border.all(color: c.glassBorder, width: 1),
            ),
            child: child,
          ),
        ),
      ),
    );
  }
}

/// A stack of rows sharing one surface, separated by seams.
///
/// The alternative — every row in its own outlined box — is what makes a list
/// read as a form. One surface, hairline seams, no outlines.
class Stacked extends StatelessWidget {
  const Stacked({super.key, required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final c = AbhTheme.of(context);
    final rows = <Widget>[];
    for (var i = 0; i < children.length; i++) {
      if (i > 0) rows.add(Container(height: 1, color: c.seam));
      rows.add(children[i]);
    }

    return DecoratedBox(
      decoration: BoxDecoration(
        color: c.surface,
        borderRadius: BorderRadius.circular(Radii.md),
        border: Border.all(color: c.seam, width: 1),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(Radii.md),
        child: Column(mainAxisSize: MainAxisSize.min, children: rows),
      ),
    );
  }
}
