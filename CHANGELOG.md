# Changelog

All notable changes to `agent-pipeline` are documented here. This file follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
