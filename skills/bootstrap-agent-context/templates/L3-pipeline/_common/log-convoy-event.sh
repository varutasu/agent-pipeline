#!/usr/bin/env bash
# log-convoy-event.sh — append one convoy event to .convoys/.metrics.jsonl.
#
# Used by L2 roles to emit lightweight metrics for self-analytics.
# Schema: github.com/varutasu/agent-pipeline/analytics/schemas/convoy-event.json
#
# Usage:
#   bash scripts/log-convoy-event.sh role=role-conductor convoy=bookmark-badge \
#       classification=feature 'skip_flags=visual,smoke' duration_s=42 \
#       model=claude-4.6-opus-high-thinking model_tier=premium
#
# All args are key=value. Required: role, convoy.
# Optional: brief, classification, skip_flags (comma-separated), duration_s,
#           stack_class, outcome, multitask_group, model, model_tier,
#           estimated_cost_usd.
#
# multitask_group: cohort id when this role ran as part of a Cursor 3.2
# /multitask fan-out (e.g. 'audit-bookmark-badge-PR123'). Events sharing
# this id should be aggregated with max(duration_s), not sum, for wall-clock.
# See docs/multitask-playbook.md.
#
# model / model_tier: cost telemetry per docs/model-routing-policy.md.
#
# Privacy: this file is gitignored by default; events contain only metadata,
# no code or prompts. To opt-in to commit, remove `.convoys/.metrics.jsonl`
# from your `.gitignore`.
#
# Atomicity: concurrent invocations append safely because each python3
# subprocess writes one short JSON line via O_APPEND. POSIX guarantees
# writes <= PIPE_BUF are atomic on regular files opened with O_APPEND.
# Typical line size is 200-400 bytes; PIPE_BUF is 4096 on Linux and
# 512+ on macOS. Larger custom fields could break this — keep
# multitask_group <= 64 chars (matches the JSON schema).
#
# Portable across macOS bash 3.2 and Linux bash 4+; uses python3 (always
# present on macOS + most Linux) for safe JSON encoding.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
REPO_NAME="$(basename "$REPO_ROOT")"
METRICS_FILE="$REPO_ROOT/.convoys/.metrics.jsonl"
mkdir -p "$REPO_ROOT/.convoys"

# Pull values out of args without using associative arrays (bash 3.2 compat)
ROLE=""; CONVOY=""; BRIEF=""; CLASSIFICATION=""
SKIP_FLAGS=""; DURATION_S=""; STACK_CLASS=""; OUTCOME=""; MULTITASK_GROUP=""
MODEL=""; MODEL_TIER=""; ESTIMATED_COST_USD=""

for arg in "$@"; do
  k="${arg%%=*}"
  v="${arg#*=}"
  case "$k" in
    role)                 ROLE="$v" ;;
    convoy)               CONVOY="$v" ;;
    brief)                BRIEF="$v" ;;
    classification)       CLASSIFICATION="$v" ;;
    skip_flags)           SKIP_FLAGS="$v" ;;
    duration_s)           DURATION_S="$v" ;;
    stack_class)          STACK_CLASS="$v" ;;
    outcome)              OUTCOME="$v" ;;
    multitask_group)      MULTITASK_GROUP="$v" ;;
    model)                MODEL="$v" ;;
    model_tier)           MODEL_TIER="$v" ;;
    estimated_cost_usd)   ESTIMATED_COST_USD="$v" ;;
    *) echo "log-convoy-event: ignoring unknown arg '$k'" >&2 ;;
  esac
done

if [ -z "$ROLE" ] || [ -z "$CONVOY" ]; then
  echo "log-convoy-event: role and convoy are required" >&2
  echo "Usage: $0 role=<role> convoy=<slug> [classification=...] [skip_flags=a,b] [duration_s=N] [brief=N] [model=...] [model_tier=fast|premium|auto] [estimated_cost_usd=N]" >&2
  exit 1
fi

ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Build the event with python3 — handles all string escaping and array encoding
python3 - <<PY >> "$METRICS_FILE"
import json, sys
ev = {
    "ts": "$ts",
    "role": $(printf '%s' "$ROLE" | python3 -c 'import json,sys;print(json.dumps(sys.stdin.read()))'),
    "convoy": $(printf '%s' "$CONVOY" | python3 -c 'import json,sys;print(json.dumps(sys.stdin.read()))'),
    "repo": $(printf '%s' "$REPO_NAME" | python3 -c 'import json,sys;print(json.dumps(sys.stdin.read()))'),
    "skip_flags": [s for s in "$SKIP_FLAGS".split(",") if s],
}
if "$BRIEF":            ev["brief"] = int("$BRIEF")
if "$CLASSIFICATION":   ev["classification"] = "$CLASSIFICATION"
if "$DURATION_S":       ev["duration_s"] = int("$DURATION_S")
if "$STACK_CLASS":      ev["stack_class"] = "$STACK_CLASS"
if "$OUTCOME":          ev["outcome"] = "$OUTCOME"
if "$MULTITASK_GROUP":  ev["multitask_group"] = "$MULTITASK_GROUP"
if "$MODEL":            ev["model"] = "$MODEL"
if "$MODEL_TIER":       ev["model_tier"] = "$MODEL_TIER"
if "$ESTIMATED_COST_USD":
    ev["estimated_cost_usd"] = float("$ESTIMATED_COST_USD")
print(json.dumps(ev))
PY

echo "Logged: role=$ROLE convoy=$CONVOY → .convoys/.metrics.jsonl"
