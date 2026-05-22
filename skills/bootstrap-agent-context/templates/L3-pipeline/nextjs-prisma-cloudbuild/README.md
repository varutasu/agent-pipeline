# L3 Pipeline — Next.js + Prisma + Google Cloud Build

Use this variant when the repo's **CI runs on Google Cloud Build** instead of GitHub Actions (typically because you're already deploying via Cloud Build, billing CI to GCP, or working around a GHA spending cap).

## Why this variant exists

The baseline `nextjs-prisma/` runs lint, types, build, test, and schema-map drift in GitHub Actions. If your repo is wired to the Cloud Build GitHub App, those checks are running twice: once in GHA and once in Cloud Build. This variant **drops the GHA `ci.yml` entirely** and ships a `cloudbuild-ci.yaml` instead.

## What's in vs. out

| Workflow | In this variant? | Why |
| --- | --- | --- |
| `ci.yml` (GHA) | ❌ No | Replaced by `cloudbuild-ci.yaml`. Cloud Build is the source of truth for build/test/lint. |
| `cloudbuild-ci.yaml` | ✅ Yes — install, lint, type-check, test, schema-map | All the gates the GHA `ci.yml` provided, on Cloud Build infrastructure. |
| `preview-smoke.yml` | ❌ No (by default) | Cloud Run per-PR preview revisions are project-specific. If you have them, copy `preview-smoke.yml.template` from the baseline `nextjs-prisma/` and adjust the URL discovery step. |
| `visual-diff.yml` | ❌ No (by default) | Same. |
| `pr-health-rollup.yml` | ✅ Yes — reads Cloud Build checks | Aggregates Cloud Build statuses + role reports into one sticky comment. |

## File mapping

| Template | Repo path |
| --- | --- |
| `cloudbuild-ci.yaml.template` | `cloudbuild-ci.yaml` |
| `pr-health-rollup.yml.template` | `.github/workflows/pr-health-rollup.yml` |
| `CODEOWNERS.template` | `.github/CODEOWNERS` |
| `flags-index.ts.template` | `lib/flags/index.ts` |
| `../_common/PULL_REQUEST_TEMPLATE.md.template` | `.github/PULL_REQUEST_TEMPLATE.md` |
| `../_common/convoys-readme.md.template` | `.convoys/README.md` |
| `../_common/wt.sh` | `scripts/wt.sh` (chmod +x) |

## Required repo configuration

1. **Install the Cloud Build GitHub App** on your repo. Cloud Console → Cloud Build → Triggers → "Connect repository".
2. **Create a Cloud Build trigger** that:
   - Watches your repo
   - Triggers on **Pull Request**
   - Points at `cloudbuild-ci.yaml`
   - Uses the appropriate substitutions (project ID, region, etc.)
3. **Verify check posting** — open a PR after setup and confirm a `Google Cloud Build / <trigger-name>` check appears.
4. **Make Cloud Build status required** in branch protection on `develop` and `main`.
5. **Replace `@YOUR-GITHUB-HANDLE`** in `CODEOWNERS`.

## Postgres-backed integration tests

This template assumes your tests mock Prisma (`tests/setup.ts`). If you need a real Postgres on Cloud Build, add a sidecar before the `test` step:

```yaml
- name: 'gcr.io/cloud-builders/docker'
  id: 'pg-up'
  waitFor: ['install']
  args:
    - 'run'
    - '-d'
    - '--name'
    - 'pg'
    - '--network'
    - 'cloudbuild'
    - '-e'
    - 'POSTGRES_USER=ci'
    - '-e'
    - 'POSTGRES_PASSWORD=ci'
    - '-e'
    - 'POSTGRES_DB=ci'
    - 'postgres:16'

- name: 'node:20'
  id: 'test'
  waitFor: ['install', 'pg-up']
  entrypoint: 'bash'
  env:
    - 'DATABASE_URL=postgresql://ci:ci@pg:5432/ci'
  args:
    - '-c'
    - |
      set -euo pipefail
      # Wait for pg
      for i in {1..30}; do
        if nc -z pg 5432; then break; fi
        sleep 1
      done
      npx prisma migrate deploy
      npm run test:run
```

## Migrating from baseline `nextjs-prisma/`

1. **Delete `.github/workflows/ci.yml`** entirely. Cloud Build replaces it.
2. **Add `cloudbuild-ci.yaml`** at repo root (or wherever your trigger expects it).
3. **Replace `pr-health-rollup.yml`** with this variant's version (reads Cloud Build checks, not GHA jobs).
4. **Decide what to do with `preview-smoke.yml` + `visual-diff.yml`:**
   - If you have per-PR Cloud Run revisions — keep them and adjust the URL discovery step.
   - If you don't — delete them.
5. **Update your manifest** to point at `nextjs-prisma-cloudbuild/...` paths.

If you're running a transitional period with both GHA and Cloud Build (e.g. waiting on GHA budget approval), keep both `ci.yml` and `cloudbuild-ci.yaml`. The PR check list will show both; merge requires either or both depending on branch protection. Document this trade-off in the repo README so future-you doesn't forget.

## What CI gates require for green

All of these run on Cloud Build:

- `lint` — `npm run lint`
- `type-check` — `npx tsc --noEmit`
- `test` — `npm run test:run`
- `schema-map` — `npm run schema:map` produces no diff vs. committed `docs/SCHEMA_MAP.md`

Plus the GHA `PR Health rollup` (informational sticky comment).

## Skip semantics

PR body / commit message includes `<!-- pipeline: skip a11y, design -->` to no-op those role audits. Cloud Build steps can't be skipped via PR body (they're driven by the trigger, not a workflow `if:` clause). To skip a Cloud Build step, use a `git commit -m "[skip ci]"` style trigger filter — but be aware that bypasses ALL Cloud Build steps, not just the optional ones.

| Classification | Default skips |
| --- | --- |
| docs-only | a11y, design |
| infra-only | a11y, design |
| config-only | a11y, design |
| server-only | a11y, design |

`plan-approval`, `pr-merge`, `prod-promote` are mandatory human gates and cannot be skipped.
