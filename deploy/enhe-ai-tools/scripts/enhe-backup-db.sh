#!/bin/sh
set -eu
umask 077

APP_DIR="${APP_DIR:-/opt/enhe-ai-tools}"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups/db}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
DB_CONTAINER="enhe-ai-tools-db"
LOCK_HELPER="$APP_DIR/deploy/enhe-ai-tools/scripts/enhe-operation-lock.sh"

test -f "$LOCK_HELPER" || { echo "Operation lock helper not found: $LOCK_HELPER" >&2; exit 1; }
. "$LOCK_HELPER"
acquire_enhe_operation_lock

if ! docker container inspect "$DB_CONTAINER" >/dev/null 2>&1; then
  echo "[enhe-backup-db] database container not found: $DB_CONTAINER" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
find "$BACKUP_DIR" -maxdepth 1 -type f \
  \( -name 'enhe-ai-tools-*.dump' -o -name 'enhe-ai-tools-*.dump.sha256' \) \
  -exec chmod 600 {} +
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
tmp_file="$(mktemp "$BACKUP_DIR/.enhe-ai-tools-$timestamp.XXXXXX")"
unique_suffix="${tmp_file##*.}"
backup_file="$BACKUP_DIR/enhe-ai-tools-$timestamp-$unique_suffix.dump"
trap 'rm -f "$tmp_file" "$tmp_file.sha256"' EXIT HUP INT TERM

docker exec "$DB_CONTAINER" sh -lc \
  'exec pg_dump --format=custom --no-owner --no-privileges -U "$POSTGRES_USER" "$POSTGRES_DB"' \
  > "$tmp_file"
docker exec -i "$DB_CONTAINER" pg_restore --list < "$tmp_file" > /dev/null
sha256sum "$tmp_file" | awk -v name="$(basename "$backup_file")" \
  '{ print $1 "  " name }' > "$tmp_file.sha256"
mv "$tmp_file" "$backup_file"
mv "$tmp_file.sha256" "$backup_file.sha256"
chmod 600 "$backup_file" "$backup_file.sha256"
trap - EXIT HUP INT TERM

find "$BACKUP_DIR" -type f -name 'enhe-ai-tools-*.dump' -mtime +"$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -type f -name 'enhe-ai-tools-*.dump.sha256' -mtime +"$RETENTION_DAYS" -delete
echo "$backup_file"
