---
name: product
description: >-
  Load when building anything that shapes whether people adopt, return to, and
  rely on ABH — onboarding, first-run, empty states, streaks, progress, rewards,
  notifications, retention, widgets, or anything spanning surfaces (browser
  extension, mobile, desktop, web, sync, offline, deep links, share targets).
  Also for "make it addictive/sticky", "why do people drop off", "capture on
  laptop, continue on phone".
---

# Product — adoption, habit, and one product across devices

Three modes: **Activation** (the first 60 seconds), **Habit** (why they come
back), **Continuity** (one brain on every device).

## §1 Activation — win the first 60 seconds

Retention work is wasted if activation fails.

**ABH's aha moment:** *"I marked one thing known — and the map lit up with what
that just opened."* Everything in onboarding exists to reach it.
**Target: aha in under 60 seconds, in under 5 taps.**

- **No account, no email, no permissions up front.** Ask for anything only
  *after* value is delivered, and in context.
- **Ask at most 1–2 questions**, and only if the answer changes what they see.
- **Never show an empty map.** Seed a real slice (endowed progress) — a blank
  canvas is the #1 activation killer for graph products.
- **Do, don't tell**: no carousels, tours or videos. Teach through use.
- Structure session one as a single win: frame → one personalising choice →
  immediate payoff → **the cascade** (their first "mark known" must visibly
  unlock something, celebrated) → a hook for tomorrow.
- Every empty state = icon + value line + one primary action.
- Measure: % completing one topic in session 1, **time-to-first-unlock**,
  % returning within 48h. If time-to-first-unlock > 60s, cut steps.

## §2 Habit — make it indispensable, honestly

**Addictive-because-useful, not because-manipulative.** Every mechanic must
pass: *would the user thank us if they saw exactly how this worked?*

Design all four parts of the loop, or the habit dies:

- **Trigger** — external (widget, extension badge, "one step from unlocking X",
  a guardian's sign-off request) tied to an existing routine; and the internal
  one: *"I just learned something — where does it go?"*
- **Action** — under 10 seconds. Capture a link, mark one topic known, ask one
  question. No setup, no login, no decisions.
- **Reward** — variable and **visible**. ABH's signature: completing one topic
  visibly unlocks several others. Show it, animate it, celebrate it.
- **Investment** — every session makes the next better; the map densifies and
  becomes a possession. Show accumulated value ("11 topics · 34% · 9-day
  streak").

**Use:** forgiving streaks (with repair/freeze days), concrete progress, an
always-obvious next action, small frequent wins, social accountability (the
guardian is the strongest retention mechanic here), endowed progress, and a
session-closing hook showing what's newly open.

**Never ship:** guilt/shame notifications, fake urgency or scarcity,
unrepairable streaks, infinite feeds, notification spam, or anything optimising
*time in app*. **Measure value, not attention.**

**Gate every feature:** *Day 7* — what specifically brings them back? *Day 30* —
what would they lose by leaving? Vague answer = it won't retain.

## §3 Continuity — one brain, every device

**Capture anywhere in 2 seconds; it's already everywhere else.**

Each surface has ONE job: **extension** captures while reading · **mobile**
reviews and captures on the move · **desktop** organises and does deep work ·
**web** is the full-power reference. Port the *map* everywhere, not every
feature.

- **Offline-first always** — write locally first; sync is an enhancement.
- **Same model everywhere** — logic lives in `@abh/core`; never implement a rule
  twice. Same visual language via `@abh/ui`.
- **Capture entry points**: context menu, keyboard shortcut, share sheet,
  widget, global hotkey, drag-and-drop, paste. Capture must **never** require
  choosing where it goes — it lands in the inbox; connecting is a later step.
- **Continuity ≠ sync**: move *context* too — resume where you left off, deep
  links to any topic/roadmap, cross-surface handoff nudges, coherent
  notifications.
- **Sync (when the backend lands)**: optimistic local writes, merge by `rev`
  (the documented `importSnapshot("merge")` rule), deltas not snapshots,
  additive data never lost, encrypted, opt-in, with legible sync state.
- **Adapt, don't clone**: per-device navigation, keyboard on desktop, gestures
  and haptics on mobile, safe areas, Dynamic Type.

## Repo specifics

- Cascade + reveal: `graph.wouldUnlock()` / `revealedTopicIds()` in `@abh/core`.
- Streaks/progress/preferences live on the core `Profile` so every surface
  agrees. Onboarding: `apps/app/src/Onboarding.tsx`; celebration:
  `Celebration.tsx`.
- Pair with the `design` skill for how it all looks.

## Provenance

Merged from the project's `habit-design`, `activation` and
`cross-device-continuity` skills, plus `capture`, `deep-work` and
`weekly-review` (MIT, © 2025 Alireza Rezvani) as product-domain references.
Source material preserved under `reference/`.
