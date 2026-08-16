---
name: frontend-design
description: >-
  Load when building a NEW, high-impact surface where identity and wow-factor
  matter — a marketing/landing page, hero section, onboarding, launch screen, or
  any "make this memorable / distinctive / not generic" request. Pushes for a
  committed conceptual direction instead of safe defaults. For everyday product
  UI polish use the `taste` skill instead.
---

# Frontend Design — commit to a distinctive direction

Generic, centered, purple-gradient, Inter-everywhere pages are "AI slop." The
fix is not more polish — it's **conviction**. Pick one strong concept and
execute it fully.

## 1. Pick a lane (and commit)

Choose ONE and let it dictate every decision (type, color, space, motion, bg):

- **Brutally minimal** — massive type, vast whitespace, one accent, no chrome.
- **Editorial** — magazine grid, serif display, rules/columns, strong hierarchy.
- **Retro-futuristic / technical** — mono type, grid backgrounds, terminal cues.
- **Warm / organic** — soft shapes, grain, muted earthy palette.
- **Maximal / confident** — big color blocks, oversized elements, bold motion.

Half-committing reads as generic. Go further than feels comfortable, then pull
back 10%.

## 2. Typography with character

- Use a **distinctive pairing** for headline surfaces — a display face with
  personality + a clean workhorse for body. Avoid the defaults everyone uses
  (Inter/Roboto/Arial/Space Grotesk) *for the display role*; a clean sans is
  fine for body.
- Set a real scale with big jumps (hero 48–96px), tight tracking on display,
  generous leading on body. Type IS the design in minimal/editorial lanes.

## 3. Color system

- A committed palette, not "neutral + blue." Define bg / surface / ink / one
  or two accents and a rule for when each appears. Dark or light on purpose.
- Contrast is a feature: pair a quiet field with one loud moment.

## 4. Backgrounds & space

- Backgrounds are a canvas, not an afterthought: subtle grain, a soft mesh, a
  faint grid, a single blurred gradient orb — *one* idea, low intensity.
- Asymmetry and overlap beat centered stacks. Use a real grid and break it once.

## 5. Motion as signature

- One memorable motion idea (a reveal-on-scroll cadence, a magnetic button, a
  graph that breathes) done well beats ten random fades. Keep it 60fps and
  reduced-motion safe.

## 6. Anti-slop checklist

- [ ] Would I recognize this page from a thumbnail? (identity)
- [ ] Is there ONE committed concept, not three half-ideas?
- [ ] Distinctive display type, not the default font?
- [ ] A background idea, not a flat fill?
- [ ] One signature motion moment?
- [ ] Real hierarchy — a clear first, second, third read?

## Guardrails

Distinctive ≠ inaccessible: keep contrast, focus states, keyboard nav, and
reduced-motion. In this repo, still consume the theme tokens so light/dark work
— identity lives in type, layout, motion, and backgrounds, not in hardcoded hex.
For component-level polish and the cheap-tells checklist, use `taste`.
