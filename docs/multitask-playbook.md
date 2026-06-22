# Multitask playbook

Cursor 3.2 introduced `/multitask`, native worktrees in the Agents Window, and multi-root workspaces ([changelog](https://cursor.com/changelog/04-24-26)). This playbook is the source of truth for **when each L2 role can run in parallel**, **what guardrails apply**, and **how to think about the audit phase as a fan-out**.

Every L2 role file declares its parallelism in frontmatter (`multitask: single | audit-fanout | per-brief`). This doc explains what those values mean and when to use them.

## The three modes

| Mode | What it means | Roles |
| --- | --- | --- |
| `single` | One instance at a time. Must run after the previous role. | conductor, ia-architect, ux-reviewer, architect, doc-writer |
| `audit-fanout` | Read-only audit on a fixed input (the diff). Multiple roles in this mode read the same input and emit independent outputs. Safe to run as a parallel cohort. | reviewer, design-system-auditor, a11y-auditor |
| `per-brief` | Multiple instances on different briefs at the same time. Requires worktree isolation and disjoint `files:` lists. | implementer |

If a role isn't marked, treat it as `single`.

## Pattern A — Audit fan-out (recommended default)

After `role-implementer` produces a PR draft, the three audit roles all consume the same diff and emit independent structured comments. They never write code and never modify the convoy file.

### Trigger

User runs:

> *"/multitask run reviewer, design-system-auditor, and a11y-auditor on this PR"*

Or, equivalently, the user runs each one in three async subagents from the Agents Window.

### Hard rules

1. **Audit roles never modify state.** All three are read + grep + comment. No writes to the diff, no edits to the convoy.
2. **All three read the same diff snapshot.** If a parallel implementer is still running, wait — do not race against an in-flight edit.
3. **All three emit a single comment.** The PR Health rollup workflow (`pr-health-rollup.yml`) concatenates the three comments into one rolled-up status check. No cohort coordination needed — outputs are timing-independent.
4. **Convoy events stamp a shared `multitask_group`** so analytics can measure wall-clock savings vs. serial.

### Expected wins

- ~3× wall-clock on the audit phase (the three roles were already independent; serializing them was an artifact of single-chat workflow).
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

## Worktrees: Cursor 3.2 native vs. `scripts/wt.sh`

Cursor 3.2 added native worktree management to the Agents Window with one-click foregrounding. **Prefer it over the legacy `wt.sh` script**, which is kept only as a fallback for non-Cursor / scripted use.

| Need | Use |
| --- | --- |
| Spin up worktree for a brief, run an implementer in it, foreground when done | Cursor Agents Window → "New worktree" → pick branch |
| Scripted CI worktree creation | `git worktree add` directly (or the legacy `wt.sh`) |
| Multiple implementers in parallel | Cursor's worktree feature, one per brief |

The legacy `wt.sh` template in this fork now prints a deprecation notice pointing here.

## Analytics: how parallel events show up

When you run an audit fan-out, all three audit roles emit a `convoy_event` with the same `multitask_group` value (a short string like `audit-<convoy>-<pr#>`).

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
├── audit phase: reviewer + design-system-auditor + a11y-auditor on the same PR
└── implementer fleet: only when briefs have depends_on: [] AND disjoint files:

UNSAFE FAN-OUT
├── planning roles (ia / ux / architect): each refines the previous
├── conductor: one convoy, one file
└── doc-writer: writes commits, single output

HUMAN GATES (NEVER skip, even with /multitask)
├── gate 1: plan approval (after architect)
├── gate 2: PR merge (after reviewer + auditors)
└── gate 3: prod promote (after doc-writer)
```
