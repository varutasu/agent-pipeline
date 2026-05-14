---
name: bootstrap-agent-context
description: >-
  Bootstraps a 3-layer agent pipeline aligned with Cursor 3.2+ (multitask,
  native worktrees, multi-root workspaces) for the current repo: L1 context
  (`AGENTS.md`, `.cursor/rules/`, `.cursor/skills/`, optional Prisma schema
  map), L2 subagent roles (`.cursor/agents/role-*.md` for the 9-stage
  idea-to-feature pipeline with explicit multitask annotations), and L3
  pipeline scaffolding (CI gates, PR template, CODEOWNERS, convoys folder,
  optional flag wrapper). Detects stack, detects multi-root workspaces,
  asks which layers to install, drafts each artifact from templates,
  and stops before committing for human review. Use when the user asks to
  bootstrap, scaffold, or deploy agent context / agent pipeline / orchestration
  to a new repo;   asks how to set up `AGENTS.md` or subagents for this codebase;
  asks to standardize this repo to match colab's setup; asks how to use Cursor
  /multitask with this pipeline; or asks to reduce token use for AI agents on
  this repo. Writes `.agent-context-manifest.yml` at install time so the
  `sync-agent-context` skill can later detect drift and apply selective updates.
---

# Bootstrap Agent Context

Drafts a three-layer system so AI agents can orient and execute consistently across repos. Never commits, never pushes, never auto-runs roles. Every artifact is a draft for the user.

## The three layers

| Layer | What it ships | Always loaded? | Per-repo? |
| --- | --- | --- | --- |
| **L1 — Context** | `AGENTS.md`, `.cursor/rules/`, `.cursor/skills/`, schema map | Yes (rules are glob-scoped) | Yes |
| **L2 — Roles** | 9 `.cursor/agents/role-*.md` files defining the pipeline subagents | Loaded on invocation | Yes |
| **L3 — Pipeline** | CI workflows, PR template, CODEOWNERS, `.convoys/` folder, optional flag wrapper, optional worktree helper | Repo infra; runs on PRs | Yes (stack-specific) |

L1 stands alone (validated -53% conversation tokens in colab). L2 stands alone (you can run roles manually with no CI). L3 stands alone (you can run CI without roles). Together they form the idea-to-feature pipeline.

## Hard rules

- **Never overwrite an existing file blindly.** Always read first, propose a diff, and ask before replacing.
- **Never commit, push, or run `git add`.** Stop after files are written so the user can review the diff.
- **Templates are starting points.** Tailor them to the repo. If a template doesn't fit, omit or rewrite it.
- **Line budgets** (each line must pass: *"would removing this cause a mistake the agent wouldn't otherwise make?"*):
  - `AGENTS.md` ≤120 lines
  - **Always-apply** rules (`alwaysApply: true`): ≤80 lines per file AND ≤80 lines combined across all always-apply rules
  - **Glob-scoped** rules: ≤120 lines per file (these only load when matching files are open, so they cost less; spend the headroom on documenting coexisting patterns honestly)
  - Each L2 role file: ≤100 lines
  - Each skill: ≤200 lines
  - Going over budget is allowed when justified (e.g. documenting two coexisting patterns that the agent will keep mixing up otherwise) — call it out in the hand-off so the user can choose to tighten
- **Never auto-spawn other roles.** L2 roles hand off by message to the user, not by invoking siblings. Human gates are non-negotiable.

## Workflow

Copy this checklist into your first reply and update as you go:

```
Bootstrap progress:
- [ ] Step 0: Detect stack, multi-root workspace, and existing state
- [ ] Step 1: Confirm which layers to install (L1 / L2 / L3)
- [ ] Step 2: L1 — AGENTS.md, no-go-zones, stack rules, skills, (Prisma) schema map, agent-context README
- [ ] Step 3: L2 — 9 role files in .cursor/agents/
- [ ] Step 3.5: Print multitask cheat sheet (Cursor 3.2+ /multitask dispatch points)
- [ ] Step 4: L3 — pick stack variant; copy CI + PR template + CODEOWNERS + convoys + optional extras
- [ ] Step 4.7: Write `.agent-context-manifest.yml` listing every artifact installed (used by `sync-agent-context` for drift detection)
- [ ] Step 5: Hand off with review checklist
```

### Step 0: Detect stack and existing state

Run these reads in parallel. Do **not** grep large directories.

| Check | How |
| --- | --- |
| Repo root manifests | `Glob` for `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `Gemfile` |
| Existing L1 | `Glob` for `AGENTS.md`, `.cursor/rules/*.mdc`, `.cursor/skills/*/SKILL.md`, `docs/agent-context/**` |
| Existing L2 | `Glob` for `.cursor/agents/*.md` |
| Existing L3 | `Glob` for `.github/workflows/*.yml`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/CODEOWNERS`, `.convoys/**` |
| Prisma | `Glob` for `prisma/schema.prisma` |
| Next.js | Read `package.json`; check for `next` in dependencies |
| Test runner | `package.json` scripts + dependencies; check for `vitest`, `jest`, `playwright`, `pytest`. Record as **`test_runner: yes / no`** — drives Step 4 conditional |
| Default branch + branch list | `git branch -a` (or `git for-each-ref --format='%(refname:short)' refs/heads/`). Record whether `develop` exists. Drives Step 4 `branches:` filter pruning |
| Multi-root workspace | Check the workspace path against `git rev-parse --show-toplevel`. If the workspace root contains multiple distinct git repos (multiple `.git/` directories under siblings, or a `*.code-workspace` file with multiple `folders`), the user is running on Cursor 3.2+ multi-root. **Stop and ask** which root to target — the skill bootstraps ONE repo at a time |
| README | Read top of `README.md` if it exists, only the first ~50 lines |

Classify the stack into one of:

| Stack class | Trigger | L3 variant |
| --- | --- | --- |
| `nextjs-prisma` | `next` in deps AND `prisma/schema.prisma` exists | `templates/L3-pipeline/nextjs-prisma/` |
| `nextjs` | `next` in deps, no Prisma | `templates/L3-pipeline/nextjs/` (overrides) + `nextjs-prisma/` (rest) |
| `node-generic` | `package.json` exists, neither Next.js nor Prisma | `templates/L3-pipeline/node-generic/` |
| `non-node` | No `package.json` | Skip L3 entirely; document why |

Stop here if you can't classify and ask the user what stack to target.

### Step 1: Confirm scope with the user

Use `AskQuestion` with these questions, allow_multiple where indicated:

1. **Which layers to install?** (allow_multiple = true)
   - L1 — Context (AGENTS.md, rules, skills, schema map)
   - L2 — Subagent roles (9 role-*.md files)
   - L3 — Pipeline scaffolding (CI, PR template, CODEOWNERS, convoys)

2. **For existing files, prefer:** (single-select; only ask if any layer collides with existing files)
   - Tighten in place (read, diff, edit existing files)
   - Side-by-side draft (write new file with `.proposed` suffix)
   - Skip files that already exist

Wait for confirmation. Note: each layer is independent — the user can install one, two, or three.

### Step 2: L1 — Context

Skip this step if the user opted out of L1.

**Templates live in `templates/L1-context/`.**

#### 2a. AGENTS.md

Read `templates/L1-context/AGENTS.md.template`. Fill it from the detected stack:

1. Project overview — 2-3 sentences from README.md if available.
2. Architecture quick reference — `Area | Path | Notes` table.
3. Key conventions — auth, DB, API routes, UI primitives, imports/aliases. Only sections that apply.
4. Common gotchas — leave `<!-- TODO: ask the maintainer -->` markers for unobservable behaviors.
5. Running locally / Testing / Deployment — one line each, point to existing docs.

If `AGENTS.md` already exists, do NOT overwrite. Read it, propose a diff in chat, or write to `AGENTS.md.proposed`.

#### 2b. `.cursor/rules/no-go-zones.mdc` (always-apply)

Copy `templates/L1-context/no-go-zones.mdc`. Edit for this repo:

- Add framework-specific build outputs (`.next/`, `dist/`, `build/`, `__pycache__/`).
- Add the repo's actual secret-file paths (look for `.env*`, `credentials/`, `*.pem`).
- Add vendored or generated paths (`prisma/migrations/` if Prisma).
- Drop sections that don't apply.

#### 2c. Stack-specific rules

Pick 1-3, **only when the repo actually uses them**.

| Detected | Draft from |
| --- | --- |
| Next.js App Router with `app/api/**/route.ts` | `templates/L1-context/api-routes.mdc.template` (verify auth/error helper imports first) |
| Prisma | `templates/L1-context/prisma.mdc.template` (verify `lib/prisma.ts` import path) |
| Other ORM | Author from scratch using `api-routes.mdc.template` as a structural example |

For each rule: set narrow `globs:`, set `alwaysApply: true` only for `no-go-zones`. Glob-scoped rules can run up to 120 lines if you're documenting multiple coexisting patterns (e.g. legacy + new auth helpers); always-apply must stay under 80.

#### 2d. 1-3 task-specific skills

Common candidates: `add-api-route`, `add-component`, `add-page`, `add-prisma-model`, `local-setup`. Each skill is `<name>/SKILL.md` with frontmatter (`name`, `description`). Keep each <200 lines. Match the recipe to how the user actually does the task — read existing examples before authoring.

#### 2e. Prisma schema map (skip if no Prisma)

1. Copy `templates/L1-context/generate-schema-map.ts` → `scripts/generate-schema-map.ts`.
2. Edit `MODEL_GROUPS` to reflect this repo's clusters. **Read the schema first.**
3. Add npm script: `"schema:map": "ts-node --project tsconfig.seed.json scripts/generate-schema-map.ts"` (or use the main tsconfig if no seed config exists).
4. Run it to produce `docs/SCHEMA_MAP.md`.
5. Author `.cursor/rules/prisma-schema-map.mdc` from `templates/L1-context/prisma-schema-map.mdc.template`.

#### 2f. `docs/agent-context/README.md`

Copy `templates/L1-context/agent-context-readme.md.template`. Documents the layers in this repo and who edits what.

### Step 3: L2 — Subagent roles

Skip this step if the user opted out of L2.

**Templates live in `templates/L2-roles/`.** Copy each verbatim into `.cursor/agents/`. The role files are repo-agnostic — they reference paths and conventions that L1 supplies.

| Source | Destination |
| --- | --- |
| `templates/L2-roles/role-conductor.md` | `.cursor/agents/role-conductor.md` |
| `templates/L2-roles/role-ia-architect.md` | `.cursor/agents/role-ia-architect.md` |
| `templates/L2-roles/role-ux-reviewer.md` | `.cursor/agents/role-ux-reviewer.md` |
| `templates/L2-roles/role-architect.md` | `.cursor/agents/role-architect.md` |
| `templates/L2-roles/role-implementer.md` | `.cursor/agents/role-implementer.md` |
| `templates/L2-roles/role-reviewer.md` | `.cursor/agents/role-reviewer.md` |
| `templates/L2-roles/role-design-system-auditor.md` | `.cursor/agents/role-design-system-auditor.md` |
| `templates/L2-roles/role-a11y-auditor.md` | `.cursor/agents/role-a11y-auditor.md` |
| `templates/L2-roles/role-doc-writer.md` | `.cursor/agents/role-doc-writer.md` |

For server-only or CLI repos with no UI, omit `role-ux-reviewer`, `role-design-system-auditor`, `role-a11y-auditor`. The Conductor will set `skip: ux, design, a11y` on convoys for those repos either way; omitting the role files just keeps the dropdown clean.

If any role file already exists at the destination, propose a diff or write a `.proposed` sibling — do not overwrite.

### Step 3.5: Multitask awareness (Cursor 3.2+)

After L2 roles are in place, surface the **multitask dispatch points** to the user. Don't run anything in parallel here — just tell the user where parallelism is safe so they can use Cursor 3.2 `/multitask` on their first real convoy.

Print this exact block in the hand-off summary (unless L2 was skipped):

```
Multitask cheat sheet (Cursor 3.2+):

  Audit fan-out (recommended default)
    After the implementer ships a PR draft, run:
      /multitask role-reviewer + role-design-system-auditor + role-a11y-auditor
    on the same diff. All three are read-only and emit independent comments.
    Use group id: audit-<convoy>-<pr>

  Implementer fleet (advanced — guardrails apply)
    After architect's plan is approved (gate 1), if briefs declare
    `depends_on: []` AND have disjoint `files:` lists, fan them out:
      /multitask role-implementer briefs 1, 2, 3
    Cursor 3.2's Agents Window worktrees give each subagent its own checkout.

  Never multitask
    - Planning roles (ia / ux / architect) — each refines the previous
    - role-conductor — single convoy file output
    - role-doc-writer — single docs PR output

Full playbook: docs/multitask-playbook.md
```

The `docs/multitask-playbook.md` file is part of this repo's docs (not vendored into the bootstrapped repo) — link to it in the bootstrapped repo's `docs/agent-context/README.md` instead. If you DO want a local copy in the bootstrapped repo, leave a TODO marker in `docs/agent-context/README.md` and let the maintainer decide.

### Step 4: L3 — Pipeline scaffolding

Skip this step if the user opted out of L3 OR if stack class is `non-node`.

**Pick the variant from `templates/L3-pipeline/`** based on Step 0's classification:

#### 4a. Common files (all variants)

| Source | Destination |
| --- | --- |
| `templates/L3-pipeline/_common/PULL_REQUEST_TEMPLATE.md.template` | `.github/PULL_REQUEST_TEMPLATE.md` |
| `templates/L3-pipeline/_common/convoys-readme.md.template` | `.convoys/README.md` |
| `templates/L3-pipeline/_common/wt.sh` | `scripts/wt.sh` (deprecated in Cursor 3.2+; the stub prints a pointer to the Agents Window worktree feature. Mark executable: `chmod +x scripts/wt.sh`. Tell the user this is a fallback only — prefer Cursor's native worktrees) |
| `templates/L3-pipeline/_common/log-convoy-event.sh` | `scripts/log-convoy-event.sh` (mark executable; powers self-analytics — L2 roles call this on each invocation. Add `.convoys/.metrics.jsonl` to `.gitignore` unless the user opts in to commit metrics) |
| `templates/L3-pipeline/_common/agent-context-drift.yml.template` | `.github/workflows/agent-context-drift.yml` (weekly cron + manual trigger; opens an issue when this repo falls behind the pipeline. Tell the user: skip this file if you don't want passive drift monitoring) |

#### 4b. Stack-variant files

For `nextjs-prisma`, copy all of:

| Source | Destination |
| --- | --- |
| `templates/L3-pipeline/nextjs-prisma/ci.yml.template` | `.github/workflows/ci.yml` |
| `templates/L3-pipeline/nextjs-prisma/preview-smoke.yml.template` | `.github/workflows/preview-smoke.yml` |
| `templates/L3-pipeline/nextjs-prisma/visual-diff.yml.template` | `.github/workflows/visual-diff.yml` |
| `templates/L3-pipeline/nextjs-prisma/pr-health-rollup.yml.template` | `.github/workflows/pr-health-rollup.yml` |
| `templates/L3-pipeline/nextjs-prisma/CODEOWNERS.template` | `.github/CODEOWNERS` (replace `@YOUR-GITHUB-HANDLE`) |
| `templates/L3-pipeline/nextjs-prisma/flags-index.ts.template` | `lib/flags/index.ts` |
| `templates/L3-pipeline/nextjs-prisma/playwright-smoke.spec.ts.template` | `tests/smoke/app.smoke.spec.ts` |

For `nextjs` (no Prisma), use the `nextjs-prisma` set above EXCEPT replace these two with the leaner versions:

| Source | Destination |
| --- | --- |
| `templates/L3-pipeline/nextjs/ci.yml.template` | `.github/workflows/ci.yml` (no Postgres / Prisma / schema-map) |
| `templates/L3-pipeline/nextjs/CODEOWNERS.template` | `.github/CODEOWNERS` (no `prisma/**`) |

For `node-generic`, copy:

| Source | Destination |
| --- | --- |
| `templates/L3-pipeline/node-generic/ci.yml.template` | `.github/workflows/ci.yml` |
| `templates/L3-pipeline/node-generic/CODEOWNERS.template` | `.github/CODEOWNERS` (replace `@YOUR-GITHUB-HANDLE`) |

Skip `preview-smoke.yml`, `visual-diff.yml`, `pr-health-rollup.yml`, `flags-index.ts`, and `playwright-smoke.spec.ts` for `node-generic`.

#### 4b-conditionals: detection-driven edits to ci.yml

After copying `ci.yml`, edit it based on Step 0 findings:

1. **No test runner detected (`test_runner: no`)** — comment out the entire `test:` job and add a TODO header explaining why. Use this exact block style so it's easy to spot and re-enable:

   ```yaml
   # NOTE: <repo> has no test runner yet. Re-enable this job once vitest (or
   # equivalent) is adopted and a `test:run` script exists in package.json.
   #
   # test:
   #   ...
   ```

2. **No `develop` branch (only `main`)** — change `branches: [develop, main]` to `branches: [main]` in BOTH the `pull_request` and `push` triggers. Same edit for any other workflow that targets `develop`.

3. **No `lint` script in `package.json`** — change `npm run lint` to `npm run lint --if-present` (or remove the lint step). Don't ship a workflow that fails on a missing script.

4. **Schema-map drift job** (`schema-map-fresh`) — only keep this job if L1 step 2e ran (i.e. `scripts/generate-schema-map.ts` and the `schema:map` npm script exist). If L1 was skipped, delete the job.

#### 4c. Required follow-ups (tell the user; do NOT do these yourself)

- Replace `@YOUR-GITHUB-HANDLE` in `.github/CODEOWNERS` with their GitHub handle (or team like `@org/team-name`).
- For `nextjs-prisma` / `nextjs`: set `vars.PREVIEW_URL_PATTERN` in repo settings, OR delete `preview-smoke.yml` and `visual-diff.yml` if no preview URLs exist.
- For Playwright: `npm i -D @playwright/test && npx playwright install` if not already.
- For the schema-map CI job (`nextjs-prisma`): only enable if L1 step 2e ran (i.e. the script + npm script exist).

#### 4d. Skip when L3 file already exists

If the repo already has `.github/workflows/ci.yml` or `.github/CODEOWNERS`, do NOT overwrite. Read them, propose a diff, or write `.proposed` siblings. CI workflows are especially sensitive — collisions are common.

### Step 4.7: Write the manifest

After all selected layers have been installed, write `.agent-context-manifest.yml` at the repo root. This file is the contract between this repo and the pipeline; it's what `sync-agent-context` reads later to detect drift.

**Inputs the agent has at this point:**

- Pipeline version: read `<PIPELINE_ROOT>/version.txt` (PIPELINE_ROOT = `dirname(dirname(readlink(~/.cursor/skills/bootstrap-agent-context)))`).
- Pipeline source URL: the canonical upstream URL. For `varutasu/agent-pipeline`: `https://github.com/varutasu/agent-pipeline`. For the Trimble fork: `https://github.com/rstillwell-trimb/tux_fs-agent-pipeline`.
- ISO timestamp: `date -u +%Y-%m-%dT%H:%M:%SZ`.
- The list of files actually written in Steps 2 / 3 / 4 / 4.5. **Only files the skill itself wrote** go in `artifacts`. Hand-curated files (`AGENTS.md`) and runtime outputs (`docs/SCHEMA_MAP.md`, `.convoys/*`) are NOT tracked.

**Hash computation:**

```bash
shasum -a 256 <path> | awk '{print "sha256:" $1}'
```

(Use `sha256sum` if `shasum` is unavailable on Linux.)

**Manifest content:**

Start from `templates/L1-context/agent-context-manifest.yml.template`. For each tracked artifact, append one entry:

```yaml
  - path: ".cursor/agents/role-conductor.md"
    source: "skills/bootstrap-agent-context/templates/L2-roles/role-conductor.md"
    version: "<PIPELINE_VERSION>"
    installed_hash: "sha256:<hex>"
```

Sort artifacts by `path` for deterministic diffs.

**What to track:**

| Layer | Artifacts to include |
| --- | --- |
| L1 | `.cursor/rules/no-go-zones.mdc`, each stack-specific `.cursor/rules/<name>.mdc`, each `.cursor/skills/<name>/SKILL.md`, `scripts/generate-schema-map.ts` (if Prisma), `.cursor/rules/prisma-schema-map.mdc` (if Prisma), `docs/agent-context/README.md` |
| L2 | Every `.cursor/agents/role-*.md` file written |
| L3 | `.github/PULL_REQUEST_TEMPLATE.md`, `.convoys/README.md`, `scripts/wt.sh`, `scripts/log-convoy-event.sh`, every `.github/workflows/<name>.yml` written (including `agent-context-drift.yml` if installed), `.github/CODEOWNERS`, stack-specific extras (`lib/flags/index.ts`, `tests/smoke/app.smoke.spec.ts`) |
| L0 | Nothing — L0 is per-machine MCP install, not per-repo files (except `.code-review-graphignore` and `prefer-code-graph.mdc` if installed, which DO get tracked) |

**Do NOT track:**

- `AGENTS.md` — hand-curated; tracking gives false drift.
- `docs/SCHEMA_MAP.md` — regenerated by script, not a static template.
- `package.json` edits, `tsconfig.seed.json` — edited but not authored by the skill.
- Anything the user pre-existing files the skill left alone.

After writing the manifest, the new file goes in the user's commit alongside everything else. The skill mentions this in the hand-off (Step 5).

### Step 5: Hand off

End your reply with:

```markdown
## Review checklist

### L1 (if installed)
- [ ] Read `AGENTS.md` for accuracy. Look for `<!-- TODO -->` markers.
- [ ] Read each `.cursor/rules/*.mdc` and confirm `globs:` match real paths.
- [ ] Read each `.cursor/skills/*/SKILL.md` and confirm the recipe matches reality.
- [ ] (Prisma) Skim `docs/SCHEMA_MAP.md` and confirm `MODEL_GROUPS` looks right.

### L2 (if installed)
- [ ] Open Cursor → Agents dropdown; verify the 9 roles appear.
- [ ] Read `role-conductor.md` end-to-end; the rest follow the same shape.
- [ ] Try a dry-run: ask "Run role-conductor on idea: <X>" in a new chat.
- [ ] On Cursor 3.2+: try the audit fan-out on a real PR — `/multitask role-reviewer + role-design-system-auditor + role-a11y-auditor` and confirm three independent comments arrive.

### L3 (if installed)
- [ ] Replace `@YOUR-GITHUB-HANDLE` in `.github/CODEOWNERS`.
- [ ] (Next.js) Set `vars.PREVIEW_URL_PATTERN` or delete preview-smoke.yml + visual-diff.yml.
- [ ] (If installed) `chmod +x scripts/wt.sh`.
- [ ] (If installed) `agent-context-drift.yml` runs weekly. Enable Actions on the repo if not already on. To disable, just delete the file.
- [ ] Open a throwaway PR to verify CI gates run green.

### Manifest
- [ ] Verify `.agent-context-manifest.yml` exists at repo root. Open it and confirm `pipeline_version`, `layers`, and the `artifacts` list match what the skill installed.
- [ ] Future updates: ask Cursor *"Sync agent context for this repo"* — the `sync-agent-context` skill reads this manifest and proposes per-file updates.

### Final
- [ ] `git add` and commit only after review. **Include `.agent-context-manifest.yml` in the commit** — it's the source of truth for future syncs.
```

## What this skill does NOT do

- Does **not** install or configure MCP servers (e.g. `code-review-graph`). MCP is per-machine personal setup.
- Does **not** run `npm install`, lints, builds, or tests. Defer to the user.
- Does **not** edit existing tracked files outside the agent-context surface.
- Does **not** create PR drafts, open PRs, or push to remote.
- Does **not** auto-run any L2 role.

## Common pitfalls

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Templated rule has wrong import paths | Skill applied without reading the real codebase | Re-read actual auth helper / Prisma client / API util location and rewrite |
| `AGENTS.md` exceeds 200 lines | Pulled too much from README | Collapse to one-liners pointing to existing docs |
| Generated `SCHEMA_MAP.md` empty or wrong | `tsconfig.seed.json` excludes the script, or wrong path | Adjust `tsconfig` includes; verify `REPO_ROOT` in the script |
| L3 CI fails on first PR with `npm run lint` not found | Repo lacks the script | Use `npm run lint --if-present` instead, or remove the lint step from `ci.yml` (see Step 4b conditional 3) |
| L3 CI fails on first PR with `test:run` not found | Repo lacks a test runner | Step 4b conditional 1 should have caught this — re-detect, comment out the `test:` job, leave a TODO header |
| L3 CI workflow doesn't fire on PRs | Workflow `branches:` filter targets `develop` but repo only has `main` | Step 4b conditional 2 should have caught this — prune the filter to `[main]` |
| Visual diff comments on every PR with no UI changes | Path filter too broad | Tighten `paths:` in `visual-diff.yml` |
| Role files copied verbatim feel generic | They ARE generic; that's intentional | If a role doesn't fit this repo, drop it (e.g. drop `role-design-system-auditor` for a CLI repo) |

## Verification

Before handing off, confirm:

- Did I read each existing file before proposing to overwrite it?
- Are always-apply rules ≤80 lines (per file AND combined)? Are glob-scoped rules ≤120 lines and using narrow `globs:`?
- Is `AGENTS.md` ≤120 lines?
- Are L2 role files copied verbatim (they're already tuned)?
- Did I pick the right L3 variant for the stack?
- Did I refrain from committing, pushing, or running side-effect commands?

## Templates inventory

```
templates/
├── L1-context/                              (9 files; per-repo customization required)
│   ├── AGENTS.md.template
│   ├── no-go-zones.mdc
│   ├── api-routes.mdc.template
│   ├── prisma.mdc.template
│   ├── prisma-schema-map.mdc.template
│   ├── generate-schema-map.ts
│   ├── agent-context-readme.md.template
│   ├── agent-context-manifest.yml.template  (Step 4.7 writes this; tracked by sync-agent-context)
│   └── validation.md.template
├── L2-roles/                                (9 files; copy verbatim)
│   ├── role-conductor.md
│   ├── role-ia-architect.md
│   ├── role-ux-reviewer.md
│   ├── role-architect.md
│   ├── role-implementer.md
│   ├── role-reviewer.md
│   ├── role-design-system-auditor.md
│   ├── role-a11y-auditor.md
│   └── role-doc-writer.md
└── L3-pipeline/                             (per-stack)
    ├── _common/                             (5 files; all stacks)
    │   ├── PULL_REQUEST_TEMPLATE.md.template
    │   ├── convoys-readme.md.template       (mentions Cursor 3.2 worktrees + multitask)
    │   ├── wt.sh                            (Cursor 3.2 deprecation stub; prints pointer to Agents Window worktrees)
    │   ├── log-convoy-event.sh              (powers self-analytics — L2 roles call this; supports multitask_group cohort field)
    │   └── agent-context-drift.yml.template (weekly cron; opens issue when manifest is behind upstream pipeline)
    ├── nextjs-prisma/                       (7 files; canonical variant)
    │   ├── README.md
    │   ├── ci.yml.template
    │   ├── preview-smoke.yml.template
    │   ├── visual-diff.yml.template
    │   ├── pr-health-rollup.yml.template
    │   ├── CODEOWNERS.template
    │   ├── flags-index.ts.template
    │   └── playwright-smoke.spec.ts.template
    ├── nextjs/                              (overrides; uses nextjs-prisma for the rest)
    │   ├── README.md
    │   ├── ci.yml.template
    │   └── CODEOWNERS.template
    └── node-generic/                        (minimal)
        ├── README.md
        ├── ci.yml.template
        └── CODEOWNERS.template
```
