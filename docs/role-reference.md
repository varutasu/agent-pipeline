# Role reference

One-page summary of the 9 L2 subagent roles and the pipeline that connects them. Full role specs live in `skills/bootstrap-agent-context/templates/L2-roles/role-*.md` (and after install, in your repo at `.cursor/agents/role-*.md`).

## Pipeline at a glance

```
                                   ┌─────────────────┐
   Idea + success metric ─────────►│ role-conductor  │  classify, set skip flags, write convoy
                                   └────────┬────────┘
                                            │
                  ┌─────────────────────────┴─────────────────────────┐
                  ▼                                                   ▼
        ┌─────────────────┐                                 ┌───────────────────┐
        │ role-ia-architect│  routes, screens, content     │ (skip if non-UI)  │
        └────────┬────────┘                                 └─────────┬─────────┘
                 ▼                                                    │
        ┌─────────────────┐                                           │
        │ role-ux-reviewer│  reuse primitives, a11y constraints       │
        └────────┬────────┘                                           │
                 └──────────────────────────┬────────────────────────┘
                                            ▼
                                   ┌─────────────────┐
                                   │ role-architect  │  file plan, schema diff, decompose to N briefs
                                   └────────┬────────┘
                                            ▼
                                  ★ HUMAN GATE 1: plan approval ★
                                            ▼
                  ┌─────────────────────────┴─────────────────────────┐
                  ▼                         ▼                         ▼
        ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
        │ role-implementer│  ...  │ role-implementer│  ...  │ role-implementer│
        │   (one brief)   │       │   (one brief)   │       │   (one brief)   │
        └────────┬────────┘       └────────┬────────┘       └────────┬────────┘
                 │                         │                         │
                 └─────────────────────────┴─────────────────────────┘
                                            │
                                            ▼  PR draft (NOT auto-opened)
                  AUDIT FAN-OUT (Cursor 3.2 /multitask cohort):
                  ┌─────────────────────┬──────────────────────────┬──────────────────┐
                  ▼                     ▼                          ▼                  ▼
        ┌─────────────────┐  ┌──────────────────────────┐  ┌─────────────────┐  (skip per
        │  role-reviewer  │  │role-design-system-auditor│  │role-a11y-auditor│   skip flags)
        │  scope + conv   │  │  tokens, primitives      │  │  labels, focus  │
        └────────┬────────┘  └────────────┬─────────────┘  └────────┬────────┘
                 │                        │                         │
                 └────────────────────────┴─────────────────────────┘
                                            ▼  three independent comments → PR Health rollup
                                  ★ HUMAN GATE 2: PR merge ★
                                            ▼
                                   ┌─────────────────┐
                                   │ role-doc-writer │  changelog, AGENTS.md, schema map regen
                                   └────────┬────────┘
                                            ▼
                                  ★ HUMAN GATE 3: prod promote ★
```

## The 9 roles

The `multitask` column declares each role's parallelism mode for Cursor 3.2+. See [`multitask-playbook.md`](multitask-playbook.md).

| Role | One-line job | Output | Tools | Multitask |
| --- | --- | --- | --- | --- |
| **conductor** | Classify the work; write the convoy file; set skip flags; recommend dispatch points | `.convoys/<slug>.md` | Read, Grep, Glob, Write, Shell | `single` |
| **ia-architect** | Map idea to existing IA — sitemap, user flow, screens | Append `## IA` section to convoy | Read, Grep, Glob, Shell | `single` |
| **ux-reviewer** | Reuse existing components; list a11y constraints | Append `## UX` section to convoy | Read, Grep, Glob, Shell | `single` |
| **architect** | File plan, schema diff, API surface; decompose into N briefs with `slice_dependencies:` | Append `## Architecture` + N `brief-N-*.md` files | Read, Grep, Glob, Shell | `single` |
| **implementer** | Build one brief; stay strictly in scope; draft PR | Code changes + PR draft (not opened) | Read, Grep, Glob, Edit, Write, Shell | `per-brief` (with disjoint-files + worktree guardrails) |
| **reviewer** | Self-review the diff vs the brief; structured PR comment | Markdown comment ready to paste | Read, Grep, Glob, Shell | `audit-fanout` |
| **design-system-auditor** | Token violations, duplicate primitives, inline styles | Markdown comment | Read, Grep, Glob, Shell | `audit-fanout` |
| **a11y-auditor** | Labels, keyboard, focus, contrast, semantic HTML | Markdown comment | Read, Grep, Glob, Shell | `audit-fanout` |
| **doc-writer** | Changelog, AGENTS.md updates, schema map regen | Docs PR | Read, Grep, Glob, Edit, Write, Shell | `single` |

## Skip flags (set by Conductor)

The Conductor's classification drives default skips:

| Classification | Default skips |
| --- | --- |
| `feature` | (none — full pipeline) |
| `hotfix` | `ia, ux, arch, review` |
| `docs-only` | `ia, ux, arch, test, visual, a11y, design, smoke, qa, flag` |
| `infra-only` | `ia, ux, arch, visual, a11y, design, smoke, qa, flag` |
| `server-only` | `ia, ux, visual, a11y, design` |
| `config-only` | `ia, ux, arch, test, visual, a11y, design, smoke, qa, docs, flag` |

**Never skipped (mandatory human gates):** `plan-approval`, `pr-merge`, `prod-promote`.

## Hand-off rules

- **No auto-spawning.** Every role hands off by message to the user. The user invokes the next role manually (paste the role name into the chat or `/multitask` for parallel-safe cohorts).
- **No PR opening by agents.** Implementer produces a PR draft; you open it via `gh` or Cursor's UI.
- **No commits by Doc Writer.** Doc Writer drafts a docs PR; you open it.
- **Human gates always apply.** `/multitask` is allowed for audit fan-out and implementer fleets, but never to skip gates 1 (plan approval), 2 (PR merge), or 3 (prod promote).

## Anti-patterns shared across roles

- Widening scope outside the brief's `files:` list — escalate to Architect, don't just edit.
- Marking findings as Critical when they're really Suggestions — credibility comes from sparing red.
- Adding a new component when an existing primitive fits — reuse first.
- Generic guidance ("follow a11y best practices") — every finding needs a file:line and a specific fix.

## When to use which role manually

| You want to... | Run this role |
| --- | --- |
| Start a new feature with no plan yet | conductor |
| Vet a feature spec for IA gaps before writing code | ia-architect |
| Audit a draft UI design before implementation | ux-reviewer |
| Decompose a large feature into PR-sized briefs | architect |
| Implement one brief at a time | implementer |
| Self-review your own PR before requesting human review | reviewer |
| Audit a UI PR for design-system violations | design-system-auditor |
| Audit a UI PR for accessibility | a11y-auditor |
| Update changelog + docs after a feature merges | doc-writer |
