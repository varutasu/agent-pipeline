#!/usr/bin/env bash
# update.sh — git pull --ff-only against the default remote.
# Symlinks pick up new content automatically; no re-install needed.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO_ROOT"

bold() { printf "\033[1m%s\033[0m\n" "$*"; }
ok()   { printf "  \033[32m✓\033[0m %s\n" "$*"; }
fail() { printf "  \033[31m✗\033[0m %s\n" "$*" >&2; }

bold "agent-pipeline updater"
echo "  Repo:    $REPO_ROOT"
echo "  Branch:  $(git rev-parse --abbrev-ref HEAD)"
echo "  Version: $(cat version.txt 2>/dev/null || echo 'unknown')"
echo

# Refuse if there are local changes
if ! git diff --quiet || ! git diff --cached --quiet; then
  fail "Local changes detected. Commit, stash, or revert before updating."
  echo "       'git status' to see what changed."
  exit 1
fi

bold "Fetching"
git fetch --quiet
ok "Fetched"

bold "Fast-forward pulling"
if git pull --ff-only --quiet; then
  ok "Up to date"
else
  fail "Not a fast-forward. Local commits or upstream rewrote history."
  echo "       Resolve manually: 'git status', then 'git pull --rebase' or move work to a fork."
  exit 1
fi

NEW_VERSION="$(cat version.txt 2>/dev/null || echo 'unknown')"
echo
bold "Done. Now at version $NEW_VERSION."
echo "  Symlinks update automatically — no re-install needed."
echo "  Restart Cursor if templates or SKILL.md changed substantively."
