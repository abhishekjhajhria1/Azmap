# Why ABH exists, how it's built, and what it owes the person using it

This is the document to read before changing anything. `ARCHITECTURE.md` says
how the code is arranged; this says *why it is arranged that way*, and what it
would mean to get it wrong.

---

## 1. The problem, stated precisely

Almost everyone is learning something. Almost nobody can tell you what they
know.

That is not a motivation problem, and it is not solved by more content. It is
four specific failures, and every existing tool commits at least three:

**Learning is stored as a list.** A syllabus is 60 chapters in a row. A course
is a playlist. Both are lies about the shape of knowledge — you cannot
understand rotational motion before you understand a moment of inertia, and no
list encodes that. It is a *graph*. Rendering it as a list throws away the
single most useful thing about it: what opens up next, and why you are stuck.

**Capture and understanding are separate apps.** You save forty articles.
They sit in a pile. The pile grows, is never read, and quietly becomes a source
of guilt rather than a resource. Nothing connects what you saved to what you
are trying to learn, because the note app has no idea a syllabus exists.

**Progress is invisible, so it stops feeling real.** You did four hours of
chemistry. What changed? A course platform says "62% complete", which measures
video minutes and not one thing about you. Nothing shows you the thing that
actually happened: that finishing this opened three doors.

**Nobody is watching, and for most people that matters.** Self-directed
learning has a completion rate that rounds to nothing. The students who
finish overwhelmingly have somebody — a parent, a senior, a friend — who
notices. Every app pretends this is a willpower problem and sells streaks.

### Who this is for, first

**Indian exam students.** NEET UG and JEE Main/Advanced, specifically. Not as a
market-sizing exercise but because they are the hardest case, and the hardest
case is where the design gets honest:

- The syllabus is fixed, enormous, and genuinely a prerequisite graph.
- The stakes are real, so *false confidence is harmful* — an app that says
  "62% complete" to someone who has not understood a single thing is worse than
  no app.
- They are on a mid-range Android phone with patchy data, not a MacBook.
- Someone else is already invested in their outcome. The guardian is not a
  growth feature; it is already how their life works.

Everything else — the developer roadmaps, the second brain, the graph — falls
out of solving that well. A tool that survives a JEE syllabus will survive
anything.

---

## 2. Three pillars, and why exactly three

**The Roadmap.** A real path through a subject, in the order the subject
actually has. Not a playlist. Every step says what it is for and what
finishing it opens.

**The Map.** Everything you know, as one graph. Not one graph per subject —
*one*. A note about kinematics saved from your phone connects to a JEE syllabus
node, because both are nodes in the same structure. This is the part nothing
else does, and it is the reason the product can exist.

**The People.** A guardian who shapes the plan, signs off finished work, and is
told when you slip. Chosen by you, with permissions you set.

Three, not five, because each one fails without the others. A roadmap with no
map is a checklist app. A map with no roadmap is a mind-mapping tool nobody
opens twice. Both without people is a thing you use for eleven days.

---

## 3. How it is built, and the convictions underneath

### Local-first, actually

Everything works with no account and no network. Not "works offline" in the
sense of a cache that eventually needs a server — the database on the device
*is* the product, and sync is optional on top.

This is a product decision before a technical one. The user is a student on a
mid-range phone on a train. If the app needs a connection to show them their
own syllabus, it is broken exactly when they wanted it.

### The server cannot read your map

The relay (`apps/server`) is an append-only log of sealed blobs. It has no key.
It does not know what a topic is, cannot merge anything, and cannot resolve a
conflict for you. Every piece of intelligence lives on the devices.

That is enforced by shape, not by policy: the account key travels in the
*fragment* of a pairing URL, which browsers never transmit. There is nothing on
the server to subpoena, breach, or monetise.

The honest consequence, stated in the app itself: **there is no password reset
and there cannot be one.** Adding a device requires a device you already have.

### The engine exists once, or is proven identical

The unlock rules and the sync merge order are the two things that must never
disagree between surfaces. Both fail *silently* when wrong:

- Get the merge wrong and two devices converge on **different** states and both
  report success. You just quietly lose an edit.
- Get soft edges wrong and a topic is locked on the phone and open on the
  laptop, and the learner concludes the app is broken.

Neither produces a stack trace. So the web, extension and website share
`@abh/core` directly, and the Flutter app — which cannot import TypeScript —
runs a conformance corpus generated by *running* the reference implementation.
Two implementations that pass the same corpus agree on everything it covers.
Both sides also assert the comparator is **antisymmetric**: one that is correct
on every recorded pair but not antisymmetric still loses data, because the two
peers pick opposite sides.

### Cheap to run

One small stateful process, one SQLite file, one volume. No managed database,
no queue, no analytics pipeline. This is a product for students; a cost
structure that requires venture funding to keep the lights on would eventually
require a business model that hurts them.

### Content has one home

Roadmaps and guides live in `packages/core/src/roadmaps/defs/` and are
*exported* to other surfaces, never hand-copied. Hand-translating 305 topic
seeds into Dart would guarantee the phone and the web disagree about a syllabus
within a month — and nobody would notice until a student revised the wrong
chapter.

---

## 4. What is actually built

Honest status. "Built" means it works, not that it is finished.

| | |
|---|---|
| **Web app** (`apps/app`) | Built. Local-first PWA, four spaces, WebGL graph, sync, pairing. |
| **Browser extension** (`apps/extension`) | Built. Capture what you're reading; syncs through the relay. |
| **Website** (`apps/website`) | Built. Landing page with a live graph. |
| **Relay** (`apps/server`) | Built. 27 tests. Dockerfile + fly.toml, one machine, one volume. |
| **Mobile** (`apps/mobile`) | Written, **never compiled** — no Flutter SDK was available. Android and iOS project folders are hand-written. |
| **Roadmaps** | 10 roadmaps, 305 nodes: 8 developer paths, NEET UG, JEE. |
| **Guides** | NEET and JEE strategy guides, with prominent caveats about syllabus revisions. |
| **The Mind** (AI seam) | Interface defined; `connect`, `distil` and `next` work with **no model at all**. `compose` and `explain` are deliberately absent until a real provider is attached. |
| **Guardian** | Preview only. Needs account-to-account sharing the relay does not do yet. Says so on screen. |

### The AI, and why most of it needs no AI

Three of the five capabilities turned out not to need a model:

- **connect** — finds the notes that belong to something on your map, and the
  topics floating unattached. Term overlap weighted by how unusual a word is in
  *your own* corpus, so "physics" is worthless to a JEE student and
  "hydrolysis" is gold, and nobody maintains a dictionary.
- **distil** — decides whether a saved page is about something you already have
  or something new. Getting this right is what stops a second brain filling up
  with four nodes for one idea.
- **next** — ranks what is open by leverage, focus and interest.

They run offline, cost a millisecond, and explain themselves in your own words:
*"shares 'gradient' and 'descent' with Gradient descent."* A model that is
attached later has to beat that, not replace it.

`compose` and `explain` are genuinely absent rather than stubbed, because
inventing an ordered curriculum from heuristics means telling someone to study
the wrong things in the wrong order **with the app's confidence behind it**.

---

## 5. How it should look, and why

### The concept: a survey of what you know

ABH is cartography. You are mapping territory you already partly occupy. So the
visual language is a **survey sheet**: a fine plotted grid with heavier rules
every fifth line, contour rings where the land rises, one faint wash of colour.

It is *drawn*, not glowed. That is the whole point. Gradient orbs and purple
bokeh are the single most recognisable tell of a generated interface — every AI
landing page has them, and they say nothing about the product. A survey sheet
says something true: this is a map, and it is yours.

### The material rules

- **Depth from light, never from outlines.** A card is a surface because it
  catches light, not because it has a border.
- **Chrome floats, content is a document.** Navigation, search and sheets are
  translucent material inset from the edges; they never touch a screen edge, and
  content always scrolls clear of them.
- **Glass is rationed.** The dock, one overlay, at most. Everything wearing
  glass is the same as nothing wearing it, because depth only reads as depth
  when some things are flat.
- **One accent, spent once per screen.** Blue marks the single most important
  action. Green means success and violet means AI — those are *meanings*, not
  decoration, and they never move when someone picks a different accent.
- **Two families, one job each.** A display serif carries the voice; Inter does
  the work.
- **Nothing sharp-cornered.** Pill 999, large 26, medium 18, small 12.

### Motion

150–250ms, transform and opacity only. Press is a 0.975 scale — barely visible,
registering as the surface yielding rather than an animation playing. One
signature moment: the unlock cascade, staged so each newly-opened topic arrives
70ms behind the last. All at once reads as a dialog; in sequence it reads as
doors opening, which is what actually happened.

---

## 6. The UX decisions, and the reasoning behind each

This is the section that matters most. Anyone can copy a visual style. These
are the decisions that make the app *behave* well, and most of them are
invisible when they are right.

### Streaks are a choice, and "nothing" is a real option

Streaks are the most effective retention mechanic in consumer software. They
are also actively harmful to a real fraction of people: miss a day, watch a
number you cared about reset, quit the app rather than face it.

Both effects are real. Neither group is the wrong kind of user. So progress is
a preference — **streak, percentage, or count nothing** — the onboarding copy
says why in plain words, and "count nothing" is a first-class option rather
than a buried opt-out.

An app that decides this for you is optimising its retention graph, not your
learning.

### Density never shrinks a tap target

Rows compress. Type compresses. Hit areas do not. `Metrics.tapTarget` is a
constant, deliberately not derived from the density preference.

A compact mode that misses is not compact, it is broken — and the person who
chose it will blame themselves.

### Motion is one-way

The OS "reduce motion" setting can turn animation off. The in-app preference
can only *also* turn it off, never back on. Somebody who asked their phone for
less motion usually did so for a vestibular or medical reason, and an app
preference does not get to override that upward.

Reduced motion also means **no movement, never no information** — the
celebration jumps straight to its end state rather than being skipped.

### Onboarding shows, it does not ask you to predict

Every question in first-run changes a **live preview** built from the real
widgets under the real theme.

"Do you prefer compact rows?" is unanswerable on day zero — compared to what?
So you look at compact rows and decide. Nothing can drift out of sync with the
app, because the preview *is* the app.

Four questions, not nine, because setup abandonment is the most expensive thing
that can happen on a first run. "Set this up later" is always visible and never
styled to be avoided.

### No personality quiz

"Are you a Visual Learner or an Analytical Learner" produces a label that
predicts nothing, from a theory that does not replicate. Every preference asks
about something observable instead: how dense, how much explanation, what to
count, what to open first.

### Suggestions explain themselves in your words

Every proposed connection states its reason: *"Your note shares 'gradient' and
'descent' with Gradient descent."* An unexplained suggestion is one you have to
audit yourself, which costs more than it saves.

**No confidence score on screen.** It is a ranking signal, not a probability,
and showing "72%" invites trust in a number that does not mean what it appears
to mean.

### Proposals are never silent writes

Nothing the app infers becomes part of your map without a tap. A `topic-topic`
link accepted from a suggestion creates a **soft** edge, not a hard one —
because that is a resemblance the app noticed, not a prerequisite you asserted,
and a wrong hard edge would lock a topic you could have started today.

### Dismissals are not permanent

Waving away a suggestion lasts the session and is not synced. "Not that one,
not now" is what a shrug means. A link that is wrong at four notes may be right
at forty, and persisting it would let a shrug on your phone permanently silence
a suggestion on your laptop.

### Thresholds protect attention, not accuracy

The connection threshold is set to under-propose. A panel that offers forty
weak links trains people to dismiss it unread — and after that it can never
tell them anything again. Under-proposing is recoverable; being ignored is not.

### The app says which promise it is currently keeping

"Saved on this device" and "synced to your other devices" are different
promises. The People screen says which one you have, and how many changes are
queued. Somebody who just typed a page of notes on a train is entitled to know.

### Honest gaps beat fake features

The Guardian screen says plainly that inviting one needs account-to-account
sharing that does not exist yet, and shows what a guardian *would* see. A
preview that pretends to work is worse than an honest gap: the first person who
taps "invite" and gets nothing stops trusting the rest of the app too.

### Locked things stay visible

A locked topic recedes rather than disappearing, and is simply unresponsive
rather than showing an error after you tap. You should be able to see what is
ahead of you on the path — that is what makes the ordering feel like a map
instead of a gate.

### Status is carried by shape, not only colour

A known topic is a filled circle with a tick; available is a ring; locked is
hollow. Colour reinforces, never carries. It reads correctly in greyscale.

### The graph layout is deterministic, not a force simulation

Force layouts are not stable — the same map lands differently every time, so a
topic is in one place today and elsewhere tomorrow. The entire value of a map
is learning where things *are*. Depth-ordered rings also happen to match what
the graph means: prerequisites toward the centre, what they unlock radiating
out.

### Every surface is adaptive by measurement, not by guess

- Body text is capped near 68 characters. Past ~90 the eye loses its place
  returning to the next line, and an uncapped list on a 1024pt tablet runs to
  ~150.
- Fixed heights grow with the system text size. Every `height: 52` button clips
  its own label at 200% text — the third notch in iOS Accessibility, not an
  exotic setting — and clipping is silent in release builds.
- A foldable's hinge never has a control or a column of text on it. On a
  vertical hinge the two panes sit either side and the gap *is* the seam.
- On narrow screens the secondary pane is **dropped, not stacked**. Stacking
  buries it under a screen of scrolling, which is worse than absent because it
  still costs a scroll to get past.

### Capture is where people actually are

Nobody opens a notes app to save an article. They are already reading it and
they hit Share. So the browser extension and the phone share sheet are the
primary capture paths; the in-app text field is the fallback.

---

## 7. What is not done

Stated plainly, because a document that only lists wins is marketing:

- **The mobile app has never been compiled.** It was written without a Flutter
  SDK. The Dart is structurally checked but the first `flutter analyze` will
  find things.
- **The iOS app icon is missing** — one 1024×1024 PNG that no text-only
  toolchain can author.
- **Fonts are declared but not vendored.** Until Inter and Fraunces are dropped
  in, mobile renders in the platform sans and loses the serif voice entirely.
- **Guardian is a preview.** It needs cross-account sharing.
- **AI `compose` and `explain` have no provider.** The seam is ready.
- **No widgets, no notifications.**
- **The exam syllabi need verification** against the current official documents
  by somebody who knows them. The guides say so prominently, which is the
  minimum, but it is not a substitute.

---

## 8. The test to apply to any future change

Before adding anything, three questions:

1. **Does it work offline, with no account?** If not, it is not part of the
   core product.
2. **Would two reasonable people want opposite things from it?** If yes, it is
   a preference, not a default. If no, and it is currently a preference, the
   default is wrong.
3. **When it is wrong, does the user find out?** Silent failure is the only
   category of bug this codebase treats as urgent. Everything else is a bug
   report; that one is a betrayal.
