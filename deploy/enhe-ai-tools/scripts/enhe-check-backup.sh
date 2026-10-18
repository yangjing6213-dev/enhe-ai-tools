#!/bin/sh
set -eu

APP_DIR="${APP_DIR:-/opt/enhe-ai-tools}"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups/db}"
MAX_BACKUP_AGE_SECONDS="${MAX_BACKUP_AGE_SECONDS:-93600}"
case "$MAX_BACKUP_AGE_SECONDS" in
  ''|*[!0-9]*) echo '[enhe-backup-status] invalid age limit' >&2; exit 1 ;;
esac

latest="$(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'enhe-ai-tools-*.dump.sha256' -printf '%T@ %f\n' 2>/dev/null | sort -nr | head -n 1 | cut -d ' ' -f 2-)"
if [ -z "$latest" ] || [ ! -s "$BACKUP_DIR/${latest%.sha256}" ]; then
  echo '[enhe-backup-status] no complete backup found' >&2
  exit 1
fi

# The writer publishes its checksum only after pg_restore --list succeeds.
# Hash verification detects damaged archives without restoring business data.
if ! (cd "$BACKUP_DIR" && sha256sum -c "$latest" >/dev/null 2>&1); then
  echo '[enhe-backup-status] latest backup checksum failed' >&2
  exit 1
fi
created="$(stat -c %Y "$BACKUP_DIR/${latest%.sha256}")"
age=$(( $(date +%s) - created ))
if [ "$age" -lt 0 ] || [ "$age" -gt "$MAX_BACKUP_AGE_SECONDS" ]; then
  echo "[enhe-backup-status] backup stale or timestamp invalid: ageSeconds=$age limitSeconds=$MAX_BACKUP_AGE_SECONDS" >&2
  exit 1
fi
echo "[enhe-backup-status] ok ageSeconds=$age"
