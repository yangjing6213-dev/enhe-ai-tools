#!/bin/sh
set -eu

APP_DIR="${APP_DIR:-/opt/enhe-ai-tools}"
CRON_MARKER="enhe-ai-tools launch operations"
BACKUP_LOG="$APP_DIR/backups/backup.log"
HEALTH_LOG="$APP_DIR/backups/health-watch.log"

mkdir -p "$APP_DIR/backups"

tmp_file="$(mktemp)"
trap 'rm -f "$tmp_file"' EXIT

crontab -l 2>/dev/null | grep -v "$CRON_MARKER" > "$tmp_file" || true
{
  cat "$tmp_file"
  echo "15 3 * * * cd $APP_DIR && /bin/sh $APP_DIR/deploy/enhe-ai-tools/scripts/enhe-backup-db.sh >> $BACKUP_LOG 2>&1 # $CRON_MARKER backup"
  echo "*/5 * * * * cd $APP_DIR && /bin/sh $APP_DIR/deploy/enhe-ai-tools/scripts/enhe-health-watch.sh >> $HEALTH_LOG 2>&1 # $CRON_MARKER health"
} | crontab -

echo "[enhe-install-cron] installed daily database backup and 5-minute health watch"
