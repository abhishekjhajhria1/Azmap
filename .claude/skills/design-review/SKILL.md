---
name: design-review
description: >-
  Load to review a UI before shipping it — after building or changing a screen,
  when asked "is this good enough / does this look cheap / review the design", or
  as a pre-commit gate on frontend changes. Runs a structured visual-quality
  pass and reports concrete, prioritized fixes. Pairs with `taste` (the how) —
  this is the how-to-check.
---

# Design Review — a pre-ship quality gate

Review the actual rendered result, not just the code. **Screenshot it** (this
repo uses headless Chromium via Playwright at `/opt/pw-browsers`, with WebGL
flags `--enable-unsafe-swiftshader --use-gl=angle --use-angle=swiftshader`), in
**light AND dark**, at **phone + desktop** widths. Then grade against the
checklist and report findings worst-first with a concrete fix for each.

## The checklist (score each: pass / needs-work / fail)

**First impression**
- Clear focal point and visual hierarchy within 2 seconds?
- Does it look intentional and premium, or like a default/AI-slop template?

**The cheap tells** (any present = fail — see `taste` §0)
- Emoji-as-icons, single type size/weight, cramped even spacing, hard gray
  borders, flat depthless cards, no motion, default form controls, unstyled
  empty states.

**Typography** — real scale? weight-based hierarchy? line length 60–75ch?
tight tracking on display only? muted secondary text?

**Color** — tokens only (no hardcoded hex)? one accent, spent sparingly?
contrast ≥ 4.5:1 body in both themes?

**Space & layout** — consistent 8px rhythm? grouped by proximity? aligned to a
grid? generous, not cramped? sensible max-width?

**Depth & material** — soft shadows + hairlines (not hard 1px)? glass only on
floating surfaces? ≤ 2 elevation levels?

**Motion** — hover/press feedback? tasteful entrances? reduced-motion safe?

**States** — empty (icon + line + action), loading (skeletons), focus (visible,
tokenized ring), disabled, error, success — all designed?

**Responsive & themes** — phone not cramped, tap targets ≥ 40px, both light and
dark look deliberate, no theme flash.

**Accessibility** — focus order, keyboard operable, labels/aria, contrast.

## Output format

For each finding: **[severity] area — what's wrong → the concrete fix**
(reference a `taste` rule). Rank cheap-tells and hierarchy issues highest.
End with: the single highest-impact change to make next.

Only report what you actually observed in the screenshots; don't assume.
