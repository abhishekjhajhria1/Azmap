/// Adaptive layout: one place that knows what shape the device is.
///
/// ## The three failures this exists to prevent
///
/// **1. A tablet getting a stretched phone.** The single most common way a
/// Flutter app looks unfinished on an iPad. A `ListView` with 22dp padding on a
/// 1024pt screen produces body text at ~150 characters per line; typographic
/// research puts comfortable reading at 45–75, and past about 90 the eye loses
/// its place returning to the next line. [readableWidth] caps it, and on wide
/// screens [TwoPane] uses the leftover space for something rather than nothing.
///
/// **2. Fixed heights meeting large text.** Every `height: 52` button in this
/// app clips its own label once someone sets text size to 200% — which is not an
/// exotic setting, it's the third notch in iOS Accessibility. [scaled] converts
/// a design height into one that grows with the system scale, and [minTapTarget]
/// keeps the floor.
///
/// **3. A hinge running through content.** Handled for the dock already; this
/// handles the harder case — a *vertical* hinge on a book-style fold, where a
/// single column of text is physically cut in half. [hingeOf] reports it and
/// [TwoPane] splits along it.
///
/// Breakpoints match `useBreakpoint` in the web app (<600 / 600–840 / >840) so a
/// screenshot of one can be laid over the other.
library;

import 'package:flutter/widgets.dart';

import 'tokens.dart';

enum FormFactor {
  /// Phone, or a folded cover screen.
  compact,

  /// Small tablet, large phone in landscape, or an unfolded book fold.
  medium,

  /// Tablet, iPad, desktop-class width.
  expanded,
}

extension FormFactorX on FormFactor {
  bool get isCompact => this == FormFactor.compact;
  bool get atLeastMedium => index >= FormFactor.medium.index;
  bool get isExpanded => this == FormFactor.expanded;
}

/// Everything layout needs to know, resolved once per build.
class Layout {
  const Layout({
    required this.form,
    required this.size,
    required this.hinge,
    required this.textScale,
  });

  final FormFactor form;
  final Size size;

  /// The fold's seam in local coordinates, when one crosses the window.
  final Rect? hinge;

  /// The system text size multiplier, clamped. Read from the platform, never
  /// invented.
  final double textScale;

  static Layout of(BuildContext context) {
    final media = MediaQuery.of(context);
    final width = media.size.width;

    final form = width < 600
        ? FormFactor.compact
        : width < 840
            ? FormFactor.medium
            : FormFactor.expanded;

    Rect? hinge;
    for (final feature in media.displayFeatures) {
      // `postures` covers a fold that is *bent*; a flat unfolded device reports
      // the seam too and content still shouldn't sit on it, so both count.
      if (feature.type == DisplayFeatureType.hinge ||
          feature.type == DisplayFeatureType.fold) {
        hinge = feature.bounds;
      }
    }

    return Layout(
      form: form,
      size: media.size,
      hinge: hinge,
      // Clamped at 2.0 rather than honoured without limit. Beyond that a phone
      // fits three words per line and no layout survives — iOS's own apps clamp
      // too. Below 1.0 is left alone: someone who wants smaller text gets it.
      textScale: media.textScaler.scale(100) / 100 > 2.0
          ? 2.0
          : media.textScaler.scale(100) / 100,
    );
  }

  /// A vertical seam splits left/right; a horizontal one splits top/bottom.
  bool get hasVerticalHinge => hinge != null && hinge!.height > hinge!.width;
  bool get hasHorizontalHinge => hinge != null && hinge!.width >= hinge!.height;

  /// Scale a design dimension so it survives large text.
  ///
  /// Not a blanket multiply: it grows with text but never shrinks below the
  /// design value, because a person who chose *smaller* text did not ask for
  /// smaller buttons.
  double scaled(double value) => value * (textScale < 1 ? 1 : textScale);

  /// The widest a column of prose may be.
  ///
  /// 34rem at the app's 15.5px body lands around 68 characters — inside the
  /// 45–75 band, and matching `.doc` in the web app's stylesheet.
  double get readableWidth => 560 * (textScale < 1 ? 1 : textScale);
}

/// Centres a document column and caps its width.
///
/// The single highest-value widget in this file: wrapping a space in one of
/// these is the difference between "designed for tablet" and "phone, stretched".
class DocColumn extends StatelessWidget {
  const DocColumn({super.key, required this.child, this.maxWidth});

  final Widget child;
  final double? maxWidth;

  @override
  Widget build(BuildContext context) {
    final layout = Layout.of(context);
    return Align(
      alignment: Alignment.topCenter,
      child: ConstrainedBox(
        constraints:
            BoxConstraints(maxWidth: maxWidth ?? layout.readableWidth),
        child: child,
      ),
    );
  }
}

/// Two columns on a wide screen, one on a narrow one — and never across a hinge.
///
/// [detail] is dropped entirely on compact rather than stacked below [primary].
/// Stacking is the tempting choice and the wrong one: it buries the secondary
/// content under a full screen of scrolling, where it is worse than absent
/// because it still costs a scroll to get past.
class TwoPane extends StatelessWidget {
  const TwoPane({
    super.key,
    required this.primary,
    required this.detail,
    this.primaryFlex = 3,
    this.detailFlex = 2,
  });

  final Widget primary;
  final Widget detail;
  final int primaryFlex;
  final int detailFlex;

  @override
  Widget build(BuildContext context) {
    final layout = Layout.of(context);

    // A vertical hinge forces two panes even on a "medium" width, because the
    // hardware has already split the screen whether the layout agrees or not.
    final split = layout.form.isExpanded || layout.hasVerticalHinge;
    if (!split) return primary;

    final hinge = layout.hasVerticalHinge ? layout.hinge : null;
    if (hinge != null) {
      // Panes sit either side of the physical seam, and the gap between them is
      // the seam itself — so nothing is ever rendered underneath it.
      return Row(
        children: [
          SizedBox(width: hinge.left, child: primary),
          SizedBox(width: hinge.width),
          Expanded(child: detail),
        ],
      );
    }

    return Row(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Expanded(flex: primaryFlex, child: primary),
        Container(width: 1, color: AbhTheme.of(context).seam),
        Expanded(flex: detailFlex, child: detail),
      ],
    );
  }
}

/// A box that is at least [height] tall and grows with the text size.
///
/// Replaces every `SizedBox(height: 52)` around a label. The plain version
/// clips its own text at large accessibility sizes — silently, with no overflow
/// warning in release builds, so the first report is "the button says 'Mark
/// know'".
class ScaledBox extends StatelessWidget {
  const ScaledBox({
    super.key,
    required this.height,
    required this.child,
    this.alignment = Alignment.center,
    this.decoration,
    this.padding,
  });

  final double height;
  final Widget child;
  final AlignmentGeometry alignment;
  final BoxDecoration? decoration;
  final EdgeInsets? padding;

  @override
  Widget build(BuildContext context) {
    final layout = Layout.of(context);
    return Container(
      constraints: BoxConstraints(
        minHeight: layout.scaled(height).clamp(Metrics.tapTarget, 400),
      ),
      alignment: alignment,
      padding: padding,
      decoration: decoration,
      child: child,
    );
  }
}
