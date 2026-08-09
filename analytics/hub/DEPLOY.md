# Fleet analytics hub — deploy on Axiom homelab

Remote dashboard for convoy telemetry. **Postgres CT 102** · **Coolify CT 107** · **Traefik CT 100**.

**URL:** `https://pipeline.stillwell.cloud`

---

## Coolify setup (read this if deploy failed)

### Error: `Docker Compose file not found at: /analytics/hub/Dockerfile/docker-compose.yaml`

You pointed Coolify at the **Dockerfile** as the compose file. Coolify then looks for `docker-compose.yaml` *inside* that path.

**Fix:** use one of the two correct setups below. Delete the broken Coolify resource and recreate it.

### Important: branch

The hub is **not on `main` yet**. In Coolify set branch to:

`docs/walkthroughs-metrics-gate`

(or merge [PR #3](https://github.com/varutasu/agent-pipeline/pull/3) first, then use `main`).

---

## Option A — Docker Compose (recommended)

| Coolify field | Value |
| --- | --- |
| Resource type | **Docker Compose** |
| Repository | `https://github.com/varutasu/agent-pipeline` |
| Branch | `docs/walkthroughs-metrics-gate` |
| **Base Directory** | leave **empty** (repo root) |
| **Docker Compose location** | `docker-compose.pipeline-analytics.yml` |
| **NOT** | `analytics/hub/Dockerfile` |

| Coolify field | Value |
| --- | --- |
| Domains | `http://pipeline.stillwell.cloud` (HTTP only) |
| Port mappings | container `3010` → host `3010` (or map in Coolify UI) |

Add environment variables in Coolify (not a local `.env` file unless you use one):

```env
DATABASE_URL=postgresql://pipeline_analytics:YOUR_PASSWORD@192.168.68.102:5432/pipeline_analytics?schema=public&sslmode=disable
SYNC_TOKEN=<openssl rand -hex 32>
GITHUB_TOKEN=<PAT with contents:read on private repos>
SYNC_REPOS=stwl-labs/zest-finances:main,stwl-labs/deckhearth:main,rstillwell-trimb/colab:main
```

Deploy. Migrations run automatically on container start (`docker-entrypoint.sh`).

---

## Option B — Application + Dockerfile

| Coolify field | Value |
| --- | --- |
| Resource type | **Application** (not Docker Compose) |
| Build pack | **Dockerfile** |
| Base Directory | empty (repo root) |
| **Dockerfile location** | `analytics/hub/Dockerfile` |
| Port | `3010` |

Same env vars as Option A.

---

## Do NOT run `docker exec` on your Mac

The container runs on **CT 107** in the homelab. Your laptop has no Docker daemon (and no `pipeline-analytics` container).

Run commands on CT 107 via sync:

```bash
cd ~/Documents/Personal\ Coding\ Projects/axiom-server
./proxmox/scripts/sync.sh exec 107 "docker ps --format '{{.Names}}'"
./proxmox/scripts/sync.sh exec 107 "docker exec pipeline-analytics npx prisma migrate deploy"
```

Or use Coolify → Application → **Execute Command**.

---

## 1. Postgres (CT 102) — you already did this

```bash
./proxmox/scripts/sync.sh exec 102 "docker exec -i postgres psql -U postgres" < proxmox/ct102/init/02-pipeline-analytics.sql
```

---

## 2. Traefik (CT 100) — you already did this

```bash
./proxmox/scripts/sync.sh push-traefik
```

---

## 3. After deploy succeeds

```bash
# GitHub sync (from Mac — no docker needed)
curl -X POST https://pipeline.stillwell.cloud/api/sync/github \
  -H "Authorization: Bearer YOUR_SYNC_TOKEN"
```

Open `https://pipeline.stillwell.cloud` (Authentik admin).

### Scheduled GitHub sync

Pull metrics from GitHub on a schedule (`POST /api/sync/github`). Metrics must be
**committed** on the branch in `SYNC_REPOS` (default gitignore keeps them local).

**Option A — CT 107 host cron (works without redeploying Coolify)**

See `axiom-server/proxmox/ct107/scripts/README.md`. Runs every 6 hours via
`/opt/scripts/pipeline-analytics-sync.sh`.

**Option B — Coolify scheduled task**

Resource → Configuration → **Scheduled Tasks** → Add:

| Field | Value |
| --- | --- |
| Name | `github-metrics-sync` |
| Command | `/app/scripts/sync-github.sh` |
| Frequency | `0 */6 * * *` (every 6 hours) |
| Container | `pipeline-analytics` |
| Timeout | `300` |

Use **Execute Now** to test.

**Option C — `pipeline-sync` sidecar (compose)**

`docker-compose.pipeline-analytics.yml` includes a `pipeline-sync` service that runs
sync at start and every 6 hours. Redeploy in Coolify after merging. Remove CT 107 host
cron if you use the sidecar (avoid duplicate runs).

### Authentik (required once)

Traefik uses `authentik-admin` on this hostname. Without a forward-auth provider for
`https://pipeline.stillwell.cloud`, Authentik shows “not found, go home”.

From `axiom-server` (machine on the homelab LAN):

```bash
cd ~/Documents/Personal\ Coding\ Projects/axiom-server
scp proxmox/ct100/authentik-organize-apps.py root@192.168.68.73:/tmp/
ssh root@192.168.68.73 "pct push 100 /tmp/authentik-organize-apps.py /tmp/authentik-organize-apps.py && pct exec 100 -- docker cp /tmp/authentik-organize-apps.py authentik-server:/tmp/ && pct exec 100 -- docker exec authentik-server python3 /tmp/authentik-organize-apps.py"
```

Registers slug `pipeline` with **admin** tier (same as Umami). `/api/sync` skips Authentik via Traefik priority.

---

## Local development

```bash
cd analytics/hub
cp .env.example .env
npm install
npx prisma migrate dev
npm run dev
```

See also: `axiom-server/other/pipeline-analytics.yml`, `axiom-server/proxmox/AGENT-DEPLOY.md`.
