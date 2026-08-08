#!/bin/sh
# Do not use set -e — a failed migrate should not block the process from starting
# (Coolify will restart forever if the container exits before the healthcheck passes).

if [ -n "${DATABASE_URL:-}" ]; then
  echo "Running prisma migrate deploy..."
  if ./node_modules/.bin/prisma migrate deploy --schema ./prisma/schema.prisma; then
    echo "Prisma migrations applied."
  else
    echo "WARNING: prisma migrate deploy failed."
    echo "  Check DATABASE_URL, password, and that CT 107 can reach 192.168.68.102:5432"
    echo "  Try adding ?sslmode=disable to DATABASE_URL for homelab Postgres."
  fi
else
  echo "WARNING: DATABASE_URL is not set — skipping migrations."
fi

exec node server.js
