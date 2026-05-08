# L3 Pipeline — Next.js (no Prisma)

Inherits from `../nextjs-prisma/` with these overrides. Bootstrap copies the listed files from this folder, and the rest from `../nextjs-prisma/`.

## Files in this folder (override or replace)

| Template | Repo path | Why different |
| --- | --- | --- |
| `ci.yml.template` | `.github/workflows/ci.yml` | No Postgres service container, no Prisma generate, no schema-map job |
| `CODEOWNERS.template` | `.github/CODEOWNERS` | Drops `prisma/**` paths |

## Files inherited from `../nextjs-prisma/`

- `preview-smoke.yml.template`
- `visual-diff.yml.template`
- `pr-health-rollup.yml.template` (the schema-map row will simply not appear because the check doesn't exist)
- `flags-index.ts.template`
- `playwright-smoke.spec.ts.template`

## Files inherited from `../_common/`

- `PULL_REQUEST_TEMPLATE.md.template`
- `convoys-readme.md.template`
- `wt.sh`

See `../nextjs-prisma/README.md` for the full mapping table and required configuration. The only difference: skip the Prisma-related setup steps.
