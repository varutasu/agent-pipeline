# Executive summary — agent-pipeline v0.4 → v0.6

**Status as of 2026-06-05:** plan locked, baselines captured, ready to execute.
**Source plan:** [`/.cursor/plans/pipeline_v0.4_design_+_echodo_54a3bdb7.plan.md`](../.cursor/plans/pipeline_v0.4_design_+_echodo_54a3bdb7.plan.md) (1,200+ lines, exhaustive).
**This doc:** the one-pager you can re-read in 3 months when context has decayed.

---

## The pitch in three lines

1. Today the pipeline gives agents **structure** (L1 rules, L2 roles, L3 workflows) — but the human still drives via GitHub PRs and big Cursor chats.
2. v0.4 makes **Echodo (the `tasks` repo) the human-facing surface** so convoys, briefs, and audits are managed by an MCP-aware UI you own, not by GitHub comments.
3. v0.5–v0.6 closes the loop: artifact quality → convoy retros → self-improvement → upstream PRs back to this repo. The pipeline starts improving itself.

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

## What ships when

```
v0.4.0-beta.1 ─── ship Phase 0 + 1a + 2a, then RUN THE EXPERIMENT
                  └─ if 3-of-5 succeed → continue
                                       └─ no → descope per §11

v0.4.0 ─────────── Phase 1b + 1c + 2b (the other 7 design skills + deliverable templates)

v0.5.0 ─────────── Phase 3 (self-hosted runner) + Phase 4 (Echodo workers + GitHub App)

v0.5.1 ─────────── Phase 6: artifact quality role (review/edit/audit before every human gate)
v0.5.2 ─────────── Phase 7: convoy retros + retro templates per classification
v0.6.0 ─────────── Phase 8: self-improvement loop + upstream-courier role → PRs back to agent-pipeline

v0.5+ ──────────── Phase 5: polish (opinionated defaults, examples, sync lint mode)
```

Everything new is **opt-in** at the repo level (manifest flags). zest, tcg-vault, tavernlight don't get forced upgrades.

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

## Next 3 concrete actions

1. **(user, 5 min):** Create `convoys-tasks` workspace in Echodo at `echodo.stillwell.cloud` so Phase 2a has a target.
2. **(agent, 30 min):** Bootstrap the `tasks` repo to L2 + L3 + write `.agent-context-manifest.yml` (it's a partial consumer today). Promote to `synced` in `CONSUMERS.md`.
3. **(agent, 1 hr):** Open feature branches `feat/agent-pipeline-bridge` on `tasks` and `feat/echodo-surface-variant` on `agent-pipeline` and stub out the 6 lifecycle MCP tools listed in Phase 2a.

After those three, the first real convoy can run.
