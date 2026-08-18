# ABH Skills

Skills are packaged instructions Claude Code loads automatically when a task
matches their description. They keep quality high without re-explaining our
standards every session.

Four skills, split by discipline. Each merges several earlier skills; the full
source material of every one is preserved under that skill's `reference/`
directory, so nothing was lost in the consolidation.

| Skill | Load it when | Modes |
| --- | --- | --- |
| **design** | Any UI change — components, colour, type, spacing, icons, motion, empty states, layout, Apple surfaces. Also "looks cheap/dated", design reviews. | Taste · Direction · Review · Apple HIG |
| **product** | Onboarding, first-run, streaks, progress, retention, notifications, and anything spanning extension / mobile / desktop / web, sync, offline, deep links. | Activation · Habit · Continuity |
| **engineering** | Writing, structuring, testing, reviewing or fixing code; module design; domain naming; debugging; merge conflicts. | TDD · Design · Diagnose · Review · Prototype |
| **thinking** | Reasoning before building — stress-testing a plan, researching against sources, stepping back, handing off, writing agent-facing docs. | Grill · Research · Reflect · Hand off |

## What each absorbed

- **design** ← `taste`, `frontend-design`, `design-review`, `apple-hig-expert`
- **product** ← `habit-design`, `activation`, `cross-device-continuity`,
  `capture`, `deep-work`, `weekly-review`
- **engineering** ← `tdd`, `spec-code-review` (upstream `code-review`, renamed
  to avoid colliding with the built-in), `codebase-design`, `diagnosing-bugs`,
  `domain-modeling`, `resolving-merge-conflicts`, `prototype`
- **thinking** ← `grilling`, `grill-me`, `research`, `handoff`,
  `writing-for-agents`, `reflect`

## Third-party licences

Vendored material is MIT and remains under `*/reference/`:

- [mattpocock/skills](https://github.com/mattpocock/skills) — MIT, Copyright
  (c) 2026 Matt Pocock. (`tdd`, `code-review`, `codebase-design`,
  `diagnosing-bugs`, `domain-modeling`, `resolving-merge-conflicts`,
  `prototype`, `grilling`, `grill-me`, `handoff`, `writing-for-agents`)
- [alirezarezvani/claude-skills](https://github.com/alirezarezvani/claude-skills)
  — MIT, Copyright (c) 2025 Alireza Rezvani. (`apple-hig-expert`, `capture`,
  `deep-work`, `weekly-review`, `reflect`)

Full licence text: https://opensource.org/licenses/MIT

Only a curated subset of each upstream catalogue was taken — the rest
(issue-tracker workflows, regulatory/C-level/clinical packs) was out of scope
and would have drowned the useful material in noise.

## Adding a skill

Create `.claude/skills/<name>/SKILL.md` with YAML frontmatter (`name`,
`description`). The description is what triggers auto-loading — make it concrete
about *when* to use it, and enumerate the phrasings that should invoke it. The
`thinking` skill's §5 covers the house style for agent-facing writing.
