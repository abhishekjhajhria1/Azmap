# ABH — design brief for a full UI/UX redo

Hand this to whoever is doing the design work. It assumes no prior context.

The current UI is being replaced, not refined. Nothing below is precious except
the section marked **hard constraints** — those are correctness and platform
rules that will break the product if violated. Everything else, including the
existing visual language, is open.

---

## 1. The ask

Redesign the whole product experience: information architecture, screen
composition, visual language, motion, copy, and empty/error states. Across four
surfaces that must feel like one product:

| Surface | Stack | Priority |
|---|---|---|
| Mobile (iOS + Android) | Flutter | **1 — this is the product** |
| Web app | React + Vite, PWA | 2 |
| Browser extension | MV3 popup, 372px wide | 3 |
| Marketing site | Next.js | 4 |

Functionality is also open to challenge. If the right design requires different
features, say so — §8 lists gaps we already suspect.

---

## 2. What the product is, in one paragraph

ABH turns learning into a **map instead of a list**. You pick a subject (a
syllabus, a career path) and get a real prerequisite path through it. Everything
you learn or save becomes a node in **one graph** — not one per subject — so an
article you saved on your phone connects to a chapter in your syllabus. Topics
unlock as you clear what they depend on. A chosen guardian can see your progress
and is told when you slip. It works fully offline with no account; sync between
your own devices is optional and end-to-end encrypted.

Deeper reasoning: [`docs/WHY.md`](WHY.md). Read §1, §2 and §6 before designing.

---

## 3. Who uses it

Design for the first two. The third is a bonus.

### A. The exam student — primary, and the hardest case

17, preparing for **NEET UG** or **JEE Main/Advanced** in India. Two years of
preparation. 60–90 chapters across three subjects.

- **Device:** mid-range Android (₹15–25k), 6.5" screen, often 60Hz, patchy 4G.
  Not a flagship. Not a MacBook.
- **Context of use:** 20 minutes on a bus; two hours at a desk at 11pm; ten
  seconds checking "what do I do next" before a coaching class.
- **Emotional state:** anxious, comparing themselves to peers, exhausted.
  **This is the constraint most designs miss.** Anything that adds pressure,
  shame, or ambiguity is actively harmful here, not just annoying.
- **What they need:** to know what to study next and why; to see that effort
  moved something; to not lose the thing they read yesterday.
- **What they distrust:** percentages that don't mean anything, motivational
  language, anything that feels like a game when their future isn't one.

### B. The self-taught developer — secondary

22–30, learning frontend / backend / ML from scattered sources. Laptop-first,
phone for capture. Already uses Notion or Obsidian and is unimpressed by
another note app. Wants the *graph* — the thing nothing else does.

### C. The guardian — bonus

A parent, an older sibling, a senior. Often less technically confident than the
student. Opens the app rarely. Needs one screen that answers "is this going
okay?" without needing to be taught.

---

## 4. The jobs, in priority order

A screen that doesn't serve one of these shouldn't exist.

1. **"What should I do right now?"** — answerable in under three seconds of
   opening the app, with no decision required.
2. **"Did that matter?"** — after finishing something, see what it opened.
3. **"Save this before I lose it."** — one action, from anywhere, never blocking.
4. **"What do I actually know?"** — the map, legible at a glance.
5. **"Where am I weak?"** — currently unanswered. See §8.
6. **"Is someone watching?"** — the guardian view.

---

## 5. Hard constraints — do not violate

These are not style preferences. Each one is a correctness or accessibility
rule, and there's a line in `docs/WHY.md` §6 explaining what breaks.

**Behaviour**

- **Works fully offline, with no account.** No screen may require a network.
  No sign-up wall. No "create an account to continue".
- **Nothing the app infers is written without a tap.** Every AI or heuristic
  suggestion is a *proposal*. This is the product's oldest rule.
- **Every suggestion states its reason in plain words.** No unexplained
  recommendations. No confidence percentages shown to users — it's a ranking
  signal, not a probability.
- **Streaks are opt-in, and "count nothing" is a first-class option.** Do not
  design a streak-mandatory experience. See WHY.md §6 for why.
- **The app must always say which promise it's keeping** — "saved on this
  device" vs "synced to your other devices" are different, and the user is
  entitled to know which they have.
- **Locked content stays visible** (dimmed, unresponsive), never hidden. Seeing
  what's ahead is what makes it feel like a map instead of a gate.

**Accessibility — non-negotiable**

- **Minimum tap target 44dp/pt**, and it must not shrink in any density mode.
- **Text scales to 200%** without clipping. Design at 100% *and* 200%.
- Status must be carried by **shape, not colour alone** — must read in
  greyscale.
- Motion: transform and opacity only. `prefers-reduced-motion` /
  "Reduce Motion" must remove movement **without removing information**.
- Contrast: 4.5:1 for body text, 3:1 for large text and UI, in both themes,
  **including over translucent surfaces**.

**Platform**

- Light and dark, both first-class. Follow the system by default.
- Phone, foldable (inner and cover screens), tablet, iPad, landscape.
- Nothing may render under a foldable's hinge.
- Chrome must never trap content: the last row of a list must always be
  reachable.
- Right-to-left is not supported today but shouldn't be designed out.

---

## 6. What is open

Everything else, including:

- The entire visual language. The current one is a "survey sheet" concept
  (plotted grid + contour rings). Keep it, evolve it, or replace it.
- Navigation model. Currently four spaces + a floating dock.
- The names "Brain / Roadmap / Capture / People".
- The graph visualisation. Currently a deterministic radial layout of small
  dots. It is the product's signature object and deserves the most attention.
- Typography, colour, spacing, iconography, illustration.
- Onboarding flow.
- Copy, throughout.

---

## 7. Screen by screen

For each: the job it does, and what to design.

### Roadmap — the default screen

**Job:** answer "what now?" instantly, then let me see the path.

Currently: an eyebrow, the next topic as a large serif title, a "why this
matters" line, one pill button, then the full path as a flat list of rows with
status dots.

Design for:
- The single next action being unmissable, and startable without a decision.
- A path of 60+ chapters being *navigable* — currently it's one undifferentiated
  scroll. Units/subjects exist in the data (`RoadmapUnit`) and are unused.
- Making "this unlocks 4 things" felt, not just stated.
- Someone returning after two weeks away.

### Brain — the map

**Job:** show what I know as one structure, and let me get somewhere in it.

Currently: dots and lines on a canvas, tap to select, pinch to zoom, an
inspector card on top.

This is the screen most in need of design. Consider:
- What does a 300-node graph look like when it's *beautiful* and still legible
  on a 6.5" screen? Clustering, level-of-detail, focus+context?
- How do you show "known / available / locked" at 300 nodes without it becoming
  confetti?
- Is a force/radial graph even the right visualisation on a phone? An
  alternative that keeps the *meaning* (things unlock things) is welcome.
- Determinism is a requirement: the same map must land the same way every time,
  because the value is learning where things are.

### Capture — the inbox and the connections

**Job:** save without friction; make the pile become a brain.

Currently: one input pill, a "Connections" list of proposed links above the
inbox list.

Design for:
- Saving from inside the app being obviously secondary to the share sheet.
- A proposed connection that is genuinely delightful to accept — this is the
  moment where the product's premise pays off, and it currently looks like a
  settings row.
- 200 unfiled captures. What does that pile look like when it isn't shameful?

### People — the guardian

**Job:** "is this going okay?", for someone who barely uses the app.

Currently: mostly a placeholder that honestly states guardians aren't built yet,
plus a list of finished topics and the sync status.

Design the real thing:
- Inviting a guardian, and what they see.
- What "signing off" a piece of work looks like.
- What a "slip" notification says without being punitive.
- This needs the most **copy** work of any screen.

### Onboarding

Currently: four preference questions with live previews, then straight into the
app. There is **no explanation of what the product is** — a new user is asked
about row density before they know what a map is.

Design for: understanding the premise in under 30 seconds, without a carousel
of feature slides nobody reads.

### Search

Currently: a floating circle that expands into a pill; searches titles and
captures by prefix.

Design for: what search means in a graph. Finding a node, or navigating to it?

### Settings

Currently: a long scroll of preference groups. Functional, unloved.

### Browser extension — 372px popup

Currently: header with stats, one big "Save this page" button, available
topics, recent captures. Frosted glass over a survey field.

Design for: two seconds of attention, one action, then gone.

### Marketing site

Currently: a landing page with a live graph demo. Needs to explain the map
premise to someone who has never thought about learning as a graph.

---

## 8. Functionality gaps worth designing for

We suspect these are missing. Challenge or confirm.

- **No practice, no questions, no recall.** For a NEET/JEE student this is
  arguably *the* feature. The app currently tracks that you marked something
  known — with no evidence you do. Spaced repetition, self-testing, or past-paper
  questions would change what the product is.
- **No notes on a topic.** You cannot write anything *on* a node. The second
  brain has no body text.
- **No sense of time.** No session planning, no "you have 40 minutes", no
  history, no progress over weeks. An exam has a *date* and the app doesn't
  know it.
- **No weakness signal.** Nothing surfaces what you keep avoiding or forgetting.
- **No images or attachments.** Students photograph diagrams and handwritten
  notes constantly.
- **The celebration is the only reward moment**, and it's text-only.
- **Guardian is unbuilt**, as above.

---

## 9. What exists today (reuse or discard)

**Design tokens** — `packages/ui/theme.css` (481 lines) is the source of truth,
transliterated into `apps/mobile/lib/design/tokens.dart`. Light and dark
palettes, radii, elevation, type scale. If you change tokens, change both.

**Current visual language** (all replaceable):
- "Survey sheet" background: plotted grid, heavier rules every 5th line, contour
  rings, faint colour wash. CSS gradients on web, `CustomPainter` on mobile.
- Frosted glass chrome floating inset 16dp, never touching edges.
- Near-monochrome, one accent (default iOS blue, six user-selectable options).
  Green = success, violet = AI, semantically fixed.
- Fraunces (display serif) + Inter (UI). **Not yet vendored on mobile** — it
  currently renders in the platform sans, which is likely a large part of why
  it looks unfinished.
- Icons hand-drawn as vector paths — no icon library on mobile.
- No illustration anywhere.

**Content available to design with:** 10 roadmaps / 305 topics, each with a
title, a one-line "why it matters", a domain tag, and optional unit + weight
(1–5, exam importance). Two long-form exam strategy guides.

---

## 10. Technical realities to design within

- **Flutter, not Material.** Built on `WidgetsApp`, so there is no Material
  theme to inherit. Every component is custom — which means no free ride, but
  also no fighting a design system.
- **60Hz mid-range Android is the target.** Blur is the most expensive effect
  on both platforms; heavy use will drop frames on the device this is *for*.
- **The graph renders on one canvas**, not a widget per node.
- **Everything is local-first.** Data is instant; there are almost no loading
  states, and designs that assume spinners will look wrong.
- **Fonts add to bundle size** on a data-constrained device.

---

## 11. Deliverables

1. **Direction** — 2–3 distinct concepts as one key screen each, enough to
   choose between. Not variations on a theme.
2. **Flows** — Roadmap, Brain, Capture, People, onboarding, at phone width,
   light and dark.
3. **The graph** — the most exploration. Show it at 20 nodes and at 300.
4. **Responsive** — the same screens at tablet, and one foldable case.
5. **Accessibility proof** — one key screen at 200% text; contrast checks.
6. **Motion** — specify the 3–5 transitions that matter. Especially the unlock
   moment.
7. **Component inventory** — buttons, rows, sheets, inputs, empty states, with
   states (default / pressed / disabled / loading).
8. **Copy** — screen copy is part of this, not a later pass. Especially empty
   states and the guardian.

---

## 12. How it will be judged

1. **Can a 17-year-old answer "what now?" in three seconds, on a bus?**
2. **Does the map look like something worth keeping for two years?**
3. **Is it recognisable from a thumbnail?** Not generic-premium-app.
4. **Does it work at 200% text and in greyscale?**
5. **Does it feel calm?** The user is already anxious. The app should not add
   to it — no urgency, no shame, no manufactured pressure.
6. **Does it look designed rather than assembled?** Press feedback, real empty
   states, motion that means something.

---

## 13. Things that will make it worse

Stated because they're the defaults a brief like this usually gets back:

- Gradient orbs and purple bokeh. The single most recognisable tell of a
  generated interface, and they say nothing about this product.
- Motivational copy. "You've got this!" to an exam student is condescending.
- Leaderboards or peer comparison. This user compares themselves too much
  already.
- Mascots.
- A dashboard of stats that measure activity rather than understanding.
- Anything that punishes absence.
