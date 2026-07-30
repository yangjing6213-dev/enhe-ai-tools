#!/bin/sh
set -eu

APP_DIR="${APP_DIR:-/opt/enhe-ai-tools}"
COMPOSE_FILE="$APP_DIR/deploy/enhe-ai-tools/docker-compose.yml"
ENV_FILE="${ENHE_ENV_FILE:-$APP_DIR/deploy/enhe-ai-tools/.env}"

test -f "$ENV_FILE" || { echo "Missing env file: $ENV_FILE" >&2; exit 1; }
set -a
. "$ENV_FILE"
set +a
: "${ADMIN_BOOTSTRAP_EMAIL:?ADMIN_BOOTSTRAP_EMAIL is required}"
: "${ADMIN_BOOTSTRAP_PASSWORD:?ADMIN_BOOTSTRAP_PASSWORD is required}"
: "${ADMIN_BOOTSTRAP_CONFIRM:?ADMIN_BOOTSTRAP_CONFIRM is required}"

cd "$APP_DIR"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" run --rm \
  -e ADMIN_BOOTSTRAP_EMAIL -e ADMIN_BOOTSTRAP_PASSWORD -e ADMIN_BOOTSTRAP_CONFIRM \
  app node prisma/ensure-super-admin.js
