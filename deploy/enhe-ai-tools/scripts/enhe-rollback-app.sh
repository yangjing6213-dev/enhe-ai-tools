#!/bin/sh
set -eu

APP_DIR="${APP_DIR:-/opt/enhe-ai-tools}"
COMPOSE_FILE="$APP_DIR/deploy/enhe-ai-tools/docker-compose.yml"
ENV_FILE="${ENHE_ENV_FILE:-$APP_DIR/deploy/enhe-ai-tools/.env}"

if [ "${ROLLBACK_ENHE_AI_TOOLS:-}" != "ROLLBACK_ENHE_AI_TOOLS" ]; then
  echo "Set ROLLBACK_ENHE_AI_TOOLS=ROLLBACK_ENHE_AI_TOOLS to confirm rollback." >&2
  exit 1
fi
: "${ROLLBACK_IMAGE:?ROLLBACK_IMAGE must be the prior 40-character release ref}"
case "$ROLLBACK_IMAGE" in
  *[!0-9a-fA-F]*)
    echo "ROLLBACK_IMAGE must be exactly 40 hexadecimal characters." >&2
    exit 1
    ;;
esac
if [ "${#ROLLBACK_IMAGE}" -ne 40 ]; then
  echo "ROLLBACK_IMAGE must be exactly 40 hexadecimal characters." >&2
  exit 1
fi
test -f "$ENV_FILE" || { echo "Missing env file: $ENV_FILE" >&2; exit 1; }

export RELEASE_REF="$ROLLBACK_IMAGE"
cd "$APP_DIR"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d \
  --no-build --force-recreate app seo-audit-worker seo-audit-scheduler
