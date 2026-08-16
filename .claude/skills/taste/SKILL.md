---
name: taste
description: >-
  Load BEFORE writing or changing any UI in this repo — every component, screen,
  Tailwind class, color, layout, or icon choice. A design-taste playbook that
  turns "dirt cheap / AI-slop" interfaces into ones that look like a top product
  team shipped them. Triggers: "make it look better/premium/polished", "looks
  cheap", styling a component, a new screen, spacing/typography/color/motion
  decisions, icons, empty/loading states, or any visual review.
---

# Taste — the design-quality playbook for ABH

Ship interfaces that feel like Linear / Vercel / Apple made them. This is a
judgment guide, not a component library. Read it, then design deliberately.

## 0. The cheap-tells checklist (fix these first — they read as "AI slop")

Scan any screen for these. Each one alone makes it look amateur:

1. **Emoji as UI icons.** Never. Use `lucide-react` (already installed).
   Emoji belong in user content, never in nav/buttons/labels/empty-states.
2. **Everything one size / one weight.** No type hierarchy → looks like a form.
3. **Even, cramped spacing.** No rhythm, no breathing room, no grouping.
4. **Pure black / pure white / pure gray borders.** Use the token palette
   (`--fg`, `--hairline`, `--surface`) — never `#000`, `#fff`, `border-gray-300`.
5. **Flat, depthless cards** with a hard 1px gray border and no elevation.
6. **No motion.** Nothing responds to hover/press/enter. Feels dead.
7. **Default browser focus rings, default selects, default checkboxes.**
8. **Centered everything** with no alignment grid.
9. **Walls of text** at 100% width, no max-width, line-length > 75ch.
10. **Placeholder empty states** ("No data") with no icon, art, or next action.

If any are present, they are the first thing to fix.

## 1. Commit to a direction (don't design "neutral by accident")

Generic is the enemy. Decide the vibe and hold it everywhere: ABH is
**calm, precise, editorial** — a focused tool, not a toy. Restraint + one
confident accent. When in doubt, remove, align, and increase contrast of
*hierarchy* (not of raw color).

## 2. Typography

- **One type scale**, ~1.2–1.25 ratio. e.g. 12 / 13 / 15 / 18 / 24 / 32 / 44.
  Body 15–16px. Never ship 3 near-identical sizes.
- **Weight for hierarchy**, not size alone: 600–700 headings, 500 labels,
  400–450 body. Muted color (`text-muted`) for secondary, not smaller-only.
- **Tighten display headings**: `tracking-tight` / negative letter-spacing on
  large text; never on small text.
- **Line length 60–75ch** (`max-w-prose`/`max-w-2xl`), line-height ~1.5 body,
  ~1.1 headings.
- **Numbers/labels**: uppercase eyebrows at `text-[11px] tracking-[0.15em]`.
- Product UI: a clean workhorse (Inter/system) is correct and *not* cheap.
  Reserve a distinctive display face for marketing hero moments only.

## 3. Color (discipline > variety)

- Use the semantic tokens (`bg`, `surface`, `surface-2`, `fg`, `muted`,
  `subtle`, `hairline`, `accent`, `known`, `available`, `ai`). Never hardcode
  hex in components; both themes must work (see the `theme` system).
- **One accent.** Amber = primary action; green = known/success; violet = AI;
  everything else neutral. Color earns attention — spend it rarely.
- Tint, don't saturate: active states use `color-mix(... accent 12–15% ...)`,
  not full accent fills, except primary buttons.
- Contrast: body text ≥ 4.5:1, large text ≥ 3:1, in **both** themes.

## 4. Space & layout

- **8px rhythm** (4px for tight). Consistent gaps; group related, separate
  unrelated with more space than you think (generous > cramped).
- Align to a grid; establish a max content width; don't center-stretch.
- Padding scales with surface size: chips 8–10px, cards 20–24px, sections 48px+.
- Radii consistent: ~10px controls, ~16–20px cards/sheets, full for pills.

## 5. Depth & materials

- Prefer **soft, layered shadows** + hairline borders over hard 1px lines.
- **Glass** (`.glass`) for floating/elevated surfaces only (nav, sheets,
  modals, command palette, cards that float) over an ambient background —
  never on flat content areas.
- One or two elevation levels max. Don't outline everything.

## 6. Motion (subtle, physical, purposeful)

- Transitions 150–250ms, `cubic-bezier(.4,0,.2,1)`; springs for playful bits.
- Feedback on **hover** (lift `-translate-y-0.5`, brighten) and **press**
  (scale 0.98). Entrance: short fade/slide-up, stagger lists ~40ms.
- Respect `prefers-reduced-motion`. Never animate layout width/height on hover.
- Motion clarifies cause→effect; if it's just decoration, cut it.

## 7. Icons & imagery

- `lucide-react`, consistent size (18–20 in nav, 16 inline) and `strokeWidth`
  (~2). Icons inherit `currentColor`; tint the active one with the accent.
- Give icons a tinted tile (`h-11 w-11 rounded-xl bg-accent/15`) for feature
  cards and empty states — instant "designed" feel.

## 8. States are the product

Design all of them, every time: **empty** (icon + one line + a clear action),
**loading** (skeletons over spinners where possible), **hover/active/focus**
(visible, tokenized `--ring`), **disabled** (opacity + not-allowed),
**error**, and **success**. Empty states are a first impression — make them
inviting, not apologetic.

## 9. Before you call it done

- Squint: is there a clear focal point and hierarchy?
- Toggle light AND dark — both must look intentional.
- Check phone width: nothing cramped, tap targets ≥ 40px.
- Remove one more thing. Then align everything to the grid.

## Repo specifics

- Tokens + `.glass` + ambient live in `packages/ui/theme.css`; colours are CSS
  vars mapped to Tailwind (`bg-surface`, `text-fg`, …) — use those, not `forest-*`.
- Icons: `lucide-react`. Graph colours must stay theme-aware (`readThemeColors`).
- When unsure, match the calm/precise bar already set by the app shell and the
  roadmap runner.

## Provenance

Adapted for this repo from widely-recommended community practice (Anthropic's
Frontend Design skill; the community "Taste" and "UI/UX Pro Max" skills). Sources
noted in the PR/commit that introduced this skill.
