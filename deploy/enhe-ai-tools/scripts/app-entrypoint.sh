#!/bin/sh
set -eu

cd /app

if [ "${RUN_PRISMA_MIGRATE:-0}" = "1" ]; then
  echo "[enhe-ai-tools] Prisma migrate deploy explicitly enabled by RUN_PRISMA_MIGRATE=1."
  npx prisma migrate deploy
else
  echo "[enhe-ai-tools] Prisma migrate deploy skipped because RUN_PRISMA_MIGRATE is not set to 1."
fi

if [ "${ENSURE_SUPER_ADMIN:-0}" = "1" ]; then
  echo "[enhe-ai-tools] ensuring super admin account (explicitly enabled)..."
  node prisma/ensure-super-admin.js
else
  echo "[enhe-ai-tools] skip super admin upsert (ENSURE_SUPER_ADMIN is not 1)."
fi

echo "[enhe-ai-tools] starting Next.js server on port 3000..."
exec node server.js
