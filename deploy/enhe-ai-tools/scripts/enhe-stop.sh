#!/bin/sh
set -eu

APP_DIR="${APP_DIR:-/opt/enhe-ai-tools}"
COMPOSE_FILE="$APP_DIR/deploy/enhe-ai-tools/docker-compose.yml"
ENV_FILE="${ENHE_ENV_FILE:-$APP_DIR/deploy/enhe-ai-tools/.env}"

test -f "$ENV_FILE" || { echo "Missing env file: $ENV_FILE" >&2; exit 1; }
cd "$APP_DIR"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" down
