# Changelog

All notable changes to `agent-pipeline` are documented here. This file follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
