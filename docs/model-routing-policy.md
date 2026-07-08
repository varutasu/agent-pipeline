# Model routing policy

Cost-aware defaults for the agent pipeline. Complements per-role `model:` frontmatter in `.cursor/agents/role-*.md` and the always-on `.cursor/rules/model-routing.mdc`.

## Goals

1. **Preserve quality** on planning and decomposition (conductor, architect).
2. **Cut token spend** on build, audit, and docs (fast/auto tiers).
3. **Make spend measurable** via convoy metrics (`model`, `model_tier`).

Validated on Trimble usage (Jan–Jun 2026): ~72% of spend was Opus-tier; ~37% came from 346 sessions at 10M+ tokens. This policy targets both levers.

## What Cursor enforces vs recommends

| Mechanism | Enforced? | Notes |
| --- | --- | --- |
| `model:` in `.cursor/agents/role-*.md` | **Partial** | Applies when the role is invoked from the Agents UI |
| `model_policy:` in convoy frontmatter | Recommend | Conductor writes it; humans and roles should follow |
| `model-routing.mdc` | Recommend | Always-on nudge; ~45 lines |
| Parent chat model picker | User | Set `auto` or `composer-2.5-fast` for routine work |
| Settings → Agents → Subagents | Partial | Sets default for built-in explore-style subagents |

**Known limitation (Jun 2026):** parent agents spawning Task subagents can pass an explicit `model` that overrides role frontmatter. Mitigation: invoke audit/implementer roles directly; avoid "do everything in one Opus chat."

## Tier table

| Tier | `model_tier` value | Default model ID | Roles |
| --- | --- | --- | --- |
| Premium | `premium` | `claude-4.6-opus-high-thinking` | conductor, architect |
| Fast | `fast` | `composer-2.5-fast` | ia-architect, ux-reviewer, implementer, reviewer, security-auditor, design-system-auditor, a11y-auditor |
| Auto | `auto` | `auto` | doc-writer |

### Escalation (premium)

Escalate from fast → premium when:

- Running conductor or architect (always).
- Implementer failed lint/tests twice on the same brief.
- Security-sensitive change (auth, RLS, admin routes) and architect explicitly flags `recommended_model: claude-4.6-opus-high-thinking` on the brief.

Do **not** escalate for: docs-only, audit fan-out, changelog, or single-file hotfixes.

## Convoy `model_policy` block

The conductor writes this into `.convoys/<slug>.md` frontmatter:

```yaml
model_policy:
  default_session: auto
  roles:
    role-conductor: claude-4.6-opus-high-thinking
    role-architect: claude-4.6-opus-high-thinking
    role-ia-architect: composer-2.5-fast
    role-ux-reviewer: composer-2.5-fast
    role-implementer: composer-2.5-fast
    role-reviewer: composer-2.5-fast
    role-security-auditor: composer-2.5-fast
    role-design-system-auditor: composer-2.5-fast
    role-a11y-auditor: composer-2.5-fast
    role-doc-writer: auto
  escalate_to: claude-4.6-opus-high-thinking
  never_premium:
    - role-reviewer
    - role-security-auditor
    - role-design-system-auditor
    - role-a11y-auditor
    - role-doc-writer
```

Briefs may override with `recommended_model:` and `model_tier:` in frontmatter (set by architect).

## Multitask + cost

Audit fan-out saves **wall-clock**, not tokens, when all four auditors run on Opus. Run the cohort on **fast** models:

```
/multitask role-reviewer + role-security-auditor + role-design-system-auditor + role-a11y-auditor
```

Invoke each role from the Agents dropdown (or ensure subagent model is `composer-2.5-fast`). See [`multitask-playbook.md`](multitask-playbook.md).

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
- [ ] L2 roles installed with `model:` frontmatter (re-bootstrap or sync)
- [ ] `model-routing.mdc` present (always-apply)
- [ ] Settings → Agents → Subagents → fast model for explore
- [ ] Monthly: export team usage CSV + run analytics dashboard
