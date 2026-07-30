#!/bin/sh
set -eu

APP_DIR="${APP_DIR:-/opt/enhe-ai-tools}"
COMPOSE_FILE="$APP_DIR/deploy/enhe-ai-tools/docker-compose.yml"
ENV_FILE="${ENHE_ENV_FILE:-$APP_DIR/deploy/enhe-ai-tools/.env}"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups/db}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

if [ ! -f "$ENV_FILE" ]; then
  echo "[enhe-backup-db] missing env file: $ENV_FILE" >&2
  exit 1
fi

set -a
. "$ENV_FILE"
set +a
: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"

mkdir -p "$BACKUP_DIR"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_file="$BACKUP_DIR/enhe-ai-tools-$timestamp.dump"
tmp_file="$backup_file.tmp"
trap 'rm -f "$tmp_file" "$tmp_file.sha256"' EXIT HUP INT TERM

cd "$APP_DIR"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T db \
  pg_dump --format=custom --no-owner --no-privileges \
  -U "$POSTGRES_USER" "$POSTGRES_DB" > "$tmp_file"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T db \
  pg_restore --list < "$tmp_file" > /dev/null
sha256sum "$tmp_file" | awk -v name="$(basename "$backup_file")" \
  '{ print $1 "  " name }' > "$tmp_file.sha256"
mv "$tmp_file" "$backup_file"
mv "$tmp_file.sha256" "$backup_file.sha256"
trap - EXIT HUP INT TERM

find "$BACKUP_DIR" -type f -name 'enhe-ai-tools-*.dump' -mtime +"$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -type f -name 'enhe-ai-tools-*.dump.sha256' -mtime +"$RETENTION_DAYS" -delete
echo "$backup_file"
