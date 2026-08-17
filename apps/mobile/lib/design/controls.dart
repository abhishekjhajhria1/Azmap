/// Shared controls.
///
/// Extracted from onboarding the moment Settings needed the same ones. Two
/// copies of a toggle is how two screens end up disagreeing about what "on"
/// looks like — and the settings screen is precisely where a person checks
/// what they chose during onboarding.
///
/// One rule runs through all of them: **the density preference never shrinks a
/// tap target.** Rows compress, type compresses, hit areas do not. A compact
/// mode that misses is not compact, it's broken.
library;

import 'package:flutter/widgets.dart';

import 'tokens.dart';


class ChoiceRow extends StatelessWidget {
  const ChoiceRow({
    required this.label,
    required this.detail,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final String detail;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = AbhTheme.of(context);
    return Semantics(
      button: true,
      selected: selected,
      label: label,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: Container(
          // Never compressed by the density preference — this is a tap target.
          constraints: const BoxConstraints(minHeight: Metrics.tapTarget + 12),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          color: selected
              ? c.accent.withValues(alpha: 0.09)
              : const Color(0x00000000),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(label,
                        style: AbhText.headline.copyWith(
                          color: selected ? c.accent : c.fg,
                        )),
                    const SizedBox(height: 2),
                    Text(detail,
                        style: AbhText.foot.copyWith(color: c.fgMuted)),
                  ],
                ),
              ),
              // Shape carries the state, colour only reinforces it — a filled
              // ring reads as chosen even in greyscale.
              Container(
                width: 20,
                height: 20,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                      color: selected ? c.accent : c.hairline, width: 1.8),
                ),
                child: selected
                    ? Container(
                        width: 10,
                        height: 10,
                        decoration:
                            BoxDecoration(color: c.accent, shape: BoxShape.circle),
                      )
                    : null,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class Swatch extends StatelessWidget {
  const Swatch({
    required this.choice,
    required this.selected,
    required this.onTap,
  });

  final AccentChoice choice;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = AbhTheme.of(context);
    final colour = choice.resolve(c.isDark);
    return Semantics(
      button: true,
      selected: selected,
      label: choice.name,
      child: GestureDetector(
        onTap: onTap,
        child: SizedBox(
          // 44 outer, 30 inner: the swatch can be small, the target cannot.
          width: Metrics.tapTarget,
          height: Metrics.tapTarget,
          child: Center(
            child: Container(
              width: 30,
              height: 30,
              decoration: BoxDecoration(
                color: colour,
                shape: BoxShape.circle,
                border: Border.all(
                  color: selected ? c.fg : const Color(0x00000000),
                  width: 2,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class Segmented extends StatelessWidget {
  const Segmented({
    required this.options,
    required this.index,
    required this.onSelect,
  });

  final List<String> options;
  final int index;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) {
    final c = AbhTheme.of(context);
    return Container(
      height: Metrics.tapTarget,
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: c.surface2,
        borderRadius: BorderRadius.circular(Radii.pill),
      ),
      child: Row(
        children: [
          for (var i = 0; i < options.length; i++)
            Expanded(
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () => onSelect(i),
                child: Container(
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: i == index ? c.surface : const Color(0x00000000),
                    borderRadius: BorderRadius.circular(Radii.pill),
                  ),
                  child: Text(
                    options[i],
                    style: AbhText.foot.copyWith(
                      color: i == index ? c.fg : c.fgMuted,
                      fontWeight: i == index ? FontWeight.w600 : FontWeight.w500,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class Toggle extends StatelessWidget {
  const Toggle({
    required this.label,
    required this.detail,
    required this.value,
    required this.onChanged,
  });

  final String label;
  final String detail;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final c = AbhTheme.of(context);
    return Semantics(
      toggled: value,
      label: label,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () => onChanged(!value),
        child: SizedBox(
          height: Metrics.tapTarget + 8,
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(label, style: AbhText.headline.copyWith(color: c.fg)),
                    const SizedBox(height: 2),
                    Text(detail,
                        style: AbhText.foot.copyWith(color: c.fgMuted)),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              AnimatedContainer(
                duration: AbhTheme.durationOf(
                    context, const Duration(milliseconds: 180)),
                width: 46,
                height: 28,
                padding: const EdgeInsets.all(3),
                alignment:
                    value ? Alignment.centerRight : Alignment.centerLeft,
                decoration: BoxDecoration(
                  color: value ? c.accent : c.surface2,
                  borderRadius: BorderRadius.circular(Radii.pill),
                ),
                child: Container(
                  width: 22,
                  height: 22,
                  decoration: BoxDecoration(
                    color: value ? c.accentContrast : c.fgSubtle,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class PrimaryButton extends StatelessWidget {
  const PrimaryButton({required this.label, required this.onTap});
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = AbhTheme.of(context);
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 52,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: c.accent,
          borderRadius: BorderRadius.circular(Radii.pill),
        ),
        child: Text(label,
            style: AbhText.headline.copyWith(color: c.accentContrast)),
      ),
    );
  }
}
