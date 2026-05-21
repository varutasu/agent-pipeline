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
| **L2 role refinements** | Better skip semantics, clearer hand-offs, anti-pattern updates | Each role file is independent. Keep ≤120 lines (warn, not fail). |
| **Drift-up harvests** | Hardened role files / rules / skills that originated in a real consumer repo and proved themselves under production load | See [Drift-up workflow](#drift-up-workflow) below. The most valuable category — every other contribution category produces a *theory*; drift-up produces *evidence*. |
| **Analytics enhancements** | New event types, dashboard charts, exporters (CSV, JSON) | Document the schema in `analytics/schemas/`. |
| **Case studies** | A writeup of using the system on your repo, with numbers | `docs/case-studies/<repo-name>.md`. Real data preferred over speculation. |
| **Bug fixes** | Templates with wrong paths, broken bash in installer | Always include a smoke-test addition that catches the bug. |

## Drift-up workflow

The pipeline ships templates one direction by default: pipeline → consumer. *Drift-up* is the inverse — a consumer repo's hard-won customization flows back into the canonical pipeline so every other consumer benefits.

This section codifies the pattern. The first real drift-up was localeloop's `role-architect.md` "Boot-the-brief check" → `agent-pipeline v0.4.0` on 2026-05-21; that release's CHANGELOG entry is the worked example.

### When a consumer customization is harvest-worthy

A customization is a candidate to harvest when **all** of the following are true:

1. **It survived production.** The consumer used it in at least one shipped feature / convoy where the lesson was real, not theoretical. *"We thought this might be a problem"* is not enough; *"this cost us an hour on convoy X, here's what fixed it"* is.
2. **It generalizes.** Every consumer that runs the affected role would benefit, not just the originating repo's stack/domain. Domain-specific concerns (e.g. localeloop's `realtime-yjs.mdc`) stay in the consumer.
3. **The diff is small enough to review.** A 30-line addition with a clear retro behind it is harvestable in one PR. A 300-line rewrite of a role is its own design discussion — open an issue first.
4. **The consumer is willing to be cited.** The CHANGELOG records the source repo + commit/branch as provenance. If the consumer is private, the citation can be the repo name without a public link.

### How to propose a harvest

Two paths, from cheap to formal:

**Path A — file an issue with the diff.** Title: `harvest: <role-or-rule-name> from <consumer-repo>`. Body: link to the consumer file (or paste it for private repos), link to the retro / convoy that drove the change, and a 2–3 sentence pitch on why it generalizes. The maintainer reads it, asks for clarifications, and either does the harvest themselves or asks you to open a PR. This is the easiest path for first-time contributors.

**Path B — open the harvest PR directly.** Branch: `harvest/<role-or-rule-name>-<consumer-slug>`. Apply the customization to the pipeline template and reconcile it against the current pipeline state (v0.3.0+ already has multitask infra, metrics, slice_dependencies — preserve those, graft the customization on top). The PR description must include all four sections of the [PR template for harvests](#pr-template-for-harvests) below. Smoke tests must pass.

In either path, the maintainer re-tags after the merge: minor bump (e.g. `v0.4.0`), CHANGELOG entry under "Added — `<file>`" with provenance.

### PR template for harvests

```markdown
## Source

- **Consumer repo:** <name + URL or "private" + repo name>
- **Source file:** <path in consumer repo>
- **Source commit / branch:** <ref so the harvest can be re-derived>
- **Date harvested:** <ISO date>

## What's being harvested

<2–3 sentence description of the customization. What problem did it solve?>

## Retro / production evidence

<Link or quote from the convoy retro / postmortem / decision log that motivated the customization. Names, dates, scope of the issue. This is the difference between a harvest and a speculative refactor.>

## Reconciliation against current pipeline

<List what was preserved from the pipeline state vs. what was grafted on. Example:
- Preserved: `tools: [Read, Grep, Glob, Shell]` (consumer had narrowed to drop Shell)
- Preserved: `multitask: single` frontmatter, slice_dependencies output #7, Metrics section
- Grafted: 3 new sections (Boot-the-brief, Cross-brief commitments, Mid-convoy scope expansion)
- Grafted: 2 new anti-patterns
>

## Backwards compatibility

<Is this additive only? Does it change required frontmatter? Does it renumber procedure steps?>

## Smoke test

<Confirmation that ./tests/smoke.sh passed locally. Note any new warnings — e.g. line budget exceeded.>
```

### What the maintainer does after merge

1. Bump `version.txt` (minor unless the harvest is breaking).
2. Add a `## [vX.Y.Z]` entry to `CHANGELOG.md` with **all four sections** from the PR description folded in.
3. Tag (`git tag vX.Y.Z`).
4. Update [`docs/CONSUMERS.md`](docs/CONSUMERS.md) — flip the source consumer's row notes to record that the harvest happened. The consumer's *next* sync against the pipeline should reconcile cleanly with no conflict (consumer file ≈ pipeline file).
5. Notify other consumers via their `agent-context-drift` workflow (if installed) — they'll see drift on the harvested file at the next cron tick.

### Drift-up anti-patterns

- **Harvesting without a retro.** A customization without production evidence is just speculation. Either run a convoy and write a retro, or move it into the consumer's local-only rules/skills, not the pipeline.
- **Harvesting domain-specific code.** `realtime-yjs.mdc` belongs in localeloop's `.cursor/rules/`, not the pipeline. Test: would a consumer with no Y.js dependency benefit?
- **Harvesting without reconciliation.** Pipeline templates accumulate features release-over-release. A 6-month-old consumer customization may be missing a v0.3.0 multitask feature; the harvest must graft, not blindly overwrite. The PR description's Reconciliation section is the artifact that proves you did this.
- **Forgetting the line budget.** Role files have a 120-line target (warn at 121+, the smoke test still passes). If the harvest pushes a role over budget, either compress, or extract the new content to a separate doc and reference from the role file. Don't pretend the budget doesn't exist.
- **Skipping the CHANGELOG provenance.** Every harvest entry must cite the source repo. The provenance is the contract that makes future maintainers and other consumers trust the change.

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
