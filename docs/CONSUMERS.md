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

| Repo | Owner | Stack | Deploy platform | Recommended L3 variant | Layers | Pipeline source | Manifest version | Last sync | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [`zest`](https://github.com/varutasu/zest-finances) (private) | Personal | Next.js (formerly + Prisma — see drift) | Coolify | `nextjs-prisma-coolify/` ✅ migrated; **drift candidate** — Prisma removed since sync | L1 + L2 + L3 | upstream | `0.6.0` | 2026-07-15 | Synced `783e2a3`: implementer Mode 2 fix pass, `role-ui-designer`, model-routing. Pushed `chore/agent-pipeline-0.6.0`. |
| [`tcg-vault`](https://github.com/stwl-labs/tcg-vault) (private, **product = Deck Hearth**) | Personal | Next.js 16 + Drizzle (Postgres) + React 18 | Vercel | Mixed: `nextjs/` base + selective `nextjs-prisma-vercel/` borrows (`pr-health-rollup.yml`, `preview-smoke.yml`, `visual-diff.yml`, `flags-index.ts`). Needs cleanup — strictly should be on a new `nextjs-vercel/` variant (does not yet exist) OR `nextjs/` with Vercel-aware preview workflows backported. | L1 + L2 + L3 | upstream | `0.6.0` | 2026-07-15 | Synced `783e2a3` on manifest-clean paths. **Still held back:** `pr-health-rollup.yml`, `ci.yml`, `CODEOWNERS`, `no-go-zones.mdc`, `api-routes.mdc`, preview/visual workflows. Pushed `chore/agent-pipeline-0.6.0`. |
| [`localeloop`](https://github.com/rstillwell-trimb/localeloop) (private) | Trimble | Next.js + Prisma | Vercel | `nextjs-prisma-vercel/` (currently on baseline) | L1 + L2 + L3 | upstream (synced from) | `0.6.0` | 2026-07-15 | Synced `783e2a3`: fix pass + UI designer + model-routing. Pushed `chore/agent-pipeline-0.1.8-trimble`. **0.5.0 migration still pending** for `ci.yml` / preview-smoke / visual-diff. |
| [`colab`](https://github.com/rstillwell-trimb/colab) (private) | Trimble | Next.js + Prisma | Cloud Build | `nextjs-prisma-cloudbuild/` (already aligned — workflows excluded from manifest) | L0 + L1 + L2 + L3 | upstream (synced from) | `0.6.0` | 2026-07-15 | Synced `783e2a3` on manifest-clean paths. Pushed `convoy/projects-org-portfolio`. `docs/agent-context/README.md` still held back (colab-customized). |
| [`tasks`](https://github.com/varutasu/ubiquitous-invention) (private, **product = Echodo**) | Personal | Next.js 15 + Drizzle (Postgres) + tRPC + NextAuth, monorepo (pnpm + Turborepo) | Coolify | Mixed: `nextjs/` base (`CODEOWNERS`) + `nextjs-prisma-coolify/` borrow (`pr-health-rollup.yml`). **Needs `nextjs-coolify/` pure variant** — see open question #5. | L1 + L2 + L3 | upstream | `0.5.0` | 2026-06-05 | First Echodo bootstrap. 17 artifacts tracked. **Pre-existing L1 NOT tracked** (hand-curated, leave alone): `AGENTS.md` (161 lines, well over template budget but well-curated), 4 stack rules in `.cursor/rules/` (`database.mdc`, `markdown-backlog.mdc`, `repo-overview.mdc`, `web-app.mdc`), `.cursor/mcp.json`. **`.github/workflows/ci.yml` kept (NOT tracked)**: the repo's existing workflow is *better* than the template — uses pnpm + monorepo-aware + concurrency + `branches:[main]` correctly; replacing it with the npm-based `nextjs/` template would regress. Three artifacts customized at install time: `.cursor/rules/no-go-zones.mdc` (adapted for `.turbo/`, Drizzle migrations, Coolify deploy paths), `.github/CODEOWNERS` (adapted for `apps/` + `packages/` monorepo layout + `@rstillw`), `.github/workflows/pr-health-rollup.yml` (adapted for single-job CI from coolify variant). Phase 0 of v0.4 plan (`pipeline_v0.4_design_+_echodo_54a3bdb7.plan.md`); next step is the Phase 2a MCP bridge work (this repo hosts the bridge). Convoys queued: convoy #5 of the 5-convoy experiment is "build the bridge itself" — meta-dogfood. |

## Manifest pending — installed but not synced

Repos that were bootstrapped before v0.3.0 (no manifest) and need the retroactive sync flow. None as of 2026-05-21 — colab, localeloop, and zest are all synced.

## Partial consumers — L1/L3 without full L2

Repos that have some pipeline artifacts but never installed all four layers. Triage whether to upgrade.

| Repo | Owner | Stack | Layers | Pipeline source | Last checked | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| [`colab-lumapps`](https://github.com/rstillwell-trimb/colab-lumapps) (private) | Trimble | Next.js | L1 (9 rules, 12 skills) + L3 (4 workflows) | trimble-fork | 2026-05-21 | TBD — decide whether to add L2 roles or document why this repo is intentionally lighter. |
| [`survey-platform`](https://github.com/stwl-labs/survey-platform) (private) | Personal | Next.js | L1 (11 rules, 4 skills) + L3 (1 workflow) | upstream | 2026-07-15 | Synced `783e2a3`: fix pass + UI designer + model-routing. Pushed `chore/agent-pipeline-0.6.0`. Partial install — no full L3 convoy stack. |
| [`tavernlight`](https://github.com/stwl-labs/Tavernlight-fn) (private) | Personal | unknown | L1 (7 rules) + 1 workflow + AGENTS.md | upstream | 2026-07-15 | Synced `783e2a3` on manifest-clean paths. Pushed `feat/modern-fantasy-landing`. **Held back:** `docs/model-routing-policy.md`, `scripts/log-convoy-event.sh` (customized). |
| [`echo-board`](https://github.com/stwl-labs/echo-board) (private) | Personal | unknown | AGENTS.md only | upstream | 2026-07-15 | Synced `783e2a3`: fix pass + UI designer + model-routing. Pushed `chore/agent-pipeline-0.6.0`. Still bare on L3 convoy infra. |

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
| `FamilyCalendar` | Personal | Older (last commit 2025-05-27), low activity — defer. Re-triage if it comes back into rotation. |
| `p90x-workout` | Personal | Not git-tracked. Defer indefinitely. |
| `pickem copy` | Personal | "copy" suffix — looks like a scratch fork (last commit 2025-09-08). Likely defer. |
| `CashflowCopilot` | Personal | Renamed to `zest` (already synced). This entry is the legacy directory; can probably be archived or removed. |
| `echos-OCR-app` | Personal | Not git-tracked, last activity early 2025 — defer. |
| `axiom-server` | Personal | Not git-tracked locally. Surface in CONSUMERS audit only if it gets a remote. |
| `personal-assitant` | Personal | Empty / scaffolding directory. Defer until it has actual content. |
| `BASH` | Personal | Shell-based game project, ad-hoc rules only (10 `.cursor/rules/*.mdc`). Doesn't fit the Next.js-shaped pipeline. Mark as **excluded** if you confirm — pipeline is wrong shape. |
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
4. **`add-api-route` skill in zest** is a candidate to promote upstream into `templates/L1-context/skills/`. Capture if it generalizes; otherwise keep as repo-local. Update 2026-06-05: `tcg-vault` ALSO has an `add-api-route` skill (also `tcg-vault-local`); two-of-two consumers = it's a promotion candidate per the Phase 8 / §8 self-improvement loop threshold proposed in `.cursor/plans/pipeline_v0.4_design_+_echodo_54a3bdb7.plan.md`. Action: diff zest's vs tcg-vault's; if generalizable, draft upstream promotion. Same for `add-page` (also in both).
5. **Mixed L3 variants need new pure variants.** `zest` (post-Prisma-removal, Coolify), `tcg-vault` (Drizzle on Vercel), AND `tasks` (Drizzle on Coolify, bootstrapped 2026-06-05) ALL ended up on mixed-variant installs because no pure `nextjs-vercel/` or `nextjs-coolify/` template exists. Three-of-three Prisma-less-Next.js consumers = strong signal. Need `nextjs-vercel/` and `nextjs-coolify/` variants in `skills/bootstrap-agent-context/templates/L3-pipeline/`. Address during v0.4 Phase 1c (alongside the design-ops-handoff skill, since both touch L3 template inventory) or carve out as a side-quest convoy. Reference implementation for `nextjs-coolify/`: see `tasks` `pr-health-rollup.yml` + the kept-as-is `ci.yml` (pnpm-monorepo flavored).
6. **Registry staleness was real**, not theoretical. `tcg-vault` was fully synced on 2026-05-22 but still listed as a candidate on 2026-06-05 (3+ weeks of drift). Add a discipline: every bootstrap or sync run updates `docs/CONSUMERS.md` in the same convoy (not "later"). Consider adding this to `bootstrap-agent-context` and `sync-agent-context` exit checklists.

## Update this file when you:

- Bootstrap a new repo (add a row to "Synced" or "Manifest pending" depending on whether the manifest got written).
- Run `sync-agent-context` against a repo (bump its row's manifest version + last-sync date; add a notes entry if any conflicts surfaced).
- Decide a repo is permanently out of scope (move it to "Excluded" with a one-line reason).
- Promote a homegrown customization upstream (note the source repo + the new pipeline version that absorbed it).

Don't worry about polish; this is operational state, not documentation. Stale rows beat missing rows.
