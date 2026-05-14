#!/usr/bin/env bash
# uninstall.sh — remove the symlinks installed by install.sh.
# Does NOT delete the cloned repo, the bootstrapped files in your projects,
# or your analytics data.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
SKILL_DEST="$HOME/.cursor/skills/bootstrap-agent-context"
SYNC_SKILL_DEST="$HOME/.cursor/skills/sync-agent-context"
RULE_DEST="$HOME/.cursor/rules/agent-context-bootstrap.mdc"
INSTALL_MARKER="$HOME/.agent-pipeline-install"

bold() { printf "\033[1m%s\033[0m\n" "$*"; }
ok()   { printf "  \033[32m✓\033[0m %s\n" "$*"; }
skip() { printf "  \033[33m○\033[0m %s\n" "$*"; }

bold "agent-pipeline uninstaller"
echo

# Remove skill symlink --------------------------------------------------------
bold "1. Skill symlink"
if [ -L "$SKILL_DEST" ]; then
  TARGET="$(readlink "$SKILL_DEST")"
  rm "$SKILL_DEST"
  ok "Removed: $SKILL_DEST → $TARGET"
elif [ -e "$SKILL_DEST" ]; then
  skip "Not a symlink at $SKILL_DEST — refusing to delete (you put something else there)"
else
  skip "Nothing at $SKILL_DEST"
fi

# Remove sync skill symlink ---------------------------------------------------
bold "2. Sync skill symlink"
if [ -L "$SYNC_SKILL_DEST" ]; then
  TARGET="$(readlink "$SYNC_SKILL_DEST")"
  rm "$SYNC_SKILL_DEST"
  ok "Removed: $SYNC_SKILL_DEST → $TARGET"
elif [ -e "$SYNC_SKILL_DEST" ]; then
  skip "Not a symlink at $SYNC_SKILL_DEST — refusing to delete (you put something else there)"
else
  skip "Nothing at $SYNC_SKILL_DEST"
fi

# Remove rule symlink ---------------------------------------------------------
bold "3. Rule symlink"
if [ -L "$RULE_DEST" ]; then
  TARGET="$(readlink "$RULE_DEST")"
  rm "$RULE_DEST"
  ok "Removed: $RULE_DEST → $TARGET"
elif [ -e "$RULE_DEST" ]; then
  skip "Not a symlink at $RULE_DEST — refusing to delete"
else
  skip "Nothing at $RULE_DEST"
fi

# Remove install marker -------------------------------------------------------
bold "4. Install marker"
if [ -f "$INSTALL_MARKER" ]; then
  rm "$INSTALL_MARKER"
  ok "Removed: $INSTALL_MARKER"
else
  skip "Nothing at $INSTALL_MARKER"
fi

echo
bold "Done."
echo
echo "Not removed (delete manually if desired):"
echo "  - The cloned repo at $REPO_ROOT"
echo "  - Files written into your project repos by the bootstrap skill"
echo "  - Analytics data at \$HOME/agent-pipeline-data/"
echo
echo "Restart Cursor so it stops loading the unlinked skill/rule."
