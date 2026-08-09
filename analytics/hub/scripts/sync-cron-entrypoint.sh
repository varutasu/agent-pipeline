#!/bin/sh
# Sidecar entrypoint: run GitHub sync once at start, then every 6 hours via crond.

set -eu

apk add --no-cache curl

SYNC_SCRIPT=/sync-github.sh
cat > "$SYNC_SCRIPT" << 'EOF'
#!/bin/sh
set -eu
HUB="${HUB_URL:-http://pipeline-analytics:3010}"
if [ -z "${SYNC_TOKEN:-}" ]; then exit 1; fi
echo "$(date -Iseconds) pipeline-sync → ${HUB}/api/sync/github"
curl -sf -X POST -H "Authorization: Bearer ${SYNC_TOKEN}" "${HUB}/api/sync/github" || {
  echo "sync failed"
  exit 1
}
echo
EOF
chmod +x "$SYNC_SCRIPT"

# Initial sync after the hub healthcheck passes
"$SYNC_SCRIPT"

echo "0 */6 * * * $SYNC_SCRIPT >> /var/log/pipeline-sync.log 2>&1" > /etc/crontabs/root
chmod 644 /etc/crontabs/root

exec crond -f -l 2
