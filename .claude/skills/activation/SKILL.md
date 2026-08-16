---
name: activation
description: >-
  Load when building or changing anything a new user hits first — onboarding,
  empty states, first-run, sign-up, the first 60 seconds, demo/sample data,
  install flows, or when asked "why do people drop off / how do we get users to
  the wow moment". Designs the shortest path from open → "this is the most
  useful thing I've installed."
---

# Activation — win the first 60 seconds

Most users decide in under a minute. Retention work is wasted if activation
fails. The job: get a brand-new user to ABH's **aha moment** as fast as
possible, with nothing in the way.

## ABH's aha moment (name it, then engineer for it)

> *"I marked one thing known — and the map lit up with what that just opened."*

That's the moment the product explains itself. Everything in onboarding exists
to reach it. Secondary aha: *"I saved something I was reading and it landed in
my map, connected."*

**Target: aha in under 60 seconds, in under 5 taps.**

## 1. Rules for the first run

- **No account, no email, no permissions up front.** Local profile only. Ask for
  anything (notifications, guardians, sync) *after* value is delivered, and in
  context — never in a pre-flight wall.
- **Ask at most 1–2 questions**, and only if the answer changes what they see
  next. Name → "what do you want to learn?" is the maximum.
- **Never show an empty map.** Seed a small, real slice (endowed progress) or
  start them on a roadmap so the graph has shape from second one. A blank canvas
  is the #1 activation killer for map/graph products.
- **Do, don't tell.** No carousels, no coach-mark tours, no video. Let them take
  the real action immediately; teach through use.
- **Show, then let them undo.** Perform the unlock cascade for them if needed —
  it's more convincing than any explainer.

## 2. Structure the first session as a single win

1. **Frame** (1 screen): what this is, in their words, in one line.
2. **One choice** that personalises: pick something to learn *or* open the map.
3. **Immediate payoff**: land them on a populated map / a focused first topic
   with an obvious single next action.
4. **The cascade**: their first "mark known" must visibly unlock something.
   Celebrate it (motion + a clear "you unlocked N").
5. **The hook for tomorrow**: end with what's now open + a soft, optional way to
   be reminded (see `habit-design`).

## 3. Empty states are onboarding

Every empty state must have: an **icon**, a one-line **explanation of the
value**, and a **single primary action** (plus optionally "or see an example").
Never ship "No data." Empty ≠ broken; empty = an invitation. (See `taste` §8.)

## 4. Reduce time-to-value everywhere

- Pre-fill, default, and infer instead of asking.
- Make the primary action visually singular on every screen — one obvious
  amber button; everything else quiet.
- Kill dead ends: every screen answers "what now?"
- Instant feedback: optimistic UI, no spinners on local actions (it's all
  on-device — it should feel *instant*, and that speed is itself a selling point).
- Install/PWA prompts come after the win, never before.

## 5. Measure activation honestly

Define and track (locally is fine):
- % of new users who complete **one topic** in session 1 (the core activation
  event),
- time-to-first-unlock,
- % who make a second session within 48h.

If time-to-first-unlock is over a minute, cut steps until it isn't.

## 6. Pre-ship checklist

- [ ] Can a stranger reach the unlock cascade in < 60s with no explanation?
- [ ] Is there any wall (login/permission/setup) before value? Remove it.
- [ ] Is the map ever empty on first open? Fix it.
- [ ] Does every empty state have icon + value line + action?
- [ ] Is there exactly one obvious next action per screen?
- [ ] Does the first session end by showing what's newly open?

## Repo specifics

- First run lives in `apps/app/src/Onboarding.tsx`; profile + `onboardedAt` are
  on the core `Profile` record.
- Seeding a starter map: `MapStore.startRoadmap()` inflates a real roadmap with
  some steps pre-marked known — use it rather than shipping an empty graph.
- The cascade to showcase: `graph.wouldUnlock()` / `revealedTopicIds()`.
- Pair with `habit-design` (day 2+) and `taste` (how it looks).
