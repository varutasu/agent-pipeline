# L3 Pipeline — Next.js + Prisma + Coolify

Use this variant when the repo deploys to **Coolify** (self-hosted PaaS, builds via Docker on push to a designated branch).

## Why this variant exists

The baseline `nextjs-prisma/` runs `npm run build` inside GitHub Actions. Coolify also rebuilds the app on every push to its configured deploy branch — so running `next build` in GHA on every PR is duplicate work.

This variant **drops the GHA build step** and keeps the things Coolify doesn't do: tests, schema-map drift, lint, type-check.

## What's in vs. out

| Workflow | In this variant? | Why |
| --- | --- | --- |
| `ci.yml` (lint, types, tests, schema-map) | ✅ Yes — minus `npm run build` | Tests + schema-map aren't run by Coolify. Lint + types provide a fast pre-deploy signal. |
| `preview-smoke.yml` | ❌ No (by default) | Coolify doesn't have per-PR preview URLs out of the box. If you've configured per-branch preview deployments, copy `preview-smoke.yml.template` from `nextjs-prisma/` and point `vars.PREVIEW_URL_PATTERN` at your Coolify pattern. |
| `visual-diff.yml` | ❌ No (by default) | Same reasoning — needs a per-PR URL. |
| `pr-health-rollup.yml` | ✅ Yes | Aggregates CI gates + role reports. Note: there's no Coolify "build" check to roll up (Coolify doesn't post check status to GitHub by default). |

## File mapping

| Template | Repo path |
| --- | --- |
| `ci.yml.template` | `.github/workflows/ci.yml` |
| `pr-health-rollup.yml.template` | `.github/workflows/pr-health-rollup.yml` |
| `CODEOWNERS.template` | `.github/CODEOWNERS` |
| `flags-index.ts.template` | `lib/flags/index.ts` |
| `playwright-smoke.spec.ts.template` | `tests/smoke/app.smoke.spec.ts` (in case you opt in to preview-smoke later) |
| `../_common/PULL_REQUEST_TEMPLATE.md.template` | `.github/PULL_REQUEST_TEMPLATE.md` |
| `../_common/convoys-readme.md.template` | `.convoys/README.md` |
| `../_common/wt.sh` | `scripts/wt.sh` (chmod +x) |

## Required repo configuration

After copying:

1. **Replace `@YOUR-GITHUB-HANDLE`** in `CODEOWNERS` with your GitHub handle or team.
2. **Coolify project settings** should target the same `develop` (or `main`) branch this CI gates. Coolify will auto-deploy after merge.
3. **(Optional) Coolify check-back webhook** — if you'd like a "build deploying" indicator on PRs, configure Coolify to call back to GitHub's commit status API on deploy success/failure, then add a `find('Coolify build')` row in `pr-health-rollup.yml`.
4. **(Optional) Per-branch preview URLs** — if you set those up, copy `preview-smoke.yml.template` from the baseline `nextjs-prisma/` directory and set `vars.PREVIEW_URL_PATTERN` to match.

## Migrating from baseline `nextjs-prisma/`

If you're moving from the baseline:

1. Delete the old `Lint, types, build` job from `ci.yml`. Replace with the new `Lint + types` job (no build).
2. Delete `preview-smoke.yml` and `visual-diff.yml` UNLESS you have per-PR preview URLs configured in Coolify.
3. Replace `pr-health-rollup.yml` with this variant's version (no Vercel row, simpler).
4. Update your manifest entries' `source:` paths from `.../nextjs-prisma/...` to `.../nextjs-prisma-coolify/...`.
5. Remove `vars.PREVIEW_URL_PATTERN` from repo Variables if it was set and you're not using per-PR previews.

## What CI gates require for green

- `Lint + types` — `npm run lint`, `tsc --noEmit`. (No build; Coolify handles that.)
- `Unit + integration tests` — `npm run test:run` against a Postgres service container with migrations applied.
- `Schema map up to date` — `npm run schema:map` produces no diff.
- `PR Health rollup` — sticky comment aggregating all gates + role reports. Always passes; informational.

## Skip semantics

PR body / commit message includes `<!-- pipeline: skip a11y, design -->` to no-op those role audits. Build/test gates can't be skipped (would defeat the purpose).

| Classification | Default skips |
| --- | --- |
| docs-only | a11y, design |
| infra-only | a11y, design |
| config-only | a11y, design, test |
| server-only | a11y, design |

`plan-approval`, `pr-merge`, `prod-promote` are mandatory human gates and cannot be skipped.
