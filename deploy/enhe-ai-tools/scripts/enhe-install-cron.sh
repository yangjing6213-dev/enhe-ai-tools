#!/bin/sh
set -eu

if [ "$(id -u)" -ne 0 ]; then
  echo '[enhe-install-cron] install as root so backup identity matches deployment' >&2
  exit 1
fi

APP_DIR="${APP_DIR:-/opt/enhe-ai-tools}"
CRON_MARKER="enhe-ai-tools launch operations"
BACKUP_LOG="$APP_DIR/backups/backup.log"
HEALTH_LOG="$APP_DIR/backups/health-watch.log"
ORDER_EXPIRY_LOG="$APP_DIR/backups/order-expiry.log"

mkdir -p "$APP_DIR/backups"

tmp_file="$(mktemp)"
trap 'rm -f "$tmp_file"' EXIT

crontab -l 2>/dev/null | grep -v "$CRON_MARKER" > "$tmp_file" || true
{
  cat "$tmp_file"
  echo "15 3 * * * cd $APP_DIR && /bin/sh $APP_DIR/deploy/enhe-ai-tools/scripts/enhe-backup-db.sh >> $BACKUP_LOG 2>&1 # $CRON_MARKER backup"
  echo "*/5 * * * * cd $APP_DIR && /bin/sh $APP_DIR/deploy/enhe-ai-tools/scripts/enhe-health-watch.sh >> $HEALTH_LOG 2>&1 # $CRON_MARKER health"
  echo "* * * * * /usr/bin/flock -n $APP_DIR/backups/order-expiry.lock /usr/bin/docker exec -w /app enhe-ai-tools-app node --import tsx scripts/expire-unpaid-orders.ts >> $ORDER_EXPIRY_LOG 2>&1 # $CRON_MARKER order-expiry"
} | crontab -

# Install the replacement first, then remove only this application's old jobs.
# If root installation fails, the previous schedule is still present.
if id ubuntu >/dev/null 2>&1; then
  (crontab -u ubuntu -l 2>/dev/null || true) | grep -v "$CRON_MARKER" > "$tmp_file" || true
  crontab -u ubuntu "$tmp_file"
fi

echo "[enhe-install-cron] root jobs installed: daily backup, 5-minute site/backup health watch and 1-minute unpaid-order expiry"
