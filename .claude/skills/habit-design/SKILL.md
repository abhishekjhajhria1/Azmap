---
name: habit-design
description: >-
  Load when building ANY feature that should make ABH indispensable — streaks,
  progress, notifications, rewards, reminders, home screens, widgets, daily
  loops, retention, "why would they come back tomorrow?", or when asked to make
  the app addictive / sticky / habit-forming. Designs habit loops that hook
  users through real productivity gains, not dark patterns.
---

# Habit Design — make ABH the app they can't work without

Goal: users feel **most productive when they're in ABH**, and feel something is
missing on a day they don't open it. That comes from a tight habit loop wrapped
around genuine value — never from manipulation.

## The core rule

**Addictive-because-useful, not addictive-because-manipulative.** A productivity
tool that tricks you into opening it gets uninstalled the moment the user
notices. One that makes them visibly smarter every week gets defended. Every
mechanic below must pass: *would the user thank us if they saw exactly how this
worked?* If not, cut it.

## 1. The loop (Trigger → Action → Reward → Investment)

Design all four for every core feature. If one is missing, the habit dies.

**Trigger** — what starts the session.
- *External*: a widget showing the next topic, a browser-extension badge, a
  daily "your map is one step from unlocking X" nudge, a guardian's sign-off
  request. Tie triggers to an existing routine (morning coffee, commute, after
  a lecture) — not a random time.
- *Internal* (the real prize): the feeling "I just learned something — where
  does it go?" ABH must be the reflex answer to that itch. Name the itch in
  copy ("Catch it before it's gone").

**Action** — the smallest possible thing that delivers value.
- Must be doable in **under 10 seconds**: capture a link, mark one topic known,
  ask one question. Never require setup, login, or a decision to get value.
- Reduce every step: keyboard shortcut (⌘K), share-target, right-click capture,
  one-tap "mark known". Friction kills habits faster than boredom.

**Reward — make it variable and *visible*.**
- The signature payoff for ABH: **completing one topic visibly unlocks several
  others**, and the map *grows*. Show it, animate it, celebrate it — the unlock
  cascade is the dopamine, and it's earned.
- Variability comes from the graph itself: you never know exactly how much a
  step opens. Surface "you unlocked 3 new topics" with motion.
- Also reward: streak intact, % of map known ticking up, a new AI suggestion
  appearing at your frontier, a guardian's sign-off arriving.

**Investment** — every session must make the *next* session better.
- Each capture, accepted suggestion, and completed topic makes the map denser
  and more personal → higher switching cost, earned honestly.
- Show accumulated value constantly: "11 topics · 34% known · 9-day streak".
  The map IS the sunk value; make it feel like a possession.

## 2. Mechanics that work (use these)

- **Streaks** — but forgiving. Show the streak, and offer a "freeze"/grace day.
  A broken streak that punishes causes abandonment; a recoverable one causes
  return. Never guilt-trip copy.
- **Progress made concrete** — % known, topics unlocked, path position, "3 steps
  from React". Humans chase visible completion (Zeigarnik effect).
- **Next-action always obvious** — never land a user on a screen with no clear
  next move. "Open to you now" should be one tap from everywhere.
- **Small wins early and often** — a step should take minutes, not hours. Break
  big topics down so the reward cadence stays tight.
- **Social accountability (the guardian)** — someone else seeing your progress
  is the single strongest retention mechanic ABH has. Make sharing progress
  effortless and make the guardian's acknowledgment feel good.
- **Endowed progress** — start the map with a few things already known so it
  never looks empty; people finish what looks started.
- **Session-closing hook** — end each session by showing what's newly open, so
  there's an obvious reason to return.

## 3. Anti-patterns (never ship these)

- Guilt/shame notifications ("You've abandoned your goals").
- Fake urgency, fake scarcity, fake counters, manufactured FOMO.
- Streaks that can never be repaired; loss-aversion as the primary driver.
- Infinite feeds, autoplay, or anything that maximizes *time in app* rather
  than *value per minute*. ABH should let users leave quickly and satisfied.
- Notification spam. Default to few, high-signal, user-controlled pings.
- Hiding progress behind engagement chores.

**Measure value, not attention.** The success metric is topics learned per
week, captures connected, roadmap completion — never session length.

## 4. The 7-day and 30-day questions

Before shipping a feature, answer both:
- *Day 7*: what specifically brings them back on day 7? (Name the trigger and
  the reward.)
- *Day 30*: what do they have on day 30 that they'd lose by leaving? (Name the
  accumulated investment.)

If either answer is vague, the feature won't retain.

## Repo specifics

- The unlock cascade lives in `@abh/core` (`wouldUnlock`, `revealedTopicIds`) —
  it's already the perfect variable reward; surface it loudly in the UI.
- Progress/streak state belongs on the `Profile` record in core so every
  surface (web, extension, mobile) shows the same numbers.
- Pair with `taste` for how it looks and `cross-device-continuity` for making
  the trigger reachable everywhere.
