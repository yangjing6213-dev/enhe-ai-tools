#!/bin/sh
set -eu
umask 077

APP_DIR="${APP_DIR:-/opt/enhe-ai-tools}"
DB_CONTAINER="enhe-ai-tools-db"
EXPECTED_DB_VOLUME="enhe-ai-tools_enhe-ai-tools-postgres-data"
APP_CONTAINERS="enhe-ai-tools-seo-audit-worker enhe-ai-tools-seo-audit-scheduler enhe-ai-tools-app"
BACKUP_SCRIPT="$APP_DIR/deploy/enhe-ai-tools/scripts/enhe-backup-db.sh"
LOCK_HELPER="$APP_DIR/deploy/enhe-ai-tools/scripts/enhe-operation-lock.sh"
backup_file="${1:-}"
services_stopped=0
restore_complete=0
pre_restore_backup=""

report_restore_state() {
  if [ "$services_stopped" -eq 1 ] && [ "$restore_complete" -ne 1 ]; then
    echo "Database restore failed; application containers remain stopped." >&2
    if [ -n "$pre_restore_backup" ]; then
      echo "Pre-restore database state is preserved at: $pre_restore_backup" >&2
    fi
  fi
}

trap report_restore_state EXIT
trap 'exit 1' HUP INT TERM

if [ "${RESTORE_ENHE_AI_TOOLS:-}" != "RESTORE_ENHE_AI_TOOLS" ]; then
  echo "Set RESTORE_ENHE_AI_TOOLS=RESTORE_ENHE_AI_TOOLS to confirm restore." >&2
  exit 1
fi
test -f "$backup_file" || { echo "Backup file not found: $backup_file" >&2; exit 1; }
test -f "$backup_file.sha256" || { echo "Checksum file not found." >&2; exit 1; }
test -f "$BACKUP_SCRIPT" || { echo "Backup script not found: $BACKUP_SCRIPT" >&2; exit 1; }
test -f "$LOCK_HELPER" || { echo "Operation lock helper not found: $LOCK_HELPER" >&2; exit 1; }
. "$LOCK_HELPER"
acquire_enhe_operation_lock
if ! docker container inspect "$DB_CONTAINER" >/dev/null 2>&1; then
  echo "Database container not found: $DB_CONTAINER" >&2
  exit 1
fi
if ! docker volume inspect "$EXPECTED_DB_VOLUME" >/dev/null 2>&1; then
  echo "Required production database volume is missing: $EXPECTED_DB_VOLUME" >&2
  exit 1
fi
mounted_db_volume="$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Name}}{{end}}{{end}}' "$DB_CONTAINER")"
if [ "$mounted_db_volume" != "$EXPECTED_DB_VOLUME" ]; then
  echo "Refusing restore because the database container is not using the fixed production volume." >&2
  exit 1
fi

(cd "$(dirname "$backup_file")" && sha256sum -c "$(basename "$backup_file").sha256")
docker exec -i "$DB_CONTAINER" pg_restore --list < "$backup_file" > /dev/null

services_stopped=1
for container in $APP_CONTAINERS; do
  if docker container inspect "$container" >/dev/null 2>&1; then
    docker stop "$container" >/dev/null
  fi
done

pre_restore_backup="$(
  APP_DIR="$APP_DIR" \
  BACKUP_DIR="$APP_DIR/backups/pre-restore" \
  RETENTION_DAYS=90 \
  sh "$BACKUP_SCRIPT"
)"
test -f "$pre_restore_backup"
test -f "$pre_restore_backup.sha256"
(cd "$(dirname "$pre_restore_backup")" && sha256sum -c "$(basename "$pre_restore_backup").sha256")
docker exec -i "$DB_CONTAINER" pg_restore --list < "$pre_restore_backup" > /dev/null

docker exec -i "$DB_CONTAINER" sh <<'CONTAINER_SH'
set -eu
: "${POSTGRES_USER:?POSTGRES_USER is required in the database container}"
: "${POSTGRES_DB:?POSTGRES_DB is required in the database container}"
case "$POSTGRES_DB" in
  postgres|template0|template1)
    echo "Refusing to replace PostgreSQL maintenance database: $POSTGRES_DB" >&2
    exit 1
    ;;
esac

psql -v ON_ERROR_STOP=1 -v target_db="$POSTGRES_DB" \
  -U "$POSTGRES_USER" -d postgres <<'SQL'
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = :'target_db'
  AND pid <> pg_backend_pid();
SQL

dropdb --if-exists --force --username "$POSTGRES_USER" \
  --maintenance-db postgres "$POSTGRES_DB"
createdb --username "$POSTGRES_USER" --owner "$POSTGRES_USER" \
  --maintenance-db postgres "$POSTGRES_DB"
CONTAINER_SH

docker exec -i "$DB_CONTAINER" sh -lc \
  'exec pg_restore --exit-on-error --no-owner --no-privileges -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  < "$backup_file"

restore_complete=1
echo "Database restore completed; application containers remain stopped."
echo "Pre-restore database state retained at: $pre_restore_backup"
