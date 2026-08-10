# Model routing policy

Cost-aware defaults for the agent pipeline. Complements per-role `model:` frontmatter in `.cursor/agents/role-*.md` and the always-on `.cursor/rules/model-routing.mdc`.

**v0.7.0** shifts planning off Anthropic Opus by default. Opus remains an explicit escalation path only.

## Goals

1. **Preserve quality** on planning and decomposition — without defaulting to Opus.
2. **Cut token spend** — Cursor pool for architect; fast/Grok for build and audit; Sonnet 5 for escalation.
3. **Make spend measurable** via convoy metrics (`model`, `model_tier`).

Validated on Trimble usage (Jan–Jun 2026): ~72% of spend was Opus-tier. v0.7 targets the **Other Models** pool (Anthropic) by moving architect to **Composer 2.5 Standard** (Cursor pool) and conductor to **fast/auto**.

## What Cursor enforces vs recommends

| Mechanism | Enforced? | Notes |
| --- | --- | --- |
| `model:` in `.cursor/agents/role-*.md` | **Partial** | Applies when the role is invoked from the Agents UI |
| `model_policy:` in convoy frontmatter | Recommend | Conductor writes it; humans and roles should follow |
| `model-routing.mdc` | Recommend | Always-on nudge; ~50 lines |
| Parent chat model picker | User | Set `auto` or `composer-2.5-fast` for routine work |
| Settings → Agents → Subagents | Partial | Sets default for built-in explore-style subagents |

**Known limitation:** parent agents spawning Task subagents can pass an explicit `model` that overrides role frontmatter. Mitigation: invoke audit/implementer roles directly; avoid "do everything in one Opus chat."

## Tier table (v0.7)

| Tier | `model_tier` | Default model ID | Roles | Pool |
| --- | --- | --- | --- | --- |
| Standard | `standard` | `composer-2.5` | architect | Cursor (cheapest planning default) |
| Fast | `fast` | `composer-2.5-fast` | conductor, ia-architect, ui-designer, ux-reviewer, implementer | Cursor |
| Audit | `fast` | `cursor-grok-4.5-high` | reviewer, design-system-auditor, a11y-auditor | Cursor |
| Security | `fast` | `gpt-5.6-terra-medium` | security-auditor | Other |
| Auto | `auto` | `auto` | doc-writer | Mixed |
| Premium (escalation) | `premium` | `claude-sonnet-5-thinking-medium` | conductor (large epics), architect (heavy schema) | Other — **$2/$10 promo through Aug 31, 2026** |
| Premium+ (rare) | `premium` | `claude-4.6-opus-high-thinking` | brief-flagged only | Other — avoid routine use |

### Composer Standard vs Fast

- **Architect** uses `composer-2.5` (**Standard** in the model picker — not Fast). Lower cost; latency is fine for 5–10 min planning.
- **Implementer** and interactive roles use `composer-2.5-fast` (**Fast**).

### Escalation ladder

1. **Fast tier fails twice** on the same brief (lint/tests) → retry same model once, then escalate brief to `recommended_model: claude-sonnet-5-thinking-medium`.
2. **Architect flags** `recommended_model: claude-sonnet-5-thinking-medium` on briefs with heavy Prisma/schema/auth cross-cutting work.
3. **Opus** (`claude-4.6-opus-high-thinking`) only when architect sets `recommended_model: claude-4.6-opus-high-thinking` on the brief (novel architecture, multi-service, explicit security spike).

Do **not** escalate for: docs-only, audit fan-out, changelog, or single-file hotfixes.

Do **not** use Opus 4.7 fast / xhigh / Claude Fable 5 / GPT-5.5 Sol for routine pipeline work.

## Convoy `model_policy` block

The conductor writes this into `.convoys/<slug>.md` frontmatter:

```yaml
model_policy:
  default_session: auto
  roles:
    role-conductor: composer-2.5-fast
    role-architect: composer-2.5
    role-ia-architect: composer-2.5-fast
    role-ui-designer: composer-2.5-fast
    role-ux-reviewer: composer-2.5-fast
    role-implementer: composer-2.5-fast
    role-reviewer: cursor-grok-4.5-high
    role-security-auditor: gpt-5.6-terra-medium
    role-design-system-auditor: cursor-grok-4.5-high
    role-a11y-auditor: cursor-grok-4.5-high
    role-doc-writer: auto
  escalate_to: claude-sonnet-5-thinking-medium
  escalate_to_premium: claude-4.6-opus-high-thinking
  never_premium:
    - role-reviewer
    - role-design-system-auditor
    - role-a11y-auditor
    - role-doc-writer
```

For `classification: feature` with multi-repo ambiguity, conductor may set `role-conductor: claude-sonnet-5-thinking-medium` in the convoy block. For `hotfix`, `docs-only`, `config-only`, `infra-only` — keep conductor on `composer-2.5-fast` or `auto`.

Briefs may override with `recommended_model:` and `model_tier:` in frontmatter (set by architect).

## Multitask + cost

Audit fan-out saves **wall-clock**, not tokens, when all four auditors run on Opus. Run the cohort on **Grok / fast** models:

```
/multitask role-reviewer + role-security-auditor + role-design-system-auditor + role-a11y-auditor
```

Invoke each role from the Agents dropdown so `model:` applies. See [`multitask-playbook.md`](multitask-playbook.md).

## Metrics contract

Each role appends to `.convoys/.metrics.jsonl`:

```bash
bash scripts/log-convoy-event.sh \
  role=role-implementer \
  convoy=<slug> \
  brief=<N> \
  model=composer-2.5-fast \
  model_tier=fast \
  duration_s=<seconds>
```

Optional: `estimated_cost_usd=<from Cursor usage export>` for monthly rollups.

Aggregate:

```bash
cd ~/code/agent-pipeline/analytics
npx tsx analyze-convoys.ts <repo-paths...>
npx tsx render-dashboard.ts
```

Dashboard surfaces `events_by_model`, `events_by_model_tier`, and a warning when premium-tier events dominate fast-tier roles.

## Team checklist

- [ ] Parent chat default: `auto` or `composer-2.5-fast`
- [ ] L2 roles installed with v0.7 `model:` frontmatter (re-bootstrap or `sync-agent-context`)
- [ ] `model-routing.mdc` present (always-apply)
- [ ] Architect sessions: **Composer 2.5 Standard** (not Fast, not Opus)
- [ ] Settings → Agents → Subagents → fast model for explore
- [ ] Monthly: export team usage CSV + run analytics dashboard
