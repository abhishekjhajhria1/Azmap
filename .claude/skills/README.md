# ABH Skills

Skills are packaged instructions Claude Code loads automatically when a task
matches their description. They're how we keep quality high without re-explaining
our standards every session.

## Written for this project

| Skill | Load it when |
| --- | --- |
| `taste` | **Before any UI change.** Cheap-tells checklist + type/colour/space/depth/motion/icon/state rules, tuned to our tokens + glass. |
| `frontend-design` | Building a high-impact surface (marketing, hero, onboarding) that needs a distinctive, committed direction. |
| `design-review` | Pre-ship visual QA — screenshot light+dark, phone+desktop, grade, report worst-first. |
| `habit-design` | Streaks, progress, rewards, notifications, retention — making ABH indispensable *through real value*, never dark patterns. |
| `activation` | Onboarding, empty states, first-run — shortest path to the aha moment (target: < 60s). |
| `cross-device-continuity` | Extension / mobile / desktop / web, sync, offline, deep links, share targets — one brain, every device. |

## Vendored (third-party, MIT)

Curated subsets — not the full upstream catalogues, which are far larger and
mostly irrelevant here.

**From [mattpocock/skills](https://github.com/mattpocock/skills)** — MIT,
Copyright (c) 2026 Matt Pocock:
`tdd`, `spec-code-review` (upstream `code-review`, renamed to avoid colliding
with the built-in), `codebase-design`, `diagnosing-bugs`, `domain-modeling`,
`research`, `prototype`, `resolving-merge-conflicts`, `grilling`, `grill-me`,
`handoff`, `writing-for-agents`.

*Skipped:* his issue-tracker workflow skills (`triage`, `to-tickets`, `wayfinder`,
`implement`, `to-spec`, `setup-matt-pocock-skills`, `ask-matt`) — they assume a
tracker setup we don't run.

**From [alirezarezvani/claude-skills](https://github.com/alirezarezvani/claude-skills)**
— MIT, Copyright (c) 2025 Alireza Rezvani:
`apple-hig-expert` (Apple HIG + Liquid Glass audits — directly useful for our
iOS/macOS surfaces), plus product-domain productivity skills that inform how we
build ABH's own features: `capture`, `deep-work`, `weekly-review`, `reflect`.

*Skipped:* the other ~350 skills (regulatory, C-level advisory, clinical
research, marketing pods, etc.) — out of scope, and vendoring them would drown
the useful ones in noise.

Both upstream projects are MIT licensed; their copyright notices are reproduced
above. Full licence text: https://opensource.org/licenses/MIT

## Adding a skill

Create `.claude/skills/<name>/SKILL.md` with YAML frontmatter (`name`,
`description`). The description is what triggers auto-loading — make it concrete
about *when* to use it. Use the `writing-for-agents` skill when authoring.
