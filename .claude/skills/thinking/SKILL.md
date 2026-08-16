---
name: thinking
description: >-
  Load when the work is reasoning rather than typing — stress-testing a plan or
  decision ("grill me", "poke holes in this", "am I missing something"),
  researching a question against real sources before committing, stepping back
  mid-task ("reflect", "zoom out", "are we on track", "are we overthinking
  this"), compacting a long session into a handoff, or writing documents meant
  for agents (skills, CLAUDE.md/AGENTS.md).
---

# Thinking — how we work a problem before we build it

Four modes: **Grill**, **Research**, **Reflect**, **Hand off**. Plus the house
style for agent-facing writing.

## §1 Grill — stress-test the plan

Interview the human relentlessly until every branch of the design is resolved.
The goal is to surface the decisions they haven't made yet, not to show off
objections.

- Ask **one sharp question at a time**; follow the answer.
- Hunt for: unstated assumptions, the case that breaks it, what happens at 100×,
  who else is affected, what we'd have to undo later, and what evidence would
  change their mind.
- Name trade-offs explicitly and make them choose — don't let "both" pass.
- Stop when the remaining unknowns are genuinely unknowable, not when you run
  out of questions.
- Prefer a concrete counter-example over an abstract worry.

## §2 Research — investigate against primary sources

When a fact matters, go and get it rather than recalling it.

- Prefer **primary sources**: official docs, specs, the actual source code,
  release notes. Treat blog posts and AI summaries as leads, not evidence.
- Read enough to answer the *specific* question; capture findings as Markdown
  with **citations/links** so the next person can verify.
- Say plainly what you could not establish. An honest gap beats a confident
  guess.

## §3 Reflect — zoom out mid-task

Trigger it when you've gone deep on implementation without a strategic check-in,
when you're stuck, or when asked. Break out of detail-mode and reassess:

1. **Direction** — is this still solving the actual problem?
2. **Assumptions** — what are we treating as true that we never verified?
3. **Bias** — are we defending an earlier choice (sunk cost) instead of the goal?
4. **Simpler path** — is there a materially smaller way to get the same outcome?
5. **Evidence** — what would tell us we're wrong, and have we looked?

Report the honest read, including "we're on track" when that's true. If
something is going wrong, say so early rather than after more work piles on.

## §4 Hand off — compact the session

Produce a document that lets someone (or a fresh agent) continue without
re-reading the transcript: the goal, what's **done** and verified, what's **in
flight** and exactly where it stands, **decisions made and why**, known traps,
and the concrete next step. Link the files that matter. Ruthlessly drop
narration; keep facts and state.

## §5 Writing for agents

Documents that agents read (skills, `CLAUDE.md`, `AGENTS.md`, specs):

- **Imperative and specific.** "Use X for Y" beats "we generally prefer X".
- **Trigger-rich descriptions** — a skill's `description` decides whether it
  ever loads; enumerate the situations and phrasings that should invoke it.
- **Short, scannable, hierarchical.** Tables and lists over prose paragraphs.
- **Rules with reasons** — a rule whose rationale is stated survives edge cases.
- State the **anti-patterns** explicitly; "don't do X" is as load-bearing as
  "do Y".
- No marketing voice, no hedging, no filler.

## Provenance

Merged from `grilling`, `grill-me`, `research`, `handoff` and
`writing-for-agents` (MIT, © 2026 Matt Pocock) and `reflect` (MIT, © 2025
Alireza Rezvani). Source material preserved under `reference/`.
