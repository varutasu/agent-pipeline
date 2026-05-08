# L3 Pipeline — Node generic (no Next.js, no Prisma)

For backend services, CLI tools, libraries, scripts. Reuses the agent roles and PR template; ships a minimal CI matrix and CODEOWNERS.

## Files in this folder

| Template | Repo path | Notes |
| --- | --- | --- |
| `ci.yml.template` | `.github/workflows/ci.yml` | Lint + types + test |
| `CODEOWNERS.template` | `.github/CODEOWNERS` | Replace `@YOUR-GITHUB-HANDLE` |

## Files inherited from `../_common/`

| Template | Repo path |
| --- | --- |
| `PULL_REQUEST_TEMPLATE.md.template` | `.github/PULL_REQUEST_TEMPLATE.md` |
| `convoys-readme.md.template` | `.convoys/README.md` |
| `wt.sh` | `scripts/wt.sh` (chmod +x) |

## Skipped vs `nextjs-prisma`

- No preview URL, so no `preview-smoke.yml` or `visual-diff.yml`.
- No PR Health rollup (it's overkill for a single CI workflow).
- No `lib/flags/`. Use env vars or your existing flag system if any.
- No `playwright-smoke.spec.ts.template`. Add E2E if/when meaningful.
- The Conductor will default `skip: ux, ia, visual, a11y, design` for most convoys in this stack since there's no UI.

## Manual steps after copying

1. Replace `@YOUR-GITHUB-HANDLE` in CODEOWNERS.
2. If your repo isn't TypeScript: drop the `tsc --noEmit` step in `ci.yml`.
3. If your repo doesn't have a test runner yet: drop the `test` job and add it back later.
