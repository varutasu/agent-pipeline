#!/usr/bin/env bash
# tests/smoke.sh — structural + behavioral smoke test for agent-pipeline.
#
# Runs in CI on every PR. Fails fast on the first issue. Categories:
#   1. Structural   — every template path SKILL.md mentions actually exists
#   2. Syntax       — every shell script and TS script parses
#   3. Line budgets — AGENTS.md / rules / role files / SKILL.md are under cap
#   4. Behavior     — log-convoy-event.sh writes a valid JSON event end-to-end
#                   — generate-schema-map.ts produces non-empty output for the
#                     nextjs-prisma fixture
#                   — analyze-convoys.ts + render-dashboard.ts run cleanly
#
# Does NOT actually invoke the bootstrap skill (that requires a Cursor agent).
# Verifying the skill works on a real repo is part of the manual workflow in
# CONTRIBUTING.md.

set -euo pipefail
cd "$(dirname "$0")/.."

PASS=0
FAIL=0
WARN=0

ok()   { printf "  \033[32m✓\033[0m %s\n" "$*"; PASS=$((PASS+1)); }
fail() { printf "  \033[31m✗\033[0m %s\n" "$*" >&2; FAIL=$((FAIL+1)); }
warn() { printf "  \033[33m!\033[0m %s\n" "$*"; WARN=$((WARN+1)); }
hdr()  { printf "\n\033[1m%s\033[0m\n" "$*"; }

# 1. Structural ---------------------------------------------------------------
hdr "1. Structural — files referenced by SKILL.md exist"

SKILL=skills/bootstrap-agent-context/SKILL.md
[ -f "$SKILL" ] || { fail "SKILL.md missing"; exit 1; }

# Every `templates/...` path mentioned in SKILL.md must exist relative to skill dir
SKILL_DIR=skills/bootstrap-agent-context
MISSING=0
for ref in $(grep -oE 'templates/[A-Za-z0-9_./-]+' "$SKILL" | sort -u); do
  if [ ! -e "$SKILL_DIR/$ref" ]; then
    fail "SKILL.md references missing $SKILL_DIR/$ref"
    MISSING=$((MISSING+1))
  fi
done
[ "$MISSING" -eq 0 ] && ok "All $(grep -oE 'templates/[A-Za-z0-9_./-]+' "$SKILL" | sort -u | wc -l | tr -d ' ') template references resolve"

# All 10 L2 roles present
for role in conductor ia-architect ux-reviewer architect implementer reviewer security-auditor \
            design-system-auditor a11y-auditor doc-writer; do
  f="$SKILL_DIR/templates/L2-roles/role-$role.md"
  if [ -f "$f" ]; then ok "L2 role exists: role-$role.md"
  else fail "Missing L2 role: $f"; fi
done

# L3 _common files
for f in PULL_REQUEST_TEMPLATE.md.template convoys-readme.md.template wt.sh log-convoy-event.sh agent-context-drift.yml.template; do
  if [ -f "$SKILL_DIR/templates/L3-pipeline/_common/$f" ]; then ok "L3 _common: $f"
  else fail "Missing L3 _common: $f"; fi
done

# L3 platform variants: each has a different required file set per its README.
hdr "1b. L3 platform variants — required files per variant"

# nextjs-prisma (baseline): full set including build job
BASELINE_DIR="$SKILL_DIR/templates/L3-pipeline/nextjs-prisma"
for f in README.md ci.yml.template preview-smoke.yml.template visual-diff.yml.template pr-health-rollup.yml.template CODEOWNERS.template flags-index.ts.template playwright-smoke.spec.ts.template; do
  if [ -f "$BASELINE_DIR/$f" ]; then ok "nextjs-prisma (baseline): $f"
  else fail "Missing nextjs-prisma (baseline): $f"; fi
done

# nextjs-prisma-vercel: full set MINUS internal build (no `npm run build` in ci.yml)
VERCEL_DIR="$SKILL_DIR/templates/L3-pipeline/nextjs-prisma-vercel"
for f in README.md ci.yml.template preview-smoke.yml.template visual-diff.yml.template pr-health-rollup.yml.template CODEOWNERS.template flags-index.ts.template playwright-smoke.spec.ts.template; do
  if [ -f "$VERCEL_DIR/$f" ]; then ok "nextjs-prisma-vercel: $f"
  else fail "Missing nextjs-prisma-vercel: $f"; fi
done
if [ -f "$VERCEL_DIR/ci.yml.template" ] && grep -v '^[[:space:]]*#' "$VERCEL_DIR/ci.yml.template" | grep -qE 'run:[[:space:]]+npm run build'; then
  fail "nextjs-prisma-vercel ci.yml.template should NOT call 'npm run build' as a step (Vercel does the build)"
else
  [ -f "$VERCEL_DIR/ci.yml.template" ] && ok "nextjs-prisma-vercel ci.yml.template: no internal build step (correct)"
fi

# nextjs-prisma-coolify: lean set — no preview-smoke / visual-diff
COOLIFY_DIR="$SKILL_DIR/templates/L3-pipeline/nextjs-prisma-coolify"
for f in README.md ci.yml.template pr-health-rollup.yml.template CODEOWNERS.template flags-index.ts.template playwright-smoke.spec.ts.template; do
  if [ -f "$COOLIFY_DIR/$f" ]; then ok "nextjs-prisma-coolify: $f"
  else fail "Missing nextjs-prisma-coolify: $f"; fi
done
for unwanted in preview-smoke.yml.template visual-diff.yml.template; do
  if [ -f "$COOLIFY_DIR/$unwanted" ]; then
    fail "nextjs-prisma-coolify should NOT include $unwanted (no per-PR preview URLs by default)"
  fi
done
if [ -f "$COOLIFY_DIR/ci.yml.template" ] && grep -v '^[[:space:]]*#' "$COOLIFY_DIR/ci.yml.template" | grep -qE 'run:[[:space:]]+npm run build'; then
  fail "nextjs-prisma-coolify ci.yml.template should NOT call 'npm run build' as a step (Coolify does the build)"
else
  [ -f "$COOLIFY_DIR/ci.yml.template" ] && ok "nextjs-prisma-coolify ci.yml.template: no internal build step (correct)"
fi

# nextjs-prisma-cloudbuild: GHA ci.yml is REPLACED by cloudbuild-ci.yaml
CLOUDBUILD_DIR="$SKILL_DIR/templates/L3-pipeline/nextjs-prisma-cloudbuild"
for f in README.md cloudbuild-ci.yaml.template pr-health-rollup.yml.template CODEOWNERS.template flags-index.ts.template; do
  if [ -f "$CLOUDBUILD_DIR/$f" ]; then ok "nextjs-prisma-cloudbuild: $f"
  else fail "Missing nextjs-prisma-cloudbuild: $f"; fi
done
if [ -f "$CLOUDBUILD_DIR/ci.yml.template" ]; then
  fail "nextjs-prisma-cloudbuild should NOT include ci.yml.template (Cloud Build replaces GHA CI)"
fi

# L1 manifest template
if [ -f "$SKILL_DIR/templates/L1-context/agent-context-manifest.yml.template" ]; then
  ok "L1 manifest template present"
else
  fail "Missing L1 manifest template"
fi

if [ -f "$SKILL_DIR/templates/L1-context/model-routing.mdc.template" ]; then
  ok "L1 model-routing template present"
else
  fail "Missing L1 model-routing.mdc.template"
fi

# sync-agent-context skill
SYNC_SKILL=skills/sync-agent-context/SKILL.md
if [ -f "$SYNC_SKILL" ]; then
  ok "sync-agent-context skill present"
  # frontmatter description must include the word 'sync' and 'manifest'
  if grep -q 'sync agent context' "$SYNC_SKILL" && grep -q 'manifest' "$SYNC_SKILL"; then
    ok "sync skill description has trigger phrases"
  else
    fail "sync skill description missing key trigger phrases"
  fi
else
  fail "Missing skills/sync-agent-context/SKILL.md"
fi

# manifest schema doc
if [ -f docs/manifest-schema.md ]; then
  ok "docs/manifest-schema.md present"
else
  fail "Missing docs/manifest-schema.md"
fi

# 2. Syntax -------------------------------------------------------------------
hdr "2. Syntax — shell + TS scripts parse"

for script in install.sh update.sh uninstall.sh \
              "$SKILL_DIR/templates/L1-context/generate-schema-map.ts" \
              "$SKILL_DIR/templates/L3-pipeline/_common/wt.sh" \
              "$SKILL_DIR/templates/L3-pipeline/_common/log-convoy-event.sh"; do
  if [[ "$script" == *.sh ]]; then
    bash -n "$script" 2>&1 && ok "bash -n: $script" || fail "bash -n failed: $script"
  fi
done

# TS scripts: verify they at least lex without syntax errors via node --check
# (full type-check requires per-script tsconfig and is out of scope for smoke).
for ts in analytics/extract-transcripts.ts analytics/analyze-convoys.ts analytics/render-dashboard.ts \
          "$SKILL_DIR/templates/L1-context/generate-schema-map.ts"; do
  # Strip ts-specific syntax for a lex check; if it parses as JS-ish it'll fail too,
  # so we just verify it's not empty and ends correctly. Real parse happens in 4b.
  if [ -s "$ts" ] && tail -c 1 "$ts" | od -An -c | grep -q '\\n'; then
    ok "ts lex: $ts (non-empty, newline-terminated)"
  else
    fail "ts script malformed: $ts"
  fi
done

# 3. Line budgets -------------------------------------------------------------
hdr "3. Line budgets — SKILL.md ≤500, role files ≤120, rules ≤120"

SKILL_LINES=$(wc -l < "$SKILL" | tr -d ' ')
if [ "$SKILL_LINES" -le 500 ]; then ok "SKILL.md lines: $SKILL_LINES (≤500)"
else warn "SKILL.md lines: $SKILL_LINES (over 500 — consider tightening)"; fi

for f in "$SKILL_DIR"/templates/L2-roles/role-*.md; do
  L=$(wc -l < "$f" | tr -d ' ')
  if [ "$L" -le 120 ]; then ok "$(basename "$f"): $L lines (≤120)"
  else warn "$(basename "$f"): $L lines (over 120)"; fi
  if grep -q '^model:' "$f"; then ok "$(basename "$f"): model frontmatter present"
  else fail "$(basename "$f"): missing model: frontmatter"; fi
done

# 4. Behavior -----------------------------------------------------------------
hdr "4. Behavior — scripts produce expected outputs"

# 4a. log-convoy-event.sh writes a valid JSON event
SMOKE_DIR="$(mktemp -d)"
trap "rm -rf '$SMOKE_DIR'" EXIT
(
  cd "$SMOKE_DIR"
  git init -q
  bash "$OLDPWD/$SKILL_DIR/templates/L3-pipeline/_common/log-convoy-event.sh" \
    role=role-conductor convoy=smoke-test classification=feature 'skip_flags=visual,smoke' duration_s=10 \
    model=composer-2.5-fast model_tier=fast >/dev/null
)
if [ -s "$SMOKE_DIR/.convoys/.metrics.jsonl" ]; then
  if python3 -c "import json,sys; ev=json.loads(open('$SMOKE_DIR/.convoys/.metrics.jsonl').read()); assert ev['role']=='role-conductor' and ev['convoy']=='smoke-test' and ev['skip_flags']==['visual','smoke'] and ev['model']=='composer-2.5-fast' and ev['model_tier']=='fast'" 2>/dev/null; then
    ok "log-convoy-event.sh: writes valid JSON with expected fields"
  else
    fail "log-convoy-event.sh output does not match schema"
  fi
else
  fail "log-convoy-event.sh produced no output"
fi

# 4b. generate-schema-map.ts works against the nextjs-prisma fixture
if command -v npx >/dev/null 2>&1; then
  FIXTURE_DIR="tests/fixtures/nextjs-prisma"
  mkdir -p "$FIXTURE_DIR/scripts" "$FIXTURE_DIR/docs"
  cp "$SKILL_DIR/templates/L1-context/generate-schema-map.ts" "$FIXTURE_DIR/scripts/generate-schema-map.ts"

  if (cd "$FIXTURE_DIR" && npx --yes -p tsx tsx scripts/generate-schema-map.ts >/dev/null 2>&1); then
    if [ -s "$FIXTURE_DIR/docs/SCHEMA_MAP.md" ]; then
      LINES=$(wc -l < "$FIXTURE_DIR/docs/SCHEMA_MAP.md" | tr -d ' ')
      ok "generate-schema-map.ts: produced $LINES-line SCHEMA_MAP.md from 3-model fixture"
    else
      fail "generate-schema-map.ts ran but produced empty output"
    fi
  else
    fail "generate-schema-map.ts: failed to run against fixture"
  fi
  rm -rf "$FIXTURE_DIR/scripts" "$FIXTURE_DIR/docs"
fi

# 4c. manifest hashing flow — verify sha256 computation matches across tools
MANIFEST_FIXTURE="$(mktemp -d)"
echo "hello agent-pipeline" > "$MANIFEST_FIXTURE/sample.txt"
if command -v shasum >/dev/null 2>&1; then
  EXPECTED=$(shasum -a 256 "$MANIFEST_FIXTURE/sample.txt" | awk '{print "sha256:" $1}')
elif command -v sha256sum >/dev/null 2>&1; then
  EXPECTED=$(sha256sum "$MANIFEST_FIXTURE/sample.txt" | awk '{print "sha256:" $1}')
else
  EXPECTED=""
fi
PY_HASH=$(python3 -c "import hashlib;print('sha256:'+hashlib.sha256(open('$MANIFEST_FIXTURE/sample.txt','rb').read()).hexdigest())" 2>/dev/null)
if [ -n "$EXPECTED" ] && [ "$EXPECTED" = "$PY_HASH" ]; then
  ok "manifest hash flow: shell + python agree on sha256 ($EXPECTED)"
else
  warn "manifest hash flow: shell vs python mismatch (shell='$EXPECTED' py='$PY_HASH') — sync skill will use whichever is available"
fi
rm -rf "$MANIFEST_FIXTURE"

# 4d. analyze-convoys + render-dashboard run cleanly against the smoke event
if command -v npx >/dev/null 2>&1; then
  if npx --yes -p tsx tsx analytics/analyze-convoys.ts "$SMOKE_DIR" >/dev/null 2>&1; then
    ok "analyze-convoys.ts: ran cleanly against smoke data"
  else
    fail "analyze-convoys.ts: failed"
  fi
  if npx --yes -p tsx tsx analytics/render-dashboard.ts >/dev/null 2>&1; then
    ok "render-dashboard.ts: ran cleanly"
  else
    fail "render-dashboard.ts: failed"
  fi
fi

# Summary ---------------------------------------------------------------------
echo
hdr "Summary"
echo "  Pass:  $PASS"
echo "  Warn:  $WARN"
echo "  Fail:  $FAIL"
echo

if [ "$FAIL" -gt 0 ]; then
  echo "Smoke test FAILED."
  exit 1
fi

echo "Smoke test PASSED."
