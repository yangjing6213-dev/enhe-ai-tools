#!/bin/sh
set -eu

APP_DIR="${APP_DIR:-/opt/enhe-ai-tools}"
COMPOSE_FILE="$APP_DIR/deploy/enhe-ai-tools/docker-compose.yml"
ENV_FILE="${ENHE_ENV_FILE:-$APP_DIR/deploy/enhe-ai-tools/.env}"
backup_file="${1:-}"

if [ "${RESTORE_ENHE_AI_TOOLS:-}" != "RESTORE_ENHE_AI_TOOLS" ]; then
  echo "Set RESTORE_ENHE_AI_TOOLS=RESTORE_ENHE_AI_TOOLS to confirm restore." >&2
  exit 1
fi
test -f "$ENV_FILE" || { echo "Missing env file: $ENV_FILE" >&2; exit 1; }
test -f "$backup_file" || { echo "Backup file not found: $backup_file" >&2; exit 1; }
test -f "$backup_file.sha256" || { echo "Checksum file not found." >&2; exit 1; }

set -a
. "$ENV_FILE"
set +a
: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"

cd "$APP_DIR"
(cd "$(dirname "$backup_file")" && sha256sum -c "$(basename "$backup_file").sha256")
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T db \
  pg_restore --list < "$backup_file" > /dev/null
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" stop \
  app seo-audit-worker seo-audit-scheduler
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T db \
  pg_restore --clean --if-exists --no-owner --no-privileges \
  -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$backup_file"
