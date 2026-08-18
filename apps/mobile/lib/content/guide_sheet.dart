/// The guide reader.
///
/// A roadmap answers *what to study, in what order*. A guide answers everything
/// else — how the paper is actually marked, what to do in the last month, which
/// widely-repeated advice is wrong — and for an exam that matters, that is half
/// the product.
///
/// The caveat is chrome, not a footnote. A guide to an exam whose syllabus
/// changes yearly has to say so where it cannot be missed; one that doesn't is
/// worse than no guide, because it is confidently out of date.
library;

import 'package:flutter/widgets.dart';

import '../design/layout.dart';
import '../design/tokens.dart';
import 'library.dart';

class GuideSheet extends StatefulWidget {
  const GuideSheet({super.key, required this.guide, required this.onClose});

  final Guide guide;
  final VoidCallback onClose;

  @override
  State<GuideSheet> createState() => _GuideSheetState();
}

class _GuideSheetState extends State<GuideSheet> {
  late String _active = widget.guide.sections.first.id;

  @override
  Widget build(BuildContext context) {
    final c = AbhTheme.of(context);
    final m = AbhTheme.metricsOf(context);
    final safe = MediaQuery.paddingOf(context);
    final section = widget.guide.sections
        .firstWhere((s) => s.id == _active,
            orElse: () => widget.guide.sections.first);

    return ColoredBox(
      color: c.bg,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: EdgeInsets.fromLTRB(m.pagePadH, safe.top + 16, m.pagePadH, 0),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(widget.guide.title,
                          style: AbhText.title3.copyWith(color: c.fg)),
                      const SizedBox(height: 2),
                      Text(widget.guide.subtitle,
                          style: AbhText.foot.copyWith(color: c.fgMuted)),
                    ],
                  ),
                ),
                GestureDetector(
                  onTap: widget.onClose,
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
          ),

          if (widget.guide.caveat != null)
            Container(
              margin: EdgeInsets.fromLTRB(m.pagePadH, 12, m.pagePadH, 0),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: c.ai.withValues(alpha: 0.09),
                borderRadius: BorderRadius.circular(Radii.md),
              ),
              child: Text(widget.guide.caveat!,
                  style: AbhText.foot.copyWith(color: c.fgMuted)),
            ),

          // Section index as a horizontal strip. A guide is read in parts and
          // returned to, so getting back to a section must not mean scrolling
          // through the one before it.
          SizedBox(
            height: Metrics.tapTarget + 12,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: EdgeInsets.symmetric(horizontal: m.pagePadH),
              children: [
                for (final s in widget.guide.sections)
                  GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: () => setState(() => _active = s.id),
                    child: Container(
                      margin: const EdgeInsets.only(right: 8),
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: s.id == _active
                            ? c.accent.withValues(alpha: 0.13)
                            : c.surface,
                        borderRadius: BorderRadius.circular(Radii.pill),
                        border: Border.all(color: c.seam),
                      ),
                      child: Text(
                        s.title,
                        style: AbhText.foot.copyWith(
                          color: s.id == _active ? c.accent : c.fgMuted,
                          fontWeight:
                              s.id == _active ? FontWeight.w600 : FontWeight.w500,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),

          Expanded(
            child: DocColumn(
              child: ListView(
                padding: EdgeInsets.fromLTRB(
                    m.pagePadH, 8, m.pagePadH, safe.bottom + 40),
                children: [
                  Text(section.title,
                      style: AbhText.title3.copyWith(color: c.fg)),
                  const SizedBox(height: 12),
                  ..._body(context, section.body),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Markdown-lite: blank-line paragraphs, `- ` bullets, `**bold**`.
  ///
  /// Hand-rolled deliberately. A full Markdown parser is a dependency to render
  /// text we author ourselves, and the constrained format is a feature — it
  /// keeps guide bodies readable in the source file too.
  List<Widget> _body(BuildContext context, String body) {
    final c = AbhTheme.of(context);
    final blocks = body.trim().split(RegExp(r'\n{2,}'));

    return [
      for (final block in blocks)
        Padding(
          padding: const EdgeInsets.only(bottom: 14),
          child: block.split('\n').every((l) => l.trimLeft().startsWith('- '))
              ? Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    for (final line in block.split('\n'))
                      Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Padding(
                              padding: const EdgeInsets.only(top: 8, right: 10),
                              child: Container(
                                width: 4,
                                height: 4,
                                decoration: BoxDecoration(
                                    color: c.fgSubtle, shape: BoxShape.circle),
                              ),
                            ),
                            Expanded(
                              child: _inline(
                                  context, line.trimLeft().substring(2)),
                            ),
                          ],
                        ),
                      ),
                  ],
                )
              : _inline(context, block.replaceAll('\n', ' ')),
        ),
    ];
  }

  /// `**bold**` becomes emphasis in the foreground colour. Nothing else.
  Widget _inline(BuildContext context, String text) {
    final c = AbhTheme.of(context);
    final parts = text.split(RegExp(r'(\*\*[^*]+\*\*)'));

    return Text.rich(
      TextSpan(
        children: [
          for (final part in parts)
            if (part.startsWith('**') && part.endsWith('**'))
              TextSpan(
                text: part.substring(2, part.length - 2),
                style: AbhText.body
                    .copyWith(color: c.fg, fontWeight: FontWeight.w600),
              )
            else
              TextSpan(
                  text: part, style: AbhText.body.copyWith(color: c.fgMuted)),
        ],
      ),
    );
  }
}
