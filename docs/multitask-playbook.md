# Multitask playbook

Cursor 3.2 introduced `/multitask`, native worktrees in the Agents Window, and multi-root workspaces ([changelog](https://cursor.com/changelog/04-24-26)). This playbook is the source of truth for **when each L2 role can run in parallel**, **what guardrails apply**, and **how to think about the audit phase as a fan-out**.

Every L2 role file declares its parallelism in frontmatter (`multitask: single | audit-fanout | per-brief`). This doc explains what those values mean and when to use them.

## The three modes

| Mode | What it means | Roles |
| --- | --- | --- |
| `single` | One instance at a time. Must run after the previous role. | conductor, ia-architect, ui-designer, ux-reviewer, architect, doc-writer |
| `audit-fanout` | Read-only audit on a fixed input (the diff). Multiple roles in this mode read the same input and emit independent outputs. Safe to run as a parallel cohort. | reviewer, security-auditor, design-system-auditor, a11y-auditor |
| `per-brief` | Multiple instances on different briefs at the same time. Requires worktree isolation and disjoint `files:` lists. | implementer |

If a role isn't marked, treat it as `single`.

## Pattern A — Audit fan-out (recommended default)

After `role-implementer` produces a PR draft, the four audit roles all consume the same diff and emit independent structured comments. They never write code and never modify the convoy file.

### Trigger

User runs:

> *"/multitask run reviewer, security-auditor, design-system-auditor, and a11y-auditor on this PR"*

Or, equivalently, the user runs each one in four async subagents from the Agents Window.

### Hard rules

1. **Audit roles never modify state.** All four are read + grep + comment. No writes to the diff, no edits to the convoy.
2. **All four read the same diff snapshot.** If a parallel implementer is still running, wait — do not race against an in-flight edit.
3. **All four emit a single comment.** The PR Health rollup workflow (`pr-health-rollup.yml`) concatenates the four comments into one rolled-up status check. No cohort coordination needed — outputs are timing-independent.
4. **Convoy events stamp a shared `multitask_group`** so analytics can measure wall-clock savings vs. serial.

### Expected wins

- ~4× wall-clock on the audit phase (the four roles were already independent; serializing them was an artifact of single-chat workflow).
- **Lower token cost** when audit roles run on fast models (`composer-2.5-fast` per role frontmatter). Fan-out on Opus triples audit spend for the same diff — invoke roles from the Agents dropdown so `model:` applies. See [`model-routing-policy.md`](model-routing-policy.md).

### What stays sequential

- The implementer that produced the diff (one writer per worktree).
- The doc-writer that follows merge (writes commits, single output).

## Pattern B — Per-brief implementer fleet (advanced — use guardrails)

When `role-architect` decomposes a convoy into N briefs with **`depends_on: []` and disjoint `files:` lists**, the user can dispatch one implementer per brief in parallel.

### Trigger

User runs after architect's plan is approved (human gate 1):

> *"/multitask run implementer on briefs 1, 2, and 3"*

### Hard rules

1. **Each implementer gets its own worktree.** Use Cursor's native worktrees from the Agents Window (preferred) or `git worktree add` manually. Never run two implementers in the same checkout — they will clobber each other.
2. **Briefs must have empty `depends_on`.** A brief that says `depends_on: [1]` cannot start until brief 1 lands. The conductor's `slice_dependencies:` field captures this graph.
3. **Briefs must have disjoint `files:`.** If brief 1 and brief 2 both edit `lib/auth-options.ts`, they cannot fan out — serialize them or merge into one brief.
4. **Lint and test gates run per worktree.** Each implementer runs `npm run lint && npm test` locally before emitting its PR draft. No shared `node_modules`.
5. **Audit roles run per PR.** Once N implementer PRs are open, the audit fan-out (Pattern A) runs once per PR — not as a single multi-PR audit.

### Architect's responsibility

`role-architect` MUST mark each brief with:

- `depends_on:` — explicit list, even if empty
- `files:` — full list, no globs

And the convoy frontmatter MUST include:

```yaml
slice_dependencies:
  - brief: 1
    depends_on: []
    files: [app/api/posts/[id]/reactions/route.ts, tests/api/reactions.test.ts]
  - brief: 2
    depends_on: []
    files: [components/PostReactionPanel.tsx]
  - brief: 3
    depends_on: [1]
    files: [app/feed/page.tsx]
```

In this example, briefs 1 and 2 fan out. Brief 3 waits.

### Failure modes to design around

| Failure | Why it happens | Mitigation |
| --- | --- | --- |
| Two implementers edit `package.json` | Brief author forgot to include it in `files:` | Architect anti-pattern: every brief must list every file it'll edit |
| Lint runs simultaneously in three worktrees and OOM-kills | npm + tsc + eslint all spawning workers | Cursor's worktree feature isolates `.next/` and `node_modules/`; if you hit OOM, drop concurrency to 2 |
| A brief's "disjoint" file imports a brief that's also being edited | Source files are disjoint but transitively coupled | Architect risk-list must call out cross-file imports; if found, mark `depends_on:` accordingly |
| One implementer's tests fail; user wants to retry without re-running siblings | `/multitask` retry semantics not yet documented | Run the single failed implementer in a new chat with the same brief; siblings stay green |

## Pattern E — Correction workflow (fix pass after audit)

After Pattern A audit fan-out, some reports will recommend **request-changes** or list 🔴 Critical findings. This is the bounded self-correction path — **not** an autonomous fix loop.

### Flow

```
Mode 1 implementer → open PR → Pattern A audit fan-out
       ↓
Human reads reports (gate between audit and fix)
       ↓
Mode 2 implementer (fix pass) — max 2 per brief per PR
       ↓
Re-run only affected auditors (subset, not full fan-out unless user wants it)
       ↓
Human gate 2 (merge)
```

### Trigger

User runs after reviewing audit comments:

> *"Run implementer fix pass on brief 2 — address these findings: …"*

Paste findings, link PR comments, or `gh pr view <N> --comments` output. The implementer role file defines Mode 2 steps and the amend-summary template.

### Hard rules

1. **Human gate between audit and fix.** Never auto-invoke Mode 2 from an auditor report. The user decides what to fix and what to defer.
2. **Same `files:` contract as Mode 1.** Fix pass does not add files or widen scope. Findings that need out-of-scope files → architect brief amend + human gate 1, not a silent edit.
3. **Max 2 fix passes per brief per PR.** Third pass → stop; re-scope with architect or merge with documented debt.
4. **Subset re-audit.** If only security findings were fixed, re-run `role-security-auditor` only. Full four-way fan-out is optional when the diff touch surface is large or the user wants a clean slate.
5. **Serial in the PR branch.** Mode 2 uses the existing worktree/branch for that brief. Do not fan out fix passes on the same brief.
6. **CI is ground truth after fix.** Mode 2 runs local lint/test like Mode 1; user still waits for CI before gate 2.

### When to use Mode 2 vs other tools

| Situation | Use |
| --- | --- |
| Auditor 🔴 / must-fix on files in the brief | Mode 2 fix pass |
| Lint/test failed during Mode 1 step 9 | Same Mode 1 session (up to 3 attempts) — not Mode 2 |
| CI failed after PR opened | Human triages; optional `ci-investigator` or Mode 2 if failure maps to brief scope |
| Finding needs new file not in `files:` | Architect amend — not Mode 2 |
| Docs-only finding | `role-doc-writer` or human edit — not implementer |

### Metrics signal

Mode 2 amend summaries include `<!-- pipeline: pass=fix -->`. Count fix passes per convoy in retro: **1 Mode 1 + 0–2 Mode 2** per brief is healthy; **3+ implementer invocations** on one brief suggests vague acceptance criteria or audit noise.

See `role-implementer.md` for Mode 1 vs Mode 2 steps and templates.

## Pattern C — Cross-repo work in a multi-root workspace

Cursor 3.2's multi-root workspaces let one agent session target multiple folders. For our pipeline:

### Use case 1 — Modus migration across consumers

Open the Modus shared library + 1-3 consumer apps in one workspace. The `modus-migration-server` MCP can then walk a V1 → V2 migration across all of them in one session, instead of you re-targeting per repo.

### Use case 2 — Cross-repo refactor

A shared lib + its consumers. Run `role-architect` once; it can see all repos. Briefs may declare files in different roots — that's fine, the implementer's `files:` paths just need to be absolute or workspace-relative.

### Use case 3 — Fleet bootstrap

Open N greenfield Trimble repos in one workspace. Run the `bootstrap-agent-context` skill N times (the skill explicitly bootstraps ONE repo at a time; it asks which root to target if it detects multi-root).

### What multi-root does NOT change

- Each repo still has its own `.convoys/` and `.metrics.jsonl`. Events from a multi-root session land in the correct repo's metrics file because `log-convoy-event.sh` resolves repo root from `git rev-parse --show-toplevel` of the file being edited.
- The pipeline's human gates still apply per-repo. Don't merge a cross-repo change in one repo without verifying the consumers compile.

## Pattern D — When to NOT use `/multitask`

Multitask is the wrong tool for:

| Situation | Why |
| --- | --- |
| Planning roles (ia / ux / architect) | Each builds on the previous; parallelizing produces incoherent plans |
| Multiple convoys at once on the same repo | Convoys can run in parallel via separate chats already; `/multitask` is for *within* a convoy |
| Hotfixes | The whole point of `hotfix` classification is to skip planning roles; just run implementer + reviewer serially |
| Docs-only convoys | One file, one writer |
| Autonomous fix-until-green loops | Use Pattern E with human gate + max 2 fix passes; no agent auto-spawns Mode 2 |

## Worktrees: Cursor 3.2 native vs. `scripts/wt.sh`

Cursor 3.2 added native worktree management to the Agents Window with one-click foregrounding. **Prefer it over the legacy `wt.sh` script**, which is kept only as a fallback for non-Cursor / scripted use.

| Need | Use |
| --- | --- |
| Spin up worktree for a brief, run an implementer in it, foreground when done | Cursor Agents Window → "New worktree" → pick branch |
| Scripted CI worktree creation | `git worktree add` directly (or the legacy `wt.sh`) |
| Multiple implementers in parallel | Cursor's worktree feature, one per brief |

The legacy `wt.sh` template in this fork now prints a deprecation notice pointing here.

## Analytics: how parallel events show up

When you run an audit fan-out, all four audit roles emit a `convoy_event` with the same `multitask_group` value (a short string like `audit-<convoy>-<pr#>`).

The aggregator (`analytics/analyze-convoys.ts`) can then compute wall-clock cohort cost as `max(duration_s within group)` instead of `sum(...)` — surfacing the real time savings.

Today the aggregator just stores the field; a future version will surface cohort metrics in the dashboard. The field is forward-compatible.

To emit the marker manually:

```bash
bash scripts/log-convoy-event.sh \
  role=role-reviewer \
  convoy=bookmark-badge \
  brief=2 \
  duration_s=42 \
  multitask_group=audit-bookmark-badge-PR123
```

If you're invoking via `/multitask`, the recommendation is to pre-compute the group id (e.g. `audit-<convoy>-<pr>`) and tell each spawned subagent to pass it.

## Quick reference card

```
SAFE FAN-OUT
├── audit phase: reviewer + security-auditor + design-system-auditor + a11y-auditor on the same PR
└── implementer fleet: only when briefs have depends_on: [] AND disjoint files:

CORRECTION (serial — never fan-out)
├── Mode 2 fix pass: after human reads audit findings; max 2 per brief per PR
└── subset re-audit: only auditors whose domain changed

UNSAFE FAN-OUT
├── planning roles (ia / ux / architect): each refines the previous
├── conductor: one convoy, one file
└── doc-writer: writes commits, single output

HUMAN GATES (NEVER skip, even with /multitask)
├── gate 1: plan approval (after architect)
├── gate 2: PR merge (after reviewer + auditors)
└── gate 3: prod promote (after doc-writer)
```
