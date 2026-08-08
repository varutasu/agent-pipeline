#!/bin/sh
set -e
if [ -n "${DATABASE_URL:-}" ]; then
  echo "Running prisma migrate deploy..."
  npx prisma migrate deploy
fi
exec node server.js
