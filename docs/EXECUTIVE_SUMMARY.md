# Executive summary — agent-pipeline v0.4 → v0.6

**Status as of 2026-06-11 (updated post-experiment):** Phase 1a ready to ship. Phase 2a (Echodo bridge) **descoped** per measured kill criteria. See [`docs/PHASE-2A-DESCOPE.md`](PHASE-2A-DESCOPE.md) for the rationale.
**Source plan:** [`/.cursor/plans/pipeline_v0.4_design_+_echodo_54a3bdb7.plan.md`](../.cursor/plans/pipeline_v0.4_design_+_echodo_54a3bdb7.plan.md) (1,200+ lines, exhaustive — predates descope).
**This doc:** the one-pager you can re-read in 3 months when context has decayed.

---

## The pitch in three lines (revised)

1. Today the pipeline gives agents **structure** (L1 rules, L2 roles, L3 workflows) and is producing real PRs — 8 merged on tcg-vault in the Jun 5-11 experiment window alone, all file-only.
2. v0.4 ships **the design-skills layer** (Phase 1a: 3 audit-aligned skills + slim audit roles) so role-a11y-auditor, role-ux-reviewer, and role-design-system-auditor become real instead of stub.
3. v0.5+ ships **self-improvement** (Phases 6/7/8: artifact quality → retros → upstream PRs back to this repo). The Echodo bridge (Phase 2a) is deferred until a real web-UI demand emerges; today's file-only convoys are working.

If only one paragraph fits on the page, it's that one.

---

## What's actually new vs. v0.3

| Concept | v0.3 (today) | v0.4–v0.6 (the plan) |
| --- | --- | --- |
| **Human-facing surface** | GitHub PR + comments + CODEOWNERS | Echodo UI (`echodo.stillwell.cloud`) as primary; GitHub becomes the compute backend. |
| **Convoy state** | Files in `.convoys/` only | Files **still authoritative** (source of truth) + projected to Echodo as `project` objects via MCP. Local-first; Echodo is a cache. |
| **Status tracking** | Implicit ("read the convoy") | Explicit 9-state machine (`draft → convoy_review → in_progress → audit → human_review → merged → released → retired`) enforced server-side. |
| **Design rigor** | Generic role-architect notes | 10 design-skills adapted from `cuellarfr/design-skills`, installed in 3 waves (audit / upstream / craft+ops). |
| **Quality assurance** | Implicit (whoever reviews the PR) | L4 closed loop: per-artifact quality role + per-convoy retro + cross-convoy self-improvement → upstream PRs. |
| **Resilience** | One repo, one humans-in-the-loop choke point | If Echodo is offline, convoys still run; events queue locally and replay when MCP returns. No SPOF. |
| **Measurement** | "-53% tokens" from one repo (colab) | 5-convoy experiment with locked baselines; success criteria + kill criteria pre-committed. |

---

## What ships when — revised after Jun 11 experiment

```
v0.4.0          ─── Phase 0 (planning) + Phase 1a (3 audit skills + slim roles) + tcg-vault Phase 3
                    (self-hosted runner, shipped opportunistically as PR #132)
                    ── DESCOPED: Phase 2a (Echodo MCP bridge); kept on branch for reversal

v0.4.1 (next)   ─── Restore + harden the metrics shim (tcg-vault feat/restore-convoy-metrics-gate).
                    Highest-leverage item: without it, no signal, no kill criteria.

v0.5.0          ─── Phase 1b + 1c (7 more design skills) — GATED on metrics being reliable
                    Phase 6: artifact quality role

v0.5.x          ─── Phase 7: convoy retros + retro templates per classification

v0.6.0          ─── Phase 8: self-improvement loop + upstream-courier → PRs back to agent-pipeline
                    Phase 2a (Echodo bridge) reopens IF web-UI demand emerges

v0.5+           ─── Phase 5: polish (opinionated defaults, examples, sync lint mode)
```

Original v0.4 plan assumed Phase 2a would unlock measurable token savings. Actual experiment shows the pipeline is already saving prompts + driving better tool ratios *without* the bridge. Reordering accordingly. Everything new is still **opt-in** at the repo level (manifest flags).

---

## How we'll know it worked — the 5-convoy experiment

Baselines locked 2026-06-05, raw data in [`analytics/v0.4-beta1-results.md`](../analytics/v0.4-beta1-results.md). Important: **Cursor doesn't expose tokens in transcripts**, so we use message + tool-call proxies. The original "-25% tokens" criterion is now "≤60% of baseline `user_prompts` AND ≤70% of baseline `tools / prompt` ratio."

| Convoy | Repo | Shape | Baseline (`user_prompts` / `tools/prompt`) | Pipeline target |
| --- | --- | --- | --- | --- |
| 1 | tcg-vault | hotfix (`rename-repo-and-vercel-project`) | 3 / 16.0 | ≤ 3 / ≤ 11 |
| 2 | zest | docs-only | TBD (baseline pulled at run-time) | parity |
| 3 | tcg-vault | feature (liquid-glass sub-convoy) | 92 / 22.5 | ≤ 55 / ≤ 15 |
| 4 | tavernlight | feature | 3 / 94.3 | ≤ 3 / ≤ 66 |
| 5 | tasks (Echodo) | infra-only (**build the bridge through the bridge**) | n/a | qualitative ("did it help?") |

**Continue if 3 of 5:** token proxy, zero scope expansion, MCP queue clean, design skills invoked, subjective "yes clearly."
**Stop if any of:** convoy 1 takes >2× baseline; ≥2 convoys hit > 50 queued MCP events; >40% wall-clock spent debugging the pipeline; subjective "no" on 3 of 5.

---

## Risk register — what could kill this

| Risk | Mitigation in place |
| --- | --- |
| **Echodo SPOF** | Local-first architecture: `.convoys/<slug>.md` is authoritative; Echodo is best-effort projection. Outbox at `.convoys/.pending-mcp-sync.jsonl` replays on next reconcile. (§7.6 of plan) |
| **`tasks` is host AND consumer** (circular dep) | Resolved by local-first: tasks-repo convoys are file-authoritative even when MCP is down. |
| **10 design skills is scope-creep risk** | Split into 3 waves (1a/1b/1c). Wave 1a alone proves the install pattern. Waves 1b/1c gated on 5-convoy experiment passing. |
| **No token data → can't validate value claim** | Proxies (user_prompts, tools/prompt, Read-vs-Grep share) capture the *behavioral* signal even without token counts. If Cursor adds usage later, miner picks it up automatically. |
| **L4 turns into infinite self-improvement loop** | 3-of-3 upstream-readiness threshold + explicit human gate before upstream-courier opens a PR (§8 of plan). |
| **Registry staleness** (tcg-vault was synced for 3 weeks before CONSUMERS.md noticed) | `consumers-questions` open question filed; either discipline-after-sync or automation needed. Not a v0.4 blocker. |
| **Mixed L3 variants** (zest used `nextjs-prisma-vercel`, but Prisma is gone) | Two new pure variants planned: `nextjs-vercel/`, `nextjs-coolify/`. Filed as open question; addressed alongside Phase 1c. |

---

## Open decisions still owed

These need answers before each phase ships. None block today's work.

1. **`unified` vs `split` GitHub repos** for L1/L2/L3 distribution (Phase 5 polish).
2. **MCP transport** for Phase 4 — extend stdio to SSE/HTTP, or run a separate worker HTTP process?
3. **Echodo schema** — keep `description` as JSONField, or add typed `convoy_metadata` column? Decide before Phase 4 webhooks.
4. **Pure L3 variants** (`nextjs-vercel/`, `nextjs-coolify/`) — promote during Phase 1c or defer to v0.5?
5. **Retro-template per classification granularity** (Phase 7) — one template covers `feature/hotfix/docs/infra/server-only` with sections, or four separate templates?

---

## The pipeline's evolving north star

> *Build a coding system where the agent does the curated work (L1 context + L2 roles + L3 workflows), Echodo holds the lifecycle state (convoys + briefs + audits + retros), GitHub provides the compute (CI + diffs + merge), and the human only intervenes at three gates (plan approval, PR merge, prod promote) — while the pipeline itself learns from every convoy and proposes its own upgrades.*

That's the destination. v0.4–v0.6 is the road.

---

## Next 3 concrete actions (revised 2026-06-11)

1. **(user, 5 min):** Review + merge `feat/restore-convoy-metrics-gate` on tcg-vault — un-gitignores `.metrics.jsonl`, adds CI gate failing convoy PRs without telemetry rows. This is the single highest-leverage item in the pipeline right now (without it, no kill criteria, no improvement loop).
2. **(user, 5 min):** Review + merge `feat/phase-1a-design-skills` on agent-pipeline — ships the 3 audit skills + slim audit roles. Real value, zero coupling to Phase 2a.
3. **(user, 5 min):** Close `feat/agent-pipeline-bridge` (tasks repo) with a link to `docs/PHASE-2A-DESCOPE.md`. The branch stays in git history; reopen when there's an Echodo web-UI demand.

The 5-convoy experiment didn't run as designed. What ran instead — 8 merged PRs in a week, file-only, all driven by the existing L1/L2/L3 layer — was the experiment, and the data is in [`analytics/v0.4-beta1-results.md`](../analytics/v0.4-beta1-results.md) §Observational data.
