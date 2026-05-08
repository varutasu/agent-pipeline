# L3 Pipeline — Next.js + Prisma

Place files into the repo as follows. The bootstrap skill does this for you, but here's the mapping for reference:

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

1. Set `vars.PREVIEW_URL_PATTERN` in repo settings (e.g. `https://pr-${PR}.preview.example.com`). If you don't have preview URLs, delete `preview-smoke.yml` and `visual-diff.yml`.
2. Replace `@YOUR-GITHUB-HANDLE` in `CODEOWNERS` with your GitHub handle or team.
3. Install Playwright if not already: `npm i -D @playwright/test && npx playwright install`.
4. Add a `smoke` project to `playwright.config.ts`:
   ```ts
   projects: [{ name: 'smoke', testMatch: /smoke\/.*\.spec\.ts/ }]
   ```
5. Add to `lib/flags/index.ts` import path in `tsconfig.json` paths if using `@/lib/flags`.

## What CI gates require for green

- `Lint, types, build` — `npm run lint`, `tsc --noEmit`, `npm run build` (with placeholder env vars; real env in deploy).
- `Unit + integration tests` — `npm run test:run` against a Postgres service container with migrations applied.
- `Schema map up to date` — `npm run schema:map` produces no diff (run locally + commit if Prisma schema changed).
- `Playwright smoke` — runs only when PR has a preview URL and PR body lacks `pipeline: skip smoke`.
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
