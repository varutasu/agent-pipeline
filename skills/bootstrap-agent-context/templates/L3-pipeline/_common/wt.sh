#!/usr/bin/env bash
# wt.sh — Worktree helper for parallel implementer briefs.
#
# Usage:
#   ./scripts/wt.sh new <brief-number> <brief-title>   Create worktree for a brief
#   ./scripts/wt.sh list                                List active worktrees
#   ./scripts/wt.sh clean <brief-number>                Remove a worktree
#   ./scripts/wt.sh clean-all                           Remove all worktrees
#
# Worktrees live at ../<repo>-worktrees/brief-<N>-<title>/
# and check out a branch named brief/<convoy>/<N>-<title>.
#
# This is OPTIONAL — Cursor's parallel chats handle most concurrency.
# Use worktrees when you want full filesystem isolation per implementer
# (e.g. ones that touch overlapping config files or run conflicting watch processes).

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
REPO_NAME="$(basename "$REPO_ROOT")"
WORKTREE_BASE="$(dirname "$REPO_ROOT")/${REPO_NAME}-worktrees"
DEFAULT_BASE_BRANCH="${WT_BASE_BRANCH:-develop}"

usage() {
  sed -n '2,18p' "$0" | sed 's/^# \?//'
  exit 1
}

new() {
  local n="${1:-}" title="${2:-}"
  [ -z "$n" ] || [ -z "$title" ] && { echo "Error: brief number and title required" >&2; usage; }

  local convoy
  convoy="$(basename "$(pwd)")"
  if [ -d ".convoys" ]; then
    convoy="$(ls .convoys/*.md 2>/dev/null | head -1 | xargs -n1 basename | sed 's/\.md$//')"
    [ -z "$convoy" ] && convoy="adhoc"
  fi

  local branch="brief/${convoy}/${n}-${title}"
  local wt_path="${WORKTREE_BASE}/brief-${n}-${title}"

  mkdir -p "$WORKTREE_BASE"
  echo "Creating worktree:"
  echo "  branch: $branch"
  echo "  path:   $wt_path"
  echo "  base:   $DEFAULT_BASE_BRANCH"

  git worktree add -b "$branch" "$wt_path" "$DEFAULT_BASE_BRANCH"

  echo ""
  echo "Done. Open it with:"
  echo "  cd \"$wt_path\""
  echo "  cursor ."
}

list() {
  git worktree list
}

clean() {
  local n="${1:-}"
  [ -z "$n" ] && { echo "Error: brief number required" >&2; usage; }

  local match
  match="$(git worktree list --porcelain | grep -E "worktree .*brief-${n}-" | sed 's|worktree ||' | head -1)"
  [ -z "$match" ] && { echo "No worktree found for brief $n" >&2; exit 1; }

  echo "Removing worktree: $match"
  git worktree remove "$match"
  echo "Done. Branch is preserved — delete with: git branch -D <branch>"
}

clean_all() {
  echo "Listing brief worktrees:"
  git worktree list --porcelain | grep -E "worktree .*-worktrees/brief-" | sed 's|worktree ||' || true
  echo ""
  read -p "Remove all of them? [y/N] " -n 1 -r
  echo
  [[ ! $REPLY =~ ^[Yy]$ ]] && { echo "Aborted."; exit 0; }

  git worktree list --porcelain | grep -E "worktree .*-worktrees/brief-" | sed 's|worktree ||' | while read -r p; do
    git worktree remove "$p" || true
  done
  echo "Done."
}

case "${1:-}" in
  new) shift; new "$@" ;;
  list) list ;;
  clean) shift; clean "$@" ;;
  clean-all) clean_all ;;
  *) usage ;;
esac
