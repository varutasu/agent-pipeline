#!/usr/bin/env bash
# wt.sh — DEPRECATED in Cursor 3.2+.
#
# Cursor 3.2 (Apr 24, 2026) added native worktree management to the
# Agents Window with one-click foregrounding. Use that instead:
# https://cursor.com/docs/configuration/worktrees
#
# This stub is kept for two reasons:
#   1. Pre-3.2 users who haven't upgraded yet.
#   2. Scripted / CI worktree creation outside the IDE.
#
# To create a worktree manually:
#   git worktree add -b brief/<convoy>/<N>-<title> \
#       "$(dirname "$(git rev-parse --show-toplevel)")/$(basename "$(git rev-parse --show-toplevel)")-worktrees/brief-<N>-<title>" \
#       develop
#
# See docs/multitask-playbook.md for when to spin up worktrees vs.
# running implementers in the same checkout.

set -euo pipefail

cat <<'EOF' >&2
wt.sh: deprecated. In Cursor 3.2+ use the Agents Window worktree UI.

Why this is deprecated:
  - Cursor 3.2 worktrees integrate with subagent runs and one-click foreground.
  - The legacy script duplicates that feature without the integration.

What to do instead:
  - In Cursor: open Agents Window → "New worktree" → pick brief branch.
  - For CI / scripted use: run `git worktree add` directly.

Reference: docs/multitask-playbook.md (worktrees section)
           https://cursor.com/changelog/04-24-26
EOF

exit 0
