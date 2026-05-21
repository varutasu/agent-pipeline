# Agent-pipeline consumers

A registry of every repo known to consume `agent-pipeline` artifacts (or that's been considered as a candidate). The source of truth for "what's deployed where" — replaces tribal knowledge in chat history.

This file is hand-maintained. The `sync-agent-context` skill does NOT write here automatically. When you bootstrap or sync a repo, update the row.

## How to read this file

- **Status** — current sync state of the repo against this pipeline.
  - `synced` — has `.agent-context-manifest.yml`, manifest version matches a recent pipeline release.
  - `manifest-pending` — has installed pipeline artifacts but no manifest yet. Run `sync-agent-context` and choose retroactive generation.
  - `partial` — has some pipeline artifacts but never went through full bootstrap. Decide whether to upgrade, normalize, or leave alone.
  - `candidate` — known repo that hasn't been bootstrapped. Triage whether it's a worthwhile target.
  - `excluded` — explicitly decided not to bootstrap (one-off, archived, vendored, abandoned, etc.). Document why so future-you doesn't re-litigate.
- **Layers** — which of L0/L1/L2/L3 the consumer has, based on a directory scan (not a manifest read for non-synced rows).
- **Pipeline source** — `upstream` for [`varutasu/agent-pipeline`](https://github.com/varutasu/agent-pipeline); `trimble-fork` for [`rstillwell-trimb/tux_fs-agent-pipeline`](https://github.com/rstillwell-trimb/tux_fs-agent-pipeline).
- **Last checked** — date of the most recent inventory or sync. Stale rows are stale registry data, not stale repos.

## Synced consumers

Repos with a manifest, reconciled against the pipeline.

| Repo | Owner | Stack | Layers | Pipeline source | Manifest version | Last sync | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [`zest`](https://github.com/varutasu/zest) (private) | Personal | Next.js + Prisma | L1 + L2 + L3 | upstream | `0.3.0` | 2026-05-21 | First end-to-end sync. Retroactive manifest. Step 5 installed `scripts/log-convoy-event.sh`. 22 artifacts tracked. `add-api-route` skill is repo-local (not in pipeline). |

## Manifest pending — installed but not synced

Repos that were bootstrapped before v0.3.0 (no manifest) and need the retroactive sync flow.

| Repo | Owner | Stack | Layers | Pipeline source | Last checked | Notes / known drift |
| --- | --- | --- | --- | --- | --- | --- |
| [`colab`](https://github.com/varutasu/colab) (private) | Trimble | Next.js + Prisma + Cloud Run | L0 + L1 + L2 + L3 | trimble-fork | 2026-05-21 | Richest install. Has `.github/workflows/ci.yml.proposed` left from initial bootstrap — clean up during sync. Colab-specific workflows (`deploy-*`, `migrate-*`, `refresh-staging-db.yml`, `probe-staging-announcements.yml`) are out-of-pipeline; manifest must NOT track them. Active feature work daily. Missing `scripts/log-convoy-event.sh` — install via Step 5. |
| [`localeloop`](https://github.com/rstillwell-trimb/localeloop) (private) | Trimble | Next.js + Prisma | L1 + L2 + L3 | trimble-fork | 2026-05-21 | Customization in `role-architect.md` ("Boot-the-brief check", "Cross-brief commitments", "Mid-convoy scope expansion") was harvested upstream as v0.4.0 / v0.1.4-trimble on 2026-05-21. On next sync, the role-architect file should reconcile cleanly against the new pipeline (consumer file pre-harvest will appear `behind`; accepting pipeline restores Shell-tool access and adds the v0.3.0 multitask infrastructure that localeloop's earlier customization had reverted). 4 completed convoys; missing `scripts/log-convoy-event.sh` is why none produced metrics — sync Step 5 will install it. |

## Partial consumers — L1/L3 without full L2

Repos that have some pipeline artifacts but never installed all four layers. Triage whether to upgrade.

| Repo | Owner | Stack | Layers | Pipeline source | Last checked | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| [`colab-lumapps`](https://github.com/rstillwell-trimb/colab-lumapps) (private) | Trimble | Next.js | L1 (9 rules, 12 skills) + L3 (4 workflows) | trimble-fork | 2026-05-21 | TBD — decide whether to add L2 roles or document why this repo is intentionally lighter. |
| [`survey-platform`](https://github.com/varutasu/survey-platform) (private) | Personal | Next.js | L1 (11 rules, 4 skills) + L3 (1 workflow) | upstream | 2026-05-21 | TBD — likely wants L2 roles. |
| [`tasks`](https://github.com/varutasu/tasks) (private) | Personal | unknown | L1 only (4 rules, AGENTS.md) | upstream | 2026-05-21 | TBD — minimal. Either complete the bootstrap or downgrade to "candidate / consciously light". |
| [`tavernlight`](https://github.com/varutasu/tavernlight) (private) | Personal | unknown | L1 (7 rules) + 1 workflow + AGENTS.md | upstream | 2026-05-21 | TBD — has the audit history that originally motivated the pipeline categories. |
| [`echo-board`](https://github.com/varutasu/echo-board) (private) | Personal | unknown | AGENTS.md only | upstream | 2026-05-21 | TBD — bare. Probably a candidate, not a partial. |

## Loose rules only — likely pre-pipeline

Repos with `.cursor/rules/*.mdc` but no `AGENTS.md`, no `.cursor/agents/`, and no convoy infrastructure. These look like ad-hoc rules added before the pipeline existed. Treat them as candidates, not partials.

| Repo | Rules count | Decision |
| --- | --- | --- |
| `BASH` (Personal) | 10 | TBD — probably pre-pipeline ad-hoc rules. Decide whether to bootstrap properly or leave alone. |
| `axiom-server` (Personal) | 10 | TBD — same as above. |

## Candidates — not yet bootstrapped

Repos to consider for bootstrap based on stack and activity. Pick 2–3 max for a wave; defer the rest.

| Repo | Owner | Why a candidate / why not |
| --- | --- | --- |
| `tcg-vault` | Personal | Active enough to consider. |
| `FamilyCalendar` | Personal | Older, low activity — maybe defer. |
| `p90x-workout` | Personal | Likely defer (low scope). |
| `pickem copy` | Personal | "copy" suffix — looks like a scratch fork. Likely defer. |
| `CashflowCopilot` | Personal | Renamed to `zest` (already synced). This entry is the legacy directory; can probably be archived or removed. |
| `echos-OCR-app` | Personal | Older — defer. |
| `TrimbleSurvey` | Trimble | TBD. |
| `starfish-ui` | Trimble | UI library — different shape than app repos. May not need full pipeline. |

## Excluded

Repos explicitly out of scope. Do not bootstrap.

| Repo | Reason |
| --- | --- |
| `gallery_backup` (Trimble) | Backup repo, not active development. |
| `trimble_uno` (Trimble) | Excluded earlier per prior decision (compliance / scope). |

## Open questions captured here so the next sync inherits them

1. **Pipeline-source-by-account discipline.** Personal repos use `upstream`; Trimble repos use `trimble-fork`. Document this convention so consumer registries stay coherent if the fork diverges further.
2. **Drift-up workflow** is still undefined as of 2026-05-21, even though the first real harvest (localeloop → upstream v0.4.0) happened informally on this date. Adding a `CONTRIBUTING.md` section is the next-best step so future drift-ups follow a documented path (todo: `drift-up-pattern`). The v0.4.0 release notes cite the source repo + summarize the customization, but there's no PR-style process.
3. **Fork lag.** Trimble fork is at `0.1.3-trimble`. Upstream is at `0.3.0`. The fork needs to absorb upstream changes before any Trimble repo can sync to a `0.x-trimble` version newer than what's on the fork. Track here when the fork rebase happens.
4. **`add-api-route` skill in zest** is a candidate to promote upstream into `templates/L1-context/skills/`. Capture if it generalizes; otherwise keep as repo-local.

## Update this file when you:

- Bootstrap a new repo (add a row to "Synced" or "Manifest pending" depending on whether the manifest got written).
- Run `sync-agent-context` against a repo (bump its row's manifest version + last-sync date; add a notes entry if any conflicts surfaced).
- Decide a repo is permanently out of scope (move it to "Excluded" with a one-line reason).
- Promote a homegrown customization upstream (note the source repo + the new pipeline version that absorbed it).

Don't worry about polish; this is operational state, not documentation. Stale rows beat missing rows.
