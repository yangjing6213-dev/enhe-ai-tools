#!/bin/sh
set -eu

APP_DIR="${APP_DIR:-/opt/enhe-ai-tools}"
COMPOSE_FILE="$APP_DIR/deploy/enhe-ai-tools/docker-compose.yml"
ENV_FILE="$APP_DIR/.env"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups/db}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

if [ ! -f "$ENV_FILE" ]; then
  echo "[enhe-backup-db] missing env file: $ENV_FILE" >&2
  exit 1
fi

set -a
. "$ENV_FILE"
set +a

mkdir -p "$BACKUP_DIR"
timestamp="$(date +%Y%m%d-%H%M%S)"
tmp_file="$BACKUP_DIR/enhe_ai_tools-$timestamp.sql.tmp"
backup_file="$BACKUP_DIR/enhe_ai_tools-$timestamp.sql.gz"

cd "$APP_DIR"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$tmp_file"
gzip -f "$tmp_file"
mv "$tmp_file.gz" "$backup_file"
find "$BACKUP_DIR" -type f -name 'enhe_ai_tools-*.sql.gz' -mtime +"$RETENTION_DAYS" -delete

echo "[enhe-backup-db] created $backup_file"
