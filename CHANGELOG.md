# Changelog

All notable changes to `agent-pipeline` are documented here. This file follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.5.0] — 2026-05-22

Per-platform L3 overlays. Through 0.4.0 every consumer used the same `nextjs-prisma/` L3 directory regardless of where the app actually deployed (Vercel, Coolify, Cloud Build, etc.). On every PR the `ci.yml` ran `npm run build` while Vercel/Coolify/Cloud Build *also* ran their own build. Three to five minutes of duplicate work, every push, paid for in GitHub Actions minutes (or, in colab's case, a hard-stopped budget). This release ships three deploy-platform-specific L3 variants that drop the duplicated build step and tune preview-smoke + visual-diff to whatever the deploy platform exposes.

### Added — `templates/L3-pipeline/`

- **`nextjs-prisma-vercel/`** (NEW). 7 templates. `ci.yml` runs lint + types + tests + schema-map drift, NO `npm run build` step (Vercel does it). `preview-smoke.yml` and `visual-diff.yml` use `patrickedqvist/wait-for-vercel-preview@v1.3.2` to wait for Vercel's deployment URL — no `vars.PREVIEW_URL_PATTERN` env var needed. `pr-health-rollup.yml` aggregates the Vercel build check alongside our CI gates.
- **`nextjs-prisma-coolify/`** (NEW). 6 templates. `ci.yml` runs lint + types + tests + schema-map, NO build step (Coolify Docker-builds on push). NO `preview-smoke.yml` or `visual-diff.yml` by default — Coolify is typically a single staging env, not per-PR previews. `pr-health-rollup.yml` rolls up CI gates only (no third-party check). README documents how to opt in to preview-smoke if you've configured per-branch Coolify deployments.
- **`nextjs-prisma-cloudbuild/`** (NEW). 5 templates. `cloudbuild-ci.yaml` (NEW file type) runs install + lint + type-check + test + schema-map drift in Google Cloud Build with `E2_HIGHCPU_8` machines and a 1200s timeout. NO GHA `ci.yml` — Cloud Build replaces it entirely. `pr-health-rollup.yml` reads the `Google Cloud Build / <trigger>` checks via the GitHub Checks API. Adapted from `colab/cloudbuild-ci.yaml` (production reference).
- **`SKILL.md` Step 0**: new "Deploy-platform detection" section. Heuristics: `vercel.json` → Vercel, `cloudbuild*.yaml` → Cloud Build, `Dockerfile` + Coolify hint → Coolify, fallback → GitHub Actions.
- **`SKILL.md` Step 1 question 3**: NEW. "Which deploy platform handles the build?" — single-select, pre-filled by Step 0's detection. Maps to one of four L3 directories.
- **`SKILL.md` Step 4b**: split into per-variant file-mapping tables. Cloudbuild variant ships `cloudbuild-ci.yaml` at repo root instead of `.github/workflows/ci.yml`.
- **`SKILL.md` templates inventory**: gains the three new variant directories with annotations + a per-platform variant matrix at the bottom.
- **`tests/smoke.sh`**: section 1b validates each variant's required file set. Asserts that the Vercel and Coolify `ci.yml` templates do NOT contain a `run: npm run build` step (the regex skips comment lines so the explanatory header doesn't false-positive). Asserts that the cloudbuild variant does NOT include `ci.yml.template`.

### Changed

- **`README.md`**: "What you get" table mentions per-platform L3 overlays. The 30-second use section now points users at the variant matrix in `SKILL.md`.
- **`docs/CONSUMERS.md`**: "Pipeline source" column now also tracks deploy platform per consumer (vercel / coolify / cloudbuild / gha) and a "Recommended variant" column flagging the migration target for each `nextjs-prisma` consumer currently on the baseline.

### Backwards compatibility

- The baseline `templates/L3-pipeline/nextjs-prisma/` directory is **unchanged** and remains the default for repos that build inside GitHub Actions (no external deploy platform). All three existing synced consumers continue to validate against their existing manifests — this release adds variants, it doesn't remove the baseline.
- Migration from baseline → platform variant is **manual** and a one-time op per repo. The sync skill flags it as "behind" only if the consumer's manifest references the new variant; staying on the baseline is a valid configuration. Each variant's README has a "Migrating from baseline" section walking the diff.
- New consumer bootstraps default to detecting the platform; if detection is ambiguous or unknown, the skill asks. Choosing "GitHub Actions / unknown / other" preserves the previous behavior.
- `nextjs` (no Prisma) and `node-generic` stacks do NOT yet have platform variants. They fall back to the baseline; future releases may add them when there's demand.

### Drift implications for existing consumers

- `zest` (Coolify): currently on baseline. Variant migration to `nextjs-prisma-coolify/` would delete `preview-smoke.yml` + `visual-diff.yml` and remove the build step from `ci.yml`. Recommended.
- `localeloop` (Vercel): currently on baseline. Variant migration to `nextjs-prisma-vercel/` would replace the URL-pattern preview-smoke with the wait-for-vercel-preview action and drop the build step. Recommended.
- `colab` (Cloud Build): workflows excluded from manifest entirely (already migrated to Cloud Build). No drift action needed; future re-onboarding could pick up `nextjs-prisma-cloudbuild/` cleanly.

## [0.4.0] — 2026-05-21

First "drift-up" release. The pipeline harvested a hardened `role-architect.md` from a real production retro back into the templates. Until 0.4.0 every release pushed templates one-way (pipeline → consumer); this is the first release where a consumer repo's hard-won lesson flowed back into the canonical pipeline. The pattern proves the design works as a two-way contract.

### Added — `role-architect.md`

- **`## Boot-the-brief check` section** (NEW). Three pre-handoff verifications the Architect must run before declaring the architecture complete: (1) dep-set check (peer dep resolution, recent-major changelog scan), (2) verbatim code shape check (Next.js middleware matchers vs. route groups, Prisma directives, RSC/client-only boundaries, framework plugin wrappers), (3) cross-brief commitments check. Adopted from the `scaffold-nextjs-app` convoy retro recommendation #1 in [`localeloop`](https://github.com/rstillwell-trimb/localeloop) — that convoy lost ~1 hour to a HeroUI v3 + Tailwind 3 + JS-plugin recipe that looked compileable but didn't actually compose.
- **`## Cross-brief commitments` section** (NEW). Frontmatter pattern for declaring stub / forward-declaration debts between briefs. Both briefs that participate in a commitment MUST declare it; declaring in only one (the convention before 0.4.0) means an implementer reading the depended-on brief in isolation has no visibility into the commitment.
- **Implementer brief format**: `cross_brief_commitments:` and `deletes:` are now first-class optional frontmatter fields.
- **`## Mid-convoy scope expansion` section** (NEW). Defines what a scope-expansion PR must include: brief change(s), updated `### Decomposition` table rows, and a new dated entry in the `## Decisions (post-IA round)` section. Stale Decomposition tables were a documented retro finding (`scaffold-nextjs-app` recommendation #6).
- **Step 11 `Boot the brief`** inserted into the procedure between "Write each brief file" and "Append the Architecture section". Steps renumbered.
- **Two new anti-patterns**: skipping Boot-the-brief because briefs "look obvious"; declaring a cross-brief commitment in only one of the two participating briefs.

### Changed

- **`role-architect.md`** grew from 122 → 199 lines (over the 120-line role budget). The smoke test still passes (budget is a `warn`, not a `fail`); future cleanup option is to extract Boot-the-brief / Cross-brief commitments / Mid-convoy scope expansion into a separate `docs/architect-protocols.md` and reference from the role file.

### Drift-up provenance

- Source repo: [`localeloop`](https://github.com/rstillwell-trimb/localeloop) (private), `role-architect.md` at HEAD as of 2026-05-21.
- Source customization: ~57 lines added (Boot-the-brief check, Cross-brief commitments, Mid-convoy scope expansion); `tools` field had been narrowed to `[Read, Grep, Glob]` (lost Shell access for metrics emission). The harvest re-broadens `tools` and grafts the additions onto the v0.3.0 baseline so multitask + metrics are preserved.
- Reconciliation: this release REPLACES localeloop's role file rather than merging — when localeloop syncs against 0.4.0 it should accept-pipeline cleanly with no conflict (assuming localeloop has not modified the file further since 2026-05-21).

### Backwards compatibility

- Existing implementer briefs without `cross_brief_commitments:` or `deletes:` frontmatter continue to work. Both fields are optional and additive.
- Step renumbering does not change any cross-references in other roles or skills.
- `role-architect.md` line budget exceeded — known regression, will be addressed in a future release by extracting protocols to a separate doc.

## [0.3.0] — 2026-05-14

Manifest + sync skill. Earlier releases shipped templates one-way: bootstrap a repo, and to pull pipeline updates later you had to diff every file by hand. This release adds a per-repo manifest tracking exactly which artifacts were installed (with sha256 hashes), a new `sync-agent-context` skill that proposes per-file updates against the latest pipeline source, and an optional weekly CI workflow that flags drift in an issue. The goal is consumer scaling: when more than one repo or person is on the pipeline, updates become reviewable diffs instead of all-or-nothing re-bootstraps.

### Added

- **`.agent-context-manifest.yml`** (NEW per-repo file written by bootstrap). Schema v1: tracks `pipeline_version`, `pipeline_source`, `installed_at`, `last_synced_at`, `layers`, and one entry per artifact (`path`, `source`, `version`, `installed_hash` as `sha256:<hex>`). Contract defined in [`docs/manifest-schema.md`](docs/manifest-schema.md).
- **`skills/sync-agent-context/SKILL.md`** (NEW skill). Reads the manifest, computes current vs. installed-vs-pipeline hashes, classifies each artifact as `up-to-date` / `behind` / `customized` / `conflict`, and asks per-file what to do. Never overwrites a customized file silently. Updates the manifest after applying changes.
- **`SKILL.md` Step 4.7** (NEW step in bootstrap-agent-context). After all selected layers are installed, the skill computes sha256 hashes of every artifact it wrote, fills in the manifest template, and saves it to the consumer repo root.
- **`templates/L1-context/agent-context-manifest.yml.template`** — the seed file the bootstrap skill fills in at Step 4.7.
- **`templates/L3-pipeline/_common/agent-context-drift.yml.template`** (NEW workflow, optional during bootstrap). Weekly cron + manual trigger that clones the pipeline repo at its latest tag, recomputes hashes against the manifest, and opens (or updates) an issue titled "agent-context: behind v<X>" when drift is detected. No auto-fix.
- **`docs/manifest-schema.md`** (NEW doc) — top-level fields, artifact entry shape, drift classification matrix, worked example, what the manifest does NOT track (`AGENTS.md`, `docs/SCHEMA_MAP.md`, `.convoys/*`).
- **`install.sh`** symlinks the new sync skill into `~/.cursor/skills/sync-agent-context/`. `update.sh` re-runs `install.sh` automatically if it detects a new skill the existing install missed (so updating from 0.2.0 → 0.3.0 doesn't require manual re-install).
- **Smoke test** gains a manifest-hash flow check (shell `shasum` vs. Python `hashlib` agree on sha256) and structural checks for the new sync skill, manifest template, schema doc, and drift workflow template.

### Changed

- **`SKILL.md` description** mentions writing the manifest at install time.
- **`SKILL.md` Step 5 review checklist** gains a Manifest section reminding the user to commit the manifest and pointing at `sync-agent-context` for future updates.
- **`SKILL.md` template inventory** updated to reflect the new manifest template and drift workflow under `_common/`.
- **`INSTALL.md`** restructured: Update section now distinguishes "update the local pipeline clone" (run `./update.sh`) from "pull pipeline updates into a bootstrapped repo" (run the sync skill in Cursor).
- **`README.md`** "What you get" table gains a "Manifest + sync" row. "30-second use" section mentions the sync trigger phrase.

### Backwards compatibility

- Repos bootstrapped before 0.3.0 don't have a manifest. The sync skill detects this and offers retroactive manifest generation (Step 1b of `sync-agent-context`'s SKILL.md) — scans installed artifacts, matches them to pipeline templates, computes hashes, and writes the manifest at the current pipeline version. Caveat: the retro-generated `installed_hash` reflects the file's current state, so pre-existing local edits become invisible until the next user customization.
- Schema is versioned (`schema_version: 1`). Future breaking changes will bump the field and ship a migration in the sync skill.
- The drift workflow is opt-in during bootstrap; users who don't want passive monitoring can decline it.

## [0.2.0] — 2026-05-14

Cursor 3.2 alignment. Cursor 3.2 (Apr 24, 2026) introduced `/multitask` async subagents, native worktrees in the Agents Window, and multi-root workspaces. This release threads support for all three through the L2 role layer and the bootstrap skill while keeping the pipeline's human gates non-negotiable. Backwards-compatible — roles without the new `multitask:` frontmatter field are treated as `single`.

### Added

- **`docs/multitask-playbook.md`** (NEW) — patterns A (audit fan-out), B (implementer fleet with hard guardrails: `depends_on: []` AND disjoint `files:`), C (cross-repo multi-root), D (when NOT to multitask). Quick-reference card at the bottom.
- **`multitask:` frontmatter on all 9 L2 role files**: values are `single` (conductor, ia-architect, ux-reviewer, architect, doc-writer), `audit-fanout` (reviewer, design-system-auditor, a11y-auditor), `per-brief` (implementer).
- **`role-architect.md`**: new section 7 `Slice dependencies (multitask-ready)` requiring an explicit YAML block in the convoy's `## Architecture` section. New anti-pattern row for missing block.
- **`role-conductor.md`**: new `## Multitask dispatch recommendations` section with per-classification dispatch table.
- **`role-implementer.md`**: Trigger section references `slice_dependencies:` and the Cursor 3.2 worktree workflow.
- **Audit role bodies (reviewer / design-system-auditor / a11y-auditor)**: new `## Multitask (audit fan-out)` section explaining the parallel cohort and the `multitask_group` convention (`audit-<convoy>-<pr>`).
- **`analytics/schemas/convoy-event.json`**: new optional `multitask_group` field (≤64 chars). Aggregators should compute wall-clock as `max(duration_s within group)` for fan-out cohorts, not `sum`.
- **`log-convoy-event.sh`**: accepts `multitask_group=...` arg; threads it into the emitted event; documents POSIX append-atomicity assumptions for concurrent writers.
- **`SKILL.md` Step 3.5** (NEW) — prints the multitask cheat sheet after L2 install.
- **`SKILL.md` Step 0**: new multi-root workspace detection row; stops and asks which root to target.
- **`docs/role-reference.md`**: new `Multitask` column in the 9-roles table; ASCII pipeline diagram updated to show audit cohort as a parallel fan-out; hand-off rules clarified re human gates.

### Changed

- **`scripts/wt.sh` template** is now a deprecation stub. Prints a pointer to Cursor's Agents Window worktree feature and `git worktree add` for scripted use. ~30 lines instead of ~95.
- **`templates/L3-pipeline/_common/convoys-readme.md.template`** adds a "Multitask + worktrees (Cursor 3.2+)" section.
- **`role-conductor.md`** description updated to mention multitask dispatch recommendations.
- **`role-architect.md`** description updated to mention enabling downstream implementer fan-out. File grew to 122 lines (over 120 budget; justified by the new `slice_dependencies:` doc).
- **`SKILL.md`** description names Cursor 3.2 features. Workflow checklist gains Step 3.5. Templates inventory annotated to reflect wt.sh deprecation + multitask_group in log script.

### Backwards compatibility

- Roles without `multitask:` frontmatter continue to work — they're treated as `single`. Existing installs of agent-pipeline can pull v0.2.0 templates incrementally without breaking active convoys.
- The `multitask_group` field is optional; existing analytics scripts ignore unknown fields and continue to compute per-role aggregates correctly.

## [0.1.0] — 2026-05-08

Initial public release.

### Added

- **bootstrap-agent-context skill** with 34 templates across L1 (context), L2 (9 subagent roles), and L3 (CI scaffolding for `nextjs-prisma`, `nextjs`, `node-generic` stack variants).
- **Global `agent-context-bootstrap.mdc` rule** that nudges the agent to offer the skill on repos missing `AGENTS.md` + `.cursor/rules/`.
- **Symlink-based installer** (`install.sh` / `update.sh` / `uninstall.sh`) — idempotent, refuses to overwrite non-symlink files, records install path for clean uninstall.
- **Self-analytics**: `analytics/extract-transcripts.ts` mines Cursor's auto-captured transcripts; `analytics/analyze-convoys.ts` aggregates per-role event logs from `.convoys/.metrics.jsonl`; `analytics/render-dashboard.ts` produces a static HTML report.
- **L2 roles instrumented** to append a metrics event to `.convoys/.metrics.jsonl` on each invocation (gitignored by default; opt-in commit per-repo).
- **Smoke test** (`tests/smoke.sh`) + 5 fixture repos (`empty`, `nextjs-prisma`, `nextjs`, `node-generic`, `existing-agents-md`) + GitHub Actions workflow.
- **Docs**: orchestration spec (the L2/L3 design rationale), validation protocol (how to measure token savings), one-page role reference, two case studies (`colab` -53% conversation tokens; `zest` first external deployment).

### Validated outcomes

- `colab` repo: -50% tool calls, -53% conversation tokens, -28% total context vs baseline on a representative seed task. Full numbers in [docs/case-studies/colab.md](docs/case-studies/colab.md).
