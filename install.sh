#!/usr/bin/env bash
# install.sh — symlink the agent-pipeline skill + global rule into ~/.cursor/.
# Idempotent. Refuses to overwrite non-symlink files. macOS + Linux.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
SKILL_SRC="$REPO_ROOT/skills/bootstrap-agent-context"
RULE_SRC="$REPO_ROOT/rules/agent-context-bootstrap.mdc"

CURSOR_SKILLS_DIR="$HOME/.cursor/skills"
CURSOR_RULES_DIR="$HOME/.cursor/rules"
SKILL_DEST="$CURSOR_SKILLS_DIR/bootstrap-agent-context"
RULE_DEST="$CURSOR_RULES_DIR/agent-context-bootstrap.mdc"

ANALYTICS_DIR="$HOME/agent-pipeline-data"
INSTALL_MARKER="$HOME/.agent-pipeline-install"

bold()  { printf "\033[1m%s\033[0m\n" "$*"; }
ok()    { printf "  \033[32m✓\033[0m %s\n" "$*"; }
skip()  { printf "  \033[33m○\033[0m %s\n" "$*"; }
fail()  { printf "  \033[31m✗\033[0m %s\n" "$*" >&2; }

bold "agent-pipeline installer"
echo "  Repo:    $REPO_ROOT"
echo "  Version: $(cat "$REPO_ROOT/version.txt" 2>/dev/null || echo 'unknown')"
echo

# Sanity checks ---------------------------------------------------------------

if [ ! -d "$SKILL_SRC" ]; then
  fail "Skill source not found at $SKILL_SRC. Did you run this from the repo root?"
  exit 1
fi
if [ ! -f "$RULE_SRC" ]; then
  fail "Rule source not found at $RULE_SRC."
  exit 1
fi

mkdir -p "$CURSOR_SKILLS_DIR" "$CURSOR_RULES_DIR" "$ANALYTICS_DIR"

# Symlink the skill -----------------------------------------------------------

bold "1. Skill"
if [ -L "$SKILL_DEST" ]; then
  CURRENT_TARGET="$(readlink "$SKILL_DEST")"
  if [ "$CURRENT_TARGET" = "$SKILL_SRC" ]; then
    skip "Symlink already points to this repo: $SKILL_DEST"
  else
    rm "$SKILL_DEST"
    ln -s "$SKILL_SRC" "$SKILL_DEST"
    ok "Replaced symlink: $SKILL_DEST → $SKILL_SRC (was → $CURRENT_TARGET)"
  fi
elif [ -e "$SKILL_DEST" ]; then
  fail "Refusing to overwrite existing non-symlink at $SKILL_DEST"
  echo "       Move it aside ('mv $SKILL_DEST ${SKILL_DEST}.bak') and re-run."
  exit 1
else
  ln -s "$SKILL_SRC" "$SKILL_DEST"
  ok "Symlinked: $SKILL_DEST → $SKILL_SRC"
fi

# Symlink the global rule -----------------------------------------------------

bold "2. Global rule"
if [ -L "$RULE_DEST" ]; then
  CURRENT_TARGET="$(readlink "$RULE_DEST")"
  if [ "$CURRENT_TARGET" = "$RULE_SRC" ]; then
    skip "Symlink already points to this repo: $RULE_DEST"
  else
    rm "$RULE_DEST"
    ln -s "$RULE_SRC" "$RULE_DEST"
    ok "Replaced symlink: $RULE_DEST → $RULE_SRC (was → $CURRENT_TARGET)"
  fi
elif [ -e "$RULE_DEST" ]; then
  fail "Refusing to overwrite existing non-symlink at $RULE_DEST"
  echo "       Move it aside ('mv $RULE_DEST ${RULE_DEST}.bak') and re-run."
  exit 1
else
  ln -s "$RULE_SRC" "$RULE_DEST"
  ok "Symlinked: $RULE_DEST → $RULE_SRC"
fi

# Analytics directory ---------------------------------------------------------

bold "3. Analytics data directory"
if [ -d "$ANALYTICS_DIR" ]; then
  ok "Already exists: $ANALYTICS_DIR"
else
  mkdir -p "$ANALYTICS_DIR"
  ok "Created: $ANALYTICS_DIR"
fi

# Install marker --------------------------------------------------------------

bold "4. Install marker"
echo "$REPO_ROOT" > "$INSTALL_MARKER"
ok "Wrote $INSTALL_MARKER (used by update.sh + uninstall.sh)"

echo
bold "Done."
echo
echo "Next steps:"
echo "  1. Restart Cursor so it picks up the new skill + rule."
echo "  2. In any repo, ask Cursor: \"Bootstrap agent context for this repo.\""
echo "  3. After your first convoy runs, see 'analytics/README.md' for self-analytics."
echo
echo "To update later:    cd '$REPO_ROOT' && ./update.sh"
echo "To uninstall:       cd '$REPO_ROOT' && ./uninstall.sh"
