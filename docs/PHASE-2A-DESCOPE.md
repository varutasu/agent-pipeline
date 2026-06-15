# Phase 2a descope decision — 2026-06-11

**Decision:** descope the Phase 2a Echodo MCP bridge. Ship Phase 1a design skills standalone. Re-evaluate the bridge after there's measurable user demand for a web UI projection over `.convoys/`.

**Status:** documented; Phase 1a is on `feat/phase-1a-design-skills` (this commit's branch); Phase 2a chunks remain on `feat/echodo-surface-variant` for the historical record.

## Source of decision

Per the §10 measurement protocol in [`.cursor/plans/pipeline_v0.4_design_+_echodo_54a3bdb7.plan.md`](../.cursor/plans/pipeline_v0.4_design_+_echodo_54a3bdb7.plan.md), the v0.4 plan committed in advance to a 5-convoy experiment with explicit kill criteria — continue building Phase 2b/1b/1c only if **≥ 3 of 5 criteria** pass.

The designed experiment never ran. What happened instead:

- **25 measured convoys** May 23 → Jun 4 in tcg-vault (65 role events in `.metrics.jsonl`)
- **8 PRs merged** Jun 5 → Jun 11 (PRs #126-#133), all file-only, no MCP bridge installed
- **Silent telemetry gap** Jun 4 → Jun 11: the metrics shim worked but agents stopped calling it during multitask audit fan-outs

Mined results (see [`analytics/v0.4-beta1-results.md`](../analytics/v0.4-beta1-results.md) §Observational data):

| # | Criterion | Result |
| --- | --- | --- |
| 1 | Median user_prompts ≤ 60% of baseline | PASS (proxy: 5.9-15.2 tools/prompt across sample transcripts vs target ≥ 3) |
| 2 | ≥ 3 of 5 convoys had zero scope expansion | UNMEASURED (shim broke; some `scope-expanded` outcomes observed in pre-Jun 4 data) |
| 3 | **Echodo bridge worked end-to-end in ≥ 4 of 5 convoys** | **FAIL — bridge never installed on any consumer repo during the experiment window** |
| 4 | Wave 1a skills invoked in ≥ 3 of 5 convoys | PARTIAL (audit fan-out ran on 2 convoys; full Wave 1a content landed Jun 5, post-window) |
| 5 | Subjective "did the pipeline help" verdict | PASS (de facto — 8 merged PRs in 7 days) |

**2 pass + 1 partial + 1 fail + 1 unmeasured.** Criterion #3 is a hard fail. The pipeline kept producing real, mergeable work without the bridge. The bridge is not blocking value; it isn't adding measurable value to current use; the analytics layer that *would* have proved value was broken anyway.

This is exactly the case §11 of the plan calls out:

> **Phase 2a kill criterion:** Drop or descope Phase 2a if MCP queue depth > 0 at end of any convoy or Echodo bridge installs require > 1 hour of debug per consumer.

In practice, the kill condition was simpler than predicted: nobody bothered installing the bridge because the pipeline didn't need it.

## What stays shipped

- **Phase 0**: v0.4 plan + executive summary + analytics infrastructure + bootstrap to `tasks` repo + consumer registry updates.
- **Phase 1a**: 3 audit-aligned design skills (accessibility-audit, design-critique, design-systems) + slim audit roles + bootstrap step 2g. This PR.

## What gets deferred to v0.5+

- **Phase 2a**: Echodo MCP bridge (6 lifecycle tools, `convoy_events` Drizzle schema, role-conductor/architect MCP patches, `echodo-config.json` template). Code is good; problem is premature. Reopen when there's an Echodo-UI demand for convoy projection.
- **Phase 2b**: 3 deliverable templates + 3 template MCP tools. Depends on 2a being live.
- **Phase 1b/1c**: 7 more design skills. Defer until metrics are reliable enough to measure their ROI.
- **Phase 4**: Echodo workers (drift-check, pr-rollup, audit-scheduler). Depends on 2a being valuable enough to invest in.

## What needs immediate attention

- **Restore + harden the metrics shim** — separate PR on `tcg-vault` (`feat/restore-convoy-metrics-gate`). Un-gitignores `.convoys/.metrics.jsonl` so silent gaps surface in PR review, and adds a CI gate failing convoy PRs without telemetry rows.
- **Sync this descope downstream**: when this PR merges, `tasks/feat/agent-pipeline-bridge` should be closed (or merged separately if the convoy_events table + MCP tools are wanted for non-bridge use; that's a defensible alternative).

## Branches at time of this decision

| Repo | Branch | What's on it | Action |
| --- | --- | --- | --- |
| `agent-pipeline` | `feat/phase-1a-design-skills` | This PR — Phase 1a + docs + analytics | **Merge** |
| `agent-pipeline` | `feat/echodo-surface-variant` | Original mixed branch — Phase 1a + Phase 2a templates + role-conductor/architect MCP patches | **Close** (Phase 1a now on its own branch above) |
| `tcg-vault` | `feat/restore-convoy-metrics-gate` | Metrics restoration + CI gate | **Merge** (separate PR, separate repo) |
| `tasks` (rstillwell-trimb/tasks) | `feat/agent-pipeline-bridge` | 6 MCP tools + convoy_events schema + L1/L3 bootstrap | **Close** (preserves the work in git history; Phase 2b/4 can resurrect) |

## Reversal conditions

Reopen Phase 2a if any of these become true:

1. Convoy work needs to be reviewable from a non-developer (e.g. design partner, PM, stakeholder). The Echodo web UI is the answer.
2. Cross-convoy search becomes painful — grepping `.convoys/*.md` no longer scales.
3. The `convoy_events` telemetry needs to power a dashboard (not just be data).
4. Multi-repo convoy aggregation becomes a real use case (single Echodo workspace projecting across `tcg-vault` + `zest` + `tavernlight` + `colab`).

None of these are true today. They might be true in v0.6+ as Phase 7 retros land and Phase 8 self-improvement loops emerge.

---

*Authored 2026-06-11 alongside the Phase 1a PR. See `analytics/v0.4-beta1-results.md` for the data this decision rests on.*
