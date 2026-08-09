#!/bin/sh
# POST /api/sync/github — run inside the pipeline-analytics container or via Coolify scheduled task.
# Env: SYNC_TOKEN (required), HUB_URL (default http://127.0.0.1:3010), PORT (default 3010)

set -eu

PORT="${PORT:-3010}"
HUB="${HUB_URL:-http://127.0.0.1:${PORT}}"

if [ -z "${SYNC_TOKEN:-}" ]; then
  echo "SYNC_TOKEN not set" >&2
  exit 1
fi

echo "$(date -Iseconds) sync-github → ${HUB}/api/sync/github"
wget -qO- \
  --header="Authorization: Bearer ${SYNC_TOKEN}" \
  --post-data="" \
  "${HUB}/api/sync/github"
echo
