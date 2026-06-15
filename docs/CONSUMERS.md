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
| [`zest`](https://github.com/varutasu/zest) (private) | Personal | Next.js (formerly + Prisma — see drift) | Coolify | `nextjs-prisma-coolify/` ✅ migrated; **drift candidate** — Prisma removed since sync | L1 + L2 + L3 | upstream | `0.5.0` | 2026-05-22 | First v0.5.0 platform-variant migration. Trivial because zest never had `preview-smoke.yml` / `visual-diff.yml` / `pr-health-rollup.yml` installed (only `ci.yml`). One file replaced (`ci.yml`: drops the combined `Lint, types, build` job → 3 separate jobs `Lint + types`, `Unit + integration tests`, `Schema map up to date`). Three manifest entries retagged (`ci.yml`, `CODEOWNERS`, `flags-index.ts`) from `nextjs-prisma/` → `nextjs-prisma-coolify/` source paths; `CODEOWNERS` and `flags-index.ts` are byte-identical between baseline and Coolify variants. Same-day caught a v0.4.0 drift on `role-architect.md` (Boot-the-brief check + Cross-brief commitments + Mid-convoy scope expansion) that zest had been behind on; pulled in alongside platform migration. All 22 artifacts now match pipeline v0.5.0. **Side finding**: zest's pipeline files are still untracked in git (never committed since the original retroactive sync on 2026-05-21) — needs initial commit to put the pipeline + migration on the record. `.gitignore` does NOT yet exclude `.convoys/.metrics.jsonl`; recommend adding before commit. **2026-06-05 stack drift detected**: `package.json` no longer has the `prisma` dependency. Either Prisma was removed since the v0.5.0 sync (in which case the variant should change to `nextjs-coolify/` — does not yet exist as a template — or stay on the Prisma variant if schema-map workflows still apply), OR `prisma` was always a devDep + `@prisma/client` runtime. Triage in next sync. |
| [`tcg-vault`](https://github.com/varutasu/tcg-vault) (private, **product = Deck Hearth**) | Personal | Next.js 16 + Drizzle (Postgres) + React 18 | Vercel | Mixed: `nextjs/` base + selective `nextjs-prisma-vercel/` borrows (`pr-health-rollup.yml`, `preview-smoke.yml`, `visual-diff.yml`, `flags-index.ts`). Needs cleanup — strictly should be on a new `nextjs-vercel/` variant (does not yet exist) OR `nextjs/` with Vercel-aware preview workflows backported. | L1 + L2 + L3 | upstream | `0.5.0` | 2026-05-22 | Full v0.5.0 install discovered during 2026-06-05 inventory; previously listed in "Candidates" but actually fully synced — registry was stale. 25 artifacts tracked (9 L2 roles, 6 L1 rules — 4 customized as `tcg-vault-local`, 2 `tcg-vault-local` skills `add-api-route` / `add-page`, 5 L3 workflows, PR template, CODEOWNERS, `flags-index.ts`, log/wt scripts, smoke spec). Convoys exist in `.convoys/` including `liquid-glass-redesign.md` umbrella (referenced from AGENTS.md). Product is rebranding to **Deck Hearth** (admin email migrated to `admin@deckhearth.com`; repo and Vercel project name still `tcg-vault` — tracked in queued `rename-repo-and-vercel-project` convoy). `forbidden-patterns` CI check is repo-local hardening on top of the standard CI workflow. **Action items**: (a) register here as synced (done — this row), (b) audit the mixed L3 variant — either spawn a `nextjs-vercel/` variant in the pipeline or migrate tcg-vault to a clean variant, (c) confirm tcg-vault's local custom rules + skills (`auth-patterns`, `ui-and-theming`, `db-and-schema`, `schema-map`, `add-api-route`, `add-page`) should remain repo-local OR be promoted upstream as candidates. |
| [`localeloop`](https://github.com/rstillwell-trimb/localeloop) (private) | Trimble | Next.js + Prisma | Vercel | `nextjs-prisma-vercel/` (currently on baseline) | L1 + L2 + L3 | trimble-fork | `0.1.4-trimble` | 2026-05-21 | Synced after the harvest of its own `role-architect.md` customization upstream. 23 artifacts tracked. Step 5 installed: `scripts/log-convoy-event.sh`, `scripts/generate-schema-map.ts`, `.cursor/rules/prisma-schema-map.mdc`. Out-of-pipeline files left alone: `realtime-yjs.mdc`, `docs-edit-policy.mdc`, `.cursor/skills/docs-writer/`, and `.cursor/README.md` (deliberately relocated from `docs/agent-context/README.md` — respect the layout choice; not tracked). End-to-end metrics fix verified: `bash scripts/log-convoy-event.sh` produces a valid event line. `.gitignore` updated to exclude `.convoys/.metrics.jsonl`. **0.5.0 migration pending**: drop the `Build` step from `ci.yml`, swap preview-smoke + visual-diff to use `wait-for-vercel-preview` action (drop `vars.PREVIEW_URL_PATTERN`). |
| [`colab`](https://github.com/rstillwell-trimb/colab) (private) | Trimble | Next.js + Prisma | Cloud Build | `nextjs-prisma-cloudbuild/` (already aligned — workflows excluded from manifest) | L0 + L1 + L2 + L3 | trimble-fork | `0.1.4-trimble` | 2026-05-21 | Richest install. 23 artifacts tracked. Step 5 installed: `scripts/log-convoy-event.sh`, `.code-review-graphignore` (L0 contract). Two artifacts PINNED as customizations (manifest holds consumer hash; pipeline updates won't auto-apply): `.github/CODEOWNERS` (substitutes `@rstillw`, adds rules for `cloudbuild*.yaml`, `auth.ts`, `lib/file-security.ts`); `.github/PULL_REQUEST_TEMPLATE.md` (colab-flavored, predates convoy/brief-aware pipeline template — see `.proposed` sibling). GHA workflows NOT tracked: colab migrated CI to Cloud Build (commit 0b7a3b8), so `ci.yml`, `pr-health-rollup.yml`, `preview-smoke.yml`, `visual-diff.yml`, `deploy-*`, `migrate-*` are out-of-pipeline by intent. 12 colab-specific L1 skills (`add-component`, `add-page`, `add-prisma-model`, `career-ladder-edit`, etc.) and 8 colab-specific L1 rules (`auth-patterns`, `components`, `email-canonicalization`, `file-conventions`, `post-system`, `styling`, `testing`, `vibe-coding`) are out-of-pipeline. Sync was on `develop` branch (colab's standard target per their develop/main strategy ADR). End-to-end metrics fix verified. **0.5.0**: `cloudbuild-ci.yaml` template was adapted from this repo's existing config — colab is the canonical reference for the cloudbuild variant. No migration action needed (already running this pattern). |
| [`tasks`](https://github.com/varutasu/ubiquitous-invention) (private, **product = Echodo**) | Personal | Next.js 15 + Drizzle (Postgres) + tRPC + NextAuth, monorepo (pnpm + Turborepo) | Coolify | Mixed: `nextjs/` base (`CODEOWNERS`) + `nextjs-prisma-coolify/` borrow (`pr-health-rollup.yml`). **Needs `nextjs-coolify/` pure variant** — see open question #5. | L1 + L2 + L3 | upstream | `0.5.0` | 2026-06-05 | First Echodo bootstrap. 17 artifacts tracked. **Pre-existing L1 NOT tracked** (hand-curated, leave alone): `AGENTS.md` (161 lines, well over template budget but well-curated), 4 stack rules in `.cursor/rules/` (`database.mdc`, `markdown-backlog.mdc`, `repo-overview.mdc`, `web-app.mdc`), `.cursor/mcp.json`. **`.github/workflows/ci.yml` kept (NOT tracked)**: the repo's existing workflow is *better* than the template — uses pnpm + monorepo-aware + concurrency + `branches:[main]` correctly; replacing it with the npm-based `nextjs/` template would regress. Three artifacts customized at install time: `.cursor/rules/no-go-zones.mdc` (adapted for `.turbo/`, Drizzle migrations, Coolify deploy paths), `.github/CODEOWNERS` (adapted for `apps/` + `packages/` monorepo layout + `@rstillw`), `.github/workflows/pr-health-rollup.yml` (adapted for single-job CI from coolify variant). Phase 0 of v0.4 plan (`pipeline_v0.4_design_+_echodo_54a3bdb7.plan.md`); next step is the Phase 2a MCP bridge work (this repo hosts the bridge). Convoys queued: convoy #5 of the 5-convoy experiment is "build the bridge itself" — meta-dogfood. |

## Manifest pending — installed but not synced

Repos that were bootstrapped before v0.3.0 (no manifest) and need the retroactive sync flow. None as of 2026-05-21 — colab, localeloop, and zest are all synced.

## Partial consumers — L1/L3 without full L2

Repos that have some pipeline artifacts but never installed all four layers. Triage whether to upgrade.

| Repo | Owner | Stack | Layers | Pipeline source | Last checked | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| [`colab-lumapps`](https://github.com/rstillwell-trimb/colab-lumapps) (private) | Trimble | Next.js | L1 (9 rules, 12 skills) + L3 (4 workflows) | trimble-fork | 2026-05-21 | TBD — decide whether to add L2 roles or document why this repo is intentionally lighter. |
| [`survey-platform`](https://github.com/varutasu/survey-platform) (private) | Personal | Next.js | L1 (11 rules, 4 skills) + L3 (1 workflow) | upstream | 2026-05-21 | TBD — likely wants L2 roles. |
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
