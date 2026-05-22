# L3 Pipeline — Next.js + Prisma + Vercel

Use this variant when the repo deploys to **Vercel** (Vercel's GitHub integration auto-builds every push and posts a Preview Deployment).

## Why this variant exists

The baseline `nextjs-prisma/` runs `npm run build` inside GitHub Actions. On Vercel-hosted apps that's a duplicate of what Vercel already does — every PR pays ~3-5 minutes of GHA minutes for a build whose result is ignored (Vercel's preview is the canonical artifact). This variant **drops the GHA build step** and keeps everything Vercel doesn't already do.

## What's in vs. out

| Workflow | In this variant? | Why |
| --- | --- | --- |
| `ci.yml` (lint, types, tests, schema-map) | ✅ Yes — minus `npm run build` | Tests + schema-map aren't run by Vercel. Lint + types are kept as a fast pre-Vercel signal. |
| `preview-smoke.yml` | ✅ Yes — uses Vercel's deployment URL | Waits on the Vercel deployment via the GitHub Deployments API and runs Playwright smoke against it. |
| `visual-diff.yml` | ✅ Yes — uses Vercel's deployment URL | Same. UI-paths-only. |
| `pr-health-rollup.yml` | ✅ Yes — includes Vercel check | Aggregates the Vercel build status + our CI gates + role reports into one sticky comment. |

## File mapping

| Template | Repo path |
| --- | --- |
| `ci.yml.template` | `.github/workflows/ci.yml` |
| `preview-smoke.yml.template` | `.github/workflows/preview-smoke.yml` |
| `visual-diff.yml.template` | `.github/workflows/visual-diff.yml` |
| `pr-health-rollup.yml.template` | `.github/workflows/pr-health-rollup.yml` |
| `CODEOWNERS.template` | `.github/CODEOWNERS` |
| `flags-index.ts.template` | `lib/flags/index.ts` |
| `playwright-smoke.spec.ts.template` | `tests/smoke/app.smoke.spec.ts` |
| `../_common/PULL_REQUEST_TEMPLATE.md.template` | `.github/PULL_REQUEST_TEMPLATE.md` |
| `../_common/convoys-readme.md.template` | `.convoys/README.md` |
| `../_common/wt.sh` | `scripts/wt.sh` (chmod +x) |

## Required repo configuration

After copying:

1. **Vercel GitHub integration** must be installed and the project linked. Verify by opening any PR and confirming a `Vercel` check appears.
2. **Replace `@YOUR-GITHUB-HANDLE`** in `CODEOWNERS` with your GitHub handle or team.
3. **Install Playwright** if not already: `npm i -D @playwright/test && npx playwright install`.
4. **Add a `smoke` project to `playwright.config.ts`:**
   ```ts
   projects: [{ name: 'smoke', testMatch: /smoke\/.*\.spec\.ts/ }]
   ```
5. **`patrickedqvist/wait-for-vercel-preview@v1.3.2`** is used by preview-smoke + visual-diff. No setup required (uses the default `GITHUB_TOKEN`).

## Migrating from baseline `nextjs-prisma/`

If you're moving from the baseline:

1. Delete the old `Lint, types, build` job from `ci.yml`. Replace with the new `Lint + types` job (no build).
2. Replace `preview-smoke.yml` with this variant's version (uses Vercel's deployment URL, no `PREVIEW_URL_PATTERN` env var needed).
3. Same for `visual-diff.yml`.
4. Replace `pr-health-rollup.yml` to pick up the Vercel build row.
5. Update your manifest entry's `source:` path from `.../nextjs-prisma/...` to `.../nextjs-prisma-vercel/...` so future syncs detect this variant correctly.

Expect to delete a `vars.PREVIEW_URL_PATTERN` setting from repo Variables — it's no longer used.

## What CI gates require for green

- `Lint + types` — `npm run lint`, `tsc --noEmit`. (No build; Vercel handles that.)
- `Unit + integration tests` — `npm run test:run` against a Postgres service container with migrations applied.
- `Schema map up to date` — `npm run schema:map` produces no diff.
- `Vercel — Preview` — the build itself, posted by Vercel.
- `Playwright smoke` — runs only when Vercel preview is up and PR body lacks `pipeline: skip smoke`.
- `Visual diff` — UI files only; same skip rule with `skip visual`.
- `PR Health rollup` — sticky comment aggregating all gates + role reports. Always passes; informational.

## Skip semantics

PR body / commit message includes `<!-- pipeline: skip smoke, visual -->` to no-op those workflows. The Conductor sets these based on convoy classification:

| Classification | Default skips |
| --- | --- |
| docs-only | smoke, visual, a11y, design |
| infra-only | smoke, visual, a11y, design |
| config-only | smoke, visual, a11y, design, test |
| server-only | visual, a11y, design |

`plan-approval`, `pr-merge`, `prod-promote` are mandatory human gates and cannot be skipped.
