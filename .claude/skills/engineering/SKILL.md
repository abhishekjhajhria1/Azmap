---
name: engineering
description: >-
  Load when writing, structuring, testing, reviewing or fixing code — building a
  feature test-first, red-green-refactor, designing a module or deciding where a
  seam goes, naming/domain terminology or CONTEXT.md/ADRs, diagnosing a bug or
  performance regression ("debug this", "it's broken/throwing/slow"), reviewing
  a branch or PR against its spec, throwing together a prototype to answer a
  design question, or resolving a git merge conflict.
---

# Engineering — how ABH gets built

Five modes: **TDD**, **Design**, **Diagnose**, **Review**, **Prototype**.

## §1 TDD — red, green, refactor

Write the failing test first; make it pass with the simplest thing; then
refactor with the test as a harness. Prefer integration tests that exercise real
behaviour over mock-heavy unit tests — mock only what you don't own or can't
run. A bug fix starts with a test that reproduces it.

In this repo the domain lives in `@abh/core` and is pure, so it is cheap to test
exhaustively (44 tests today). Keep it that way: **no I/O in the domain**.

## §2 Design — deep modules, small interfaces

Prefer **deep modules**: a small, obvious interface hiding substantial
implementation. A module whose interface is as complex as its implementation is
pulling its weight backwards.

- Put seams where the *concept* changes, not where the file got long.
- Push complexity down into the module rather than out onto every caller.
- Rules about the domain belong in the domain, once — never re-implemented per
  surface (see the `product` skill's continuity rule).
- Make illegal states unrepresentable; validate at the boundary (Zod here).
- **Domain modelling**: keep terminology sharp and shared. When a name is
  ambiguous the design is ambiguous. Record decisions that constrain the future
  as ADRs, and keep project vocabulary current in CONTEXT.md/CLAUDE.md.

## §3 Diagnose — a loop, not a guess

1. **Reproduce** it reliably, ideally as a failing test.
2. **Minimise** — shrink to the smallest case that still fails.
3. **Observe** — get real evidence (logs, traces, bisect). Don't theorise from
   the armchair; instrument until the mechanism is visible.
4. **Explain** the mechanism before fixing. If you can't explain *why*, you
   haven't found it — a fix that "seems to work" usually moved the symptom.
5. **Fix, then regress-test** so it cannot come back.

Performance work is the same loop with measurements: profile before and after,
and be suspicious of anything applied globally (a transition on `*`, an O(n²)
layout, a blur on every surface).

## §4 Review — two axes

Review a diff against a fixed point on **Standards** (does it match this repo's
conventions and quality bar?) and **Spec** (does it do what the issue/spec
asked?). Report findings worst-first with a concrete fix each. Verify claims
against the code rather than assuming; don't approve on vibes.

## §5 Prototype — answer the question, then throw it away

When a design question is cheaper to *see* than to argue, build the smallest
throwaway that answers it (a state-model spike, a couple of UI variations).
Label it as disposable and don't let it become the implementation.

## Merge conflicts

Resolve by **intent**, never by blindly taking one side, and never abort to
escape. Understand what each side was trying to do; regenerate lockfiles and
generated files instead of hand-merging them; run the tests after.

## Repo specifics

pnpm workspaces · TS strict · Zod at boundaries · Vitest (`pnpm --filter
@abh/core test`) · Playwright/headless Chromium for UI verification ·
`pnpm -r build` before claiming done. Commit per logical phase.

## Provenance

Merged from `tdd`, `spec-code-review`, `codebase-design`, `diagnosing-bugs`,
`domain-modeling`, `resolving-merge-conflicts` and `prototype`
(MIT, © 2026 Matt Pocock). Source material preserved under `reference/`.
