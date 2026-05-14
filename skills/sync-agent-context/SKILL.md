---
name: sync-agent-context
description: >-
  Check this repo's installed agent-pipeline artifacts against the pipeline
  source, surface drift (out-of-date, locally customized, or conflicting),
  and propose updates one file at a time. Reads `.agent-context-manifest.yml`,
  computes sha256 hashes, never overwrites without explicit user choice.
  Updates the manifest after applying changes. Use when the user asks to
  sync agent context, check pipeline updates, update agent pipeline artifacts,
  check if this repo is behind the latest agent-pipeline, refresh L2 roles
  or L3 workflows from the pipeline, or asks why their `.cursor/agents/` or
  `.cursor/rules/` files are out of date.
---

# Sync Agent Context

Compares this repo's installed agent-pipeline artifacts against the canonical pipeline source. Surfaces drift. Lets the user accept or reject each update file-by-file. Updates the manifest. Never auto-commits.

## Trigger phrases

- *"Sync agent context for this repo."*
- *"Check for agent-pipeline updates."*
- *"Update the L2 roles from the latest pipeline."*
- *"Am I on the latest agent-pipeline?"*
- *"Refresh `.cursor/agents/` from the pipeline."*

## Inputs

- `.agent-context-manifest.yml` at the current repo root (REQUIRED; if missing, run `bootstrap-agent-context` first OR offer to generate a retroactive manifest — see Step 1b).
- The pipeline repo, located by following the symlink at `~/.cursor/skills/bootstrap-agent-context`. The skill source path is the pipeline repo root + `/skills/bootstrap-agent-context`, so the pipeline root is two levels up.

## Outputs

1. A drift report printed to chat — table of `path | state | action`.
2. File contents updated in place for artifacts the user accepted.
3. `.agent-context-manifest.yml` rewritten with new versions / hashes / `last_synced_at`.
4. A hand-off message: *"Sync complete. N files updated, M files held back. Review the diff and commit."*

The skill NEVER runs `git add`, `git commit`, or any side-effect command. It writes files and stops.

## Hard rules

- **Never silently overwrite a customized file.** If `installed_hash` doesn't match the file's current hash, the user owns that file. Show a 3-way diff (manifest hash → current → pipeline) and ask.
- **Never delete files** from the consumer repo. Out-of-pipeline artifacts (e.g. user-added rules) are left alone.
- **Never re-bootstrap.** If layers in the pipeline have grown (e.g. a new role file was added upstream), surface the new files as additions the user can opt into; don't write them automatically.
- **Always update `last_synced_at`** at the end, even if no files changed (so the user can see when the last check ran).

## Steps

### Step 0: Locate the pipeline repo

Follow the symlink at `~/.cursor/skills/bootstrap-agent-context` to find the pipeline checkout. The pipeline repo root is `dirname(dirname(readlink ~/.cursor/skills/bootstrap-agent-context))`.

```bash
PIPELINE_SKILL="$(readlink ~/.cursor/skills/bootstrap-agent-context)"
PIPELINE_ROOT="$(cd "$(dirname "$(dirname "$PIPELINE_SKILL")")" && pwd)"
```

Read `<PIPELINE_ROOT>/version.txt` — this is the current pipeline version.

If the symlink doesn't resolve (skill installed differently), ask the user where the pipeline repo is checked out.

### Step 1a: Read the manifest

Read `<repo-root>/.agent-context-manifest.yml`. If present, proceed to Step 2.

### Step 1b: No manifest — offer retroactive generation

If `.agent-context-manifest.yml` is missing, the repo was bootstrapped before manifests existed (pre-v0.3.0) or hand-rolled.

Ask the user via `AskQuestion`:

- **Generate a retroactive manifest by inspecting installed artifacts** (recommended for repos previously bootstrapped). The skill will scan `.cursor/agents/`, `.cursor/rules/`, `.github/workflows/`, etc., match each file to a pipeline template, compute hashes, and write the manifest at the current pipeline version. Caveat: the resulting `installed_hash` reflects the file's current state, not its original install state — so any pre-existing local edits become invisible until the next user customization.
- **Run `bootstrap-agent-context` instead** if this is a fresh repo with no installation.
- **Cancel**.

If retroactive, build the manifest using these heuristics:

- Each `.cursor/agents/role-*.md` maps to `skills/bootstrap-agent-context/templates/L2-roles/role-*.md`.
- Each `.cursor/rules/<name>.mdc` maps to `skills/bootstrap-agent-context/templates/L1-context/<name>.mdc` (or `.mdc.template`).
- `AGENTS.md` is NOT tracked (hand-curated; see schema doc).
- L3 workflow files map by name (e.g. `.github/workflows/ci.yml` → varies by stack; ask user which variant they installed).

Write the manifest and proceed to Step 2.

### Step 2: Compute the drift table

For each artifact in the manifest:

1. Compute `current_hash` of the file at `<repo-root>/<path>`. If the file is missing, mark `state: deleted` — the user removed it locally; respect that, but flag it.
2. Read the pipeline source file at `<PIPELINE_ROOT>/<source>`. Compute its current hash.
3. Compare manifest `version` to `<PIPELINE_ROOT>/version.txt`.
4. Classify:

| Local hash == `installed_hash`? | Pipeline source hash != installed_hash? | State |
| --- | --- | --- |
| yes | no | `up-to-date` |
| yes | yes | `behind` |
| no | no | `customized` |
| no | yes | `conflict` |

Files where the pipeline has REMOVED the source (rare but possible) get `state: orphaned` — the template no longer exists upstream.

### Step 3: Show the drift report

Print:

```
Pipeline:          0.3.0 → 0.4.0 (1 minor version behind)
Manifest written:  2026-05-14
Last sync:         2026-06-01

| Path                                       | State        | Action proposed |
| ------------------------------------------ | ------------ | --------------- |
| .cursor/agents/role-conductor.md           | up-to-date   | (no action)     |
| .cursor/agents/role-reviewer.md            | behind       | update          |
| .cursor/rules/no-go-zones.mdc              | customized   | leave alone     |
| .github/workflows/ci.yml                   | conflict     | manual review   |
| .cursor/agents/role-architect.md           | up-to-date   | (no action)     |

Summary: 2 up-to-date · 1 behind · 1 customized · 1 conflict
```

### Step 4: Apply updates per file

For each `behind` and `conflict` artifact, use `AskQuestion` to ask:

For `behind` files (no user edits, pipeline has changes):
- **Update**: overwrite local file with pipeline source; bump manifest entry's `version` and `installed_hash`.
- **Skip this version**: leave local file alone; do NOT bump manifest version. (User will be re-asked next sync.)
- **Pin** (advanced): leave file alone AND bump manifest version. The artifact will appear up-to-date going forward; the user has chosen to diverge.

For `conflict` files (user edited locally, pipeline also changed):
- **Show diff first**: print the three views (manifest hash content unknown, current local file, pipeline source). Re-ask after viewing.
- **Accept pipeline (lose local edits)**: overwrite; update manifest.
- **Keep local**: leave file alone; do NOT bump manifest version. Will re-flag next sync.
- **Pin**: leave file alone AND bump version to suppress future flags.
- **Manual merge**: skill writes pipeline source to `<path>.pipeline-<version>` as a sibling file; user merges by hand. Manifest unchanged.

`customized` files: no question — leave alone. They're tracked as drift forever unless the user explicitly re-installs.

### Step 5: Handle pipeline-added artifacts

After processing the manifest, check if the pipeline has artifacts that AREN'T in the manifest (e.g. a new role file was added upstream). For each new template, ask:

- **Install**: write the file at the pipeline-suggested path; add to manifest.
- **Skip**: don't write; don't track. (User will be re-asked next sync.)

This handles cases like "agent-pipeline v0.4.0 added a `role-perf-auditor.md`" — existing consumers can opt in or skip.

### Step 6: Rewrite the manifest

Build a new `.agent-context-manifest.yml`:

- `pipeline_version` = current pipeline version.
- `last_synced_at` = ISO 8601 now.
- Each artifact's `version` and `installed_hash` reflect the post-sync state (updated for accepted files; unchanged for skipped).
- Preserve `installed_at` from the original manifest.
- Sort `artifacts` by `path` for deterministic diffs.

Write atomically: write to `<repo-root>/.agent-context-manifest.yml.new`, then `mv` over the original.

### Step 7: Hand off

Print a final summary:

```
Sync complete.

  Updated:     2 files
  Held back:   1 file (customized)
  Manual merge required: 1 file (see <path>.pipeline-0.4.0)
  Skipped:     0 files

Manifest is now at pipeline_version 0.4.0.

Next steps:
  1. Review the file changes (git diff).
  2. Resolve any `*.pipeline-<version>` manual-merge files.
  3. Commit the changes (including the updated manifest).
  4. Re-run sync any time; it's idempotent.
```

## Backward compatibility

- A repo at pipeline `0.2.0` running this skill against pipeline `0.3.0` works. The sync compares versions and proceeds.
- A repo with NO manifest gets the retroactive generation flow (Step 1b).
- A repo at pipeline `0.3.0` against an older pipeline checkout (e.g. user forgot to `git pull`) will report "you're AHEAD of the local pipeline checkout — pull the pipeline repo first." Don't downgrade.

## Failure modes to handle

| Symptom | Cause | Handling |
| --- | --- | --- |
| Symlink at `~/.cursor/skills/bootstrap-agent-context` is dead | User uninstalled or moved their pipeline checkout | Ask the user to point at the pipeline repo manually, OR run `update.sh` again |
| `shasum` not available | Stripped-down Linux container | Fall back to `sha256sum` (GNU coreutils); document if neither works |
| Manifest YAML is malformed | Hand-edited | Stop. Tell the user; offer to regenerate via retroactive flow |
| User has files in `.cursor/agents/` that aren't role-*.md | Custom agents added later | Leave them alone; they're not in the manifest, sync ignores them |
| Pipeline version is identical to manifest version BUT pipeline source hashes differ | Pipeline repo was edited locally without bumping version | Treat sources as canonical; show the diff and offer to update |

## Anti-patterns

- Forcing a "full re-install" → wrong, that's the bootstrap skill's job. Sync is incremental.
- Marking a `customized` file as `conflict` when the pipeline didn't change → wrong; `customized` is the user's choice and should stay invisible until pipeline actually changes too.
- Auto-merging a `conflict` → never. Conflicts ALWAYS go through user review.
- Bumping `pipeline_version` in the manifest without updating any artifacts → wrong; the version means "this manifest has been reconciled against pipeline at version X", so only bump after a successful sync of all `behind` items.
- Editing `installed_at` → never; it's the original install timestamp and never changes after Step 1 of bootstrap.

## What this skill does NOT do

- Does **not** install new layers (L0 → L1, etc.). Use `bootstrap-agent-context` for that.
- Does **not** commit, push, or run lint/build/test.
- Does **not** modify files outside the manifest's tracked paths (unless the user explicitly accepts the "install new artifact" path in Step 5).
- Does **not** update the pipeline repo itself. The user must `git pull` in the pipeline checkout (or run `update.sh`) before sync sees newer templates.

## Common pitfalls

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Sync says "0 behind" but you know there's a new release | Local pipeline checkout isn't pulled; sync compares against the checkout, not GitHub | `cd <pipeline-root> && git pull` then re-run sync |
| Every file shows as `customized` after a fresh install | Hashes computed at install time were wrong (e.g. trailing whitespace differences) | Regenerate manifest via Step 1b retroactive path |
| `.github/workflows/ci.yml` always conflicts | The bootstrap skill conditionally edits this file per-repo (lint script removal, branch pruning) and the user's tweaks compound | Mark it as `customized` early — this file is expected to drift |
