# Install / update / uninstall

## Install

```bash
git clone https://github.com/varutasu/agent-pipeline.git ~/code/agent-pipeline
cd ~/code/agent-pipeline
./install.sh
```

Then **restart Cursor** so it picks up the new skill and rule.

The installer:

- Symlinks `skills/bootstrap-agent-context/` → `~/.cursor/skills/bootstrap-agent-context/`
- Symlinks `rules/agent-context-bootstrap.mdc` → `~/.cursor/rules/agent-context-bootstrap.mdc`
- Creates `~/agent-pipeline-data/` for analytics output (gitignored from your repos)
- Records the install location in `~/.agent-pipeline-install` for `update.sh` / `uninstall.sh`

It is **idempotent** — running it twice is fine. It refuses to overwrite existing non-symlink files at the destinations and prints what it skipped.

## Update

```bash
cd ~/code/agent-pipeline   # or wherever you cloned it
./update.sh
```

This runs `git pull --ff-only` against your default remote. Because installation uses symlinks, your `~/.cursor/skills/bootstrap-agent-context/` and `~/.cursor/rules/agent-context-bootstrap.mdc` automatically pick up the new content — no re-install needed.

If `git pull` would not be a fast-forward (you have local changes or upstream rewrote history), the script aborts and prints the conflict. Resolve manually.

## Uninstall

```bash
cd ~/code/agent-pipeline
./uninstall.sh
```

This removes only the symlinks the installer created. It does NOT delete:

- The cloned repo at `~/code/agent-pipeline/` — `rm -rf` it yourself if desired.
- Files written by the bootstrap skill into your project repos (those are committed to those repos and you own them).
- Analytics data at `~/agent-pipeline-data/` — `rm -rf` it yourself if desired.

## Where things go

| What | Symlink target |
| --- | --- |
| Skill | `~/.cursor/skills/bootstrap-agent-context` → `<repo>/skills/bootstrap-agent-context` |
| Global rule | `~/.cursor/rules/agent-context-bootstrap.mdc` → `<repo>/rules/agent-context-bootstrap.mdc` |
| Analytics output | `~/agent-pipeline-data/` (real directory, not symlinked) |
| Install record | `~/.agent-pipeline-install` (plain text path) |

Cursor reads from `~/.cursor/skills/` and `~/.cursor/rules/` automatically. Restart Cursor after installing or after any major template change.

## Verifying the install

Open Cursor, open any repo, and ask:

> *"What skills are available?"*

You should see `bootstrap-agent-context` in the list. If not:

1. Confirm `ls -la ~/.cursor/skills/bootstrap-agent-context` shows a valid symlink.
2. Confirm `cat ~/.cursor/rules/agent-context-bootstrap.mdc` returns content.
3. Restart Cursor.

## Troubleshooting

**"Refusing to overwrite existing file at ~/.cursor/skills/bootstrap-agent-context"** — you have a non-symlink there. Move it aside (`mv ~/.cursor/skills/bootstrap-agent-context ~/.cursor/skills/bootstrap-agent-context.bak`) and re-run `install.sh`.

**Skill doesn't appear in Cursor** — restart Cursor. If still missing, check Cursor's settings for "Skills directory" and confirm it's `~/.cursor/skills/`.

**`update.sh` aborts with "not a fast-forward"** — you have local commits or an out-of-band remote update. Run `git status` in the install dir; either commit/stash local changes and `git pull --rebase`, or move your local changes to a fork.
