---
name: design
description: >-
  Load BEFORE writing or changing ANY UI — components, screens, Tailwind
  classes, colour, type, spacing, icons, motion, empty/loading states, layout,
  or an Apple-platform surface. Also for "make it look better/premium/modern",
  "looks cheap/dated", design reviews, or "is this good enough to ship". Covers
  the taste playbook, committing to a distinctive direction, the pre-ship visual
  QA gate, and Apple HIG / Liquid Glass compliance.
---

# Design — how ABH looks and feels

One skill for the whole visual discipline. Four modes; use the one that fits:

| Mode | When |
| --- | --- |
| **Taste** (§1–§3) | Any UI change. The default. |
| **Direction** (§4) | A new high-impact surface: marketing, hero, onboarding. |
| **Review** (§5) | Before shipping a screen. |
| **Apple** (§6) | Polishing an iOS/macOS/visionOS surface. |

## §1 The cheap-tells checklist — fix these first

Each one alone makes a product look amateur:

1. **Emoji as UI icons.** Never — use `lucide-react`.
2. **Uniform type size/weight** → no hierarchy, reads like a form.
3. **Cramped, even spacing** with no rhythm or grouping.
4. **Beige/cream/mustard palettes** → reads institutional, "government website".
5. **Pure black/white or grey 1px borders everywhere**; outlining every element.
6. **Flat, depthless cards**; no elevation.
7. **No motion** — nothing responds to hover or press.
8. **Default browser controls** and focus rings.
9. **Full-width text**, line length > 75ch.
10. **Bare empty states** ("No data") with no icon or next action.
11. **Squarish chrome welded to the screen edges.**

## §2 The rules

**Hierarchy comes from type, space and light — never from drawing boxes.**

- **Type**: one scale with dramatic jumps (this repo: `.t-hero` → `.t-eyebrow`).
  Weight carries hierarchy; negative tracking on display sizes only, never on
  small text. Body 15–16px, line length 60–75ch.
- **Colour**: near-monochrome neutrals + **one** vivid accent, spent rarely.
  Other colours are semantic only (success, AI). Never hardcode hex in
  components — use the tokens so both themes work. Contrast ≥ 4.5:1 body.
- **Space**: 8px rhythm (4px tight). Group by proximity; be generous.
- **Depth**: soft layered shadows + hairline *seams*, not outlines. Glass only
  on floating/elevated chrome, over an ambient background. ≤ 2 elevation levels.
- **Shape**: nothing sharp-cornered; chrome floats inset from edges, content
  scrolls underneath.
- **Motion**: 150–250ms, `cubic-bezier(.4,0,.2,1)`. Animate **transform/opacity
  only**. Hover = lift, press = scale 0.975. Respect `prefers-reduced-motion`.
  **Never** put a transition on `*` — it delays every interaction and reads as
  sluggish.
- **Icons**: `lucide-react`, consistent size (18–20 nav, 15–16 inline) and
  stroke; tint the active one with the accent; tinted tile for feature/empty.

## §3 States are the product

Design every one: **empty** (icon + one line + a clear action), **loading**
(skeletons over spinners), **hover/active/focus** (visible, tokenised ring),
**disabled**, **error**, **success**. Empty states are a first impression.

## §4 Direction — for high-impact surfaces

Generic is the enemy. Commit to ONE concept and let it drive type, colour,
space, motion and background: brutally minimal · editorial · retro-technical ·
warm organic · maximal. Pair a distinctive display face with a clean workhorse
for body. Backgrounds are a canvas (one subtle idea: grain, mesh, faint grid),
not a flat fill. One signature motion moment beats ten random fades.
Ask: *would I recognise this from a thumbnail?*

## §5 Review — the pre-ship gate

Review the **rendered result**, not the code. Screenshot it (headless Chromium
at `/opt/pw-browsers`; WebGL needs `--enable-unsafe-swiftshader --use-gl=angle
--use-angle=swiftshader`) in **light and dark**, at **phone and desktop**.
Grade against §1–§3, then report findings worst-first as
**[severity] area — what's wrong → the concrete fix**, ending with the single
highest-impact next change. Only report what you actually saw.

## §6 Apple platforms

For iOS/macOS/watchOS/visionOS surfaces: honour the HIG — tap targets ≥ 44pt,
Dynamic Type, safe areas, contrast on translucent/Liquid-Glass materials,
platform-idiomatic navigation, and reduced-transparency/reduced-motion
settings. Detailed HIG references and a checker script live in
`reference/apple-hig-expert/`.

## Repo specifics

Tokens, `.glass`/`.float`, `.group`, `.card`, `.pressable` and the type scale
live in `packages/ui/theme.css`; colours are CSS vars mapped to Tailwind
(`bg-surface`, `text-fg`, `text-accent`…). Icons: `lucide-react`. Graph colours
must stay theme-aware via `readThemeColors()`.

## Provenance

Merged from the project's `taste`, `frontend-design` and `design-review` skills
plus `apple-hig-expert` (MIT, © 2025 Alireza Rezvani). Full source material is
preserved under `reference/`.
