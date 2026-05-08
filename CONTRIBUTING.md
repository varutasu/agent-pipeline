# Contributing

Fork → branch → PR. Smoke tests gate the merge. Quick guide below; deeper context in [docs/orchestration-spec.md](docs/orchestration-spec.md).

## Workflow

1. Fork `varutasu/agent-pipeline` on GitHub.
2. Clone your fork and add the upstream remote:
   ```bash
   git clone https://github.com/<your-handle>/agent-pipeline.git
   cd agent-pipeline
   git remote add upstream https://github.com/varutasu/agent-pipeline.git
   ```
3. Create a feature branch off `main`:
   ```bash
   git checkout -b feat/<short-slug>
   ```
4. Make changes. Run the smoke test (see below).
5. Commit. Push to your fork.
6. Open a PR against `varutasu/agent-pipeline:main`. Reference any issue you're addressing.
7. Maintainer reviews, requests changes if needed, merges.

## Eating your own dog food

If your change touches an L2 role or the bootstrap workflow, run an actual bootstrap on a throwaway repo before opening the PR:

```bash
mkdir /tmp/test-repo && cd /tmp/test-repo
git init
echo '{"name":"test","dependencies":{"next":"15"}}' > package.json
# Then in Cursor, open /tmp/test-repo and ask:
# "Bootstrap agent context for this repo."
```

If the skill misbehaves, capture the chat transcript and link it in the PR.

## Smoke test

```bash
./tests/smoke.sh
```

What it checks:

- Each fixture in `tests/fixtures/` (empty, nextjs-prisma, nextjs, node-generic, existing-agents-md) gets the expected artifacts when bootstrap runs against it (simulated — see `tests/smoke.sh` for the exact assertions).
- Templates parse as valid YAML / Markdown / shell.
- All template files referenced by `SKILL.md` exist.
- Generated `SCHEMA_MAP.md` is non-empty for the Prisma fixture.

CI runs the same script via `.github/workflows/smoke.yml` on every PR.

## What changes are welcome

| Category | Examples | Notes |
| --- | --- | --- |
| **New L1 templates** | Drizzle ORM rule, FastAPI rule, Rust API rule | Add to `skills/bootstrap-agent-context/templates/L1-context/`. Update SKILL.md detection table. |
| **New L3 stack variants** | `templates/L3-pipeline/python-fastapi/`, `templates/L3-pipeline/rust/` | Mirror the structure of `nextjs-prisma/`. Update SKILL.md Step 4. Add a fixture. |
| **L2 role refinements** | Better skip semantics, clearer hand-offs, anti-pattern updates | Each role file is independent. Keep ≤100 lines. |
| **Analytics enhancements** | New event types, dashboard charts, exporters (CSV, JSON) | Document the schema in `analytics/schemas/`. |
| **Case studies** | A writeup of using the system on your repo, with numbers | `docs/case-studies/<repo-name>.md`. Real data preferred over speculation. |
| **Bug fixes** | Templates with wrong paths, broken bash in installer | Always include a smoke-test addition that catches the bug. |

## What changes need discussion first

Open an issue before:

- Adding a new L2 role (the 9-role pipeline is intentionally complete; new roles must justify the cognitive cost).
- Changing the convoy file format (breaks every existing convoy in every repo using the system).
- Renaming a template path (breaks installs that pin to a tag).

## Release process

Maintainer-only:

1. Bump `version.txt`.
2. Add an entry to `CHANGELOG.md` under the new version.
3. Tag: `git tag -a v$(cat version.txt) -m "release v$(cat version.txt)"`.
4. Push: `git push origin main --tags`.

Pinned installs reference tags: `git checkout v1.2.0 && ./install.sh` for users who don't want HEAD.

## Code of conduct

Be kind. Disagreement is fine; condescension is not. Maintainer reserves the right to close PRs and lock issues that violate this.
