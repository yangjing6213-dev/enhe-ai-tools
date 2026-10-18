#!/bin/sh
set -eu
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT HUP INT TERM
mkdir -p "$TMP/app/backups/db" "$TMP/app/deploy/enhe-ai-tools/scripts" "$TMP/bin"
cp "$ROOT/deploy/enhe-ai-tools/scripts/enhe-check-backup.sh" "$TMP/app/deploy/enhe-ai-tools/scripts/"
export APP_DIR="$TMP/app"
export BACKUP_DIR="$APP_DIR/backups/db"
check="$APP_DIR/deploy/enhe-ai-tools/scripts/enhe-check-backup.sh"
fail() { echo "[backup-monitor-test] $*" >&2; exit 1; }
if sh "$check" >/dev/null 2>&1; then fail 'missing backups accepted'; fi
printf 'fixture-backup\n' > "$BACKUP_DIR/enhe-ai-tools-fixture.dump"
if sh "$check" >/dev/null 2>&1; then fail 'incomplete backup without checksum accepted'; fi
(cd "$BACKUP_DIR" && sha256sum enhe-ai-tools-fixture.dump > enhe-ai-tools-fixture.dump.sha256)
sh "$check" >/dev/null
printf 'tampered\n' >> "$BACKUP_DIR/enhe-ai-tools-fixture.dump"
if sh "$check" >/dev/null 2>&1; then fail 'damaged backup accepted'; fi
(cd "$BACKUP_DIR" && sha256sum enhe-ai-tools-fixture.dump > enhe-ai-tools-fixture.dump.sha256)
touch -t 202001010000 "$BACKUP_DIR/enhe-ai-tools-fixture.dump"
if sh "$check" >/dev/null 2>&1; then fail 'stale backup accepted'; fi
touch "$BACKUP_DIR/enhe-ai-tools-fixture.dump"
if MAX_BACKUP_AGE_SECONDS=invalid sh "$check" >/dev/null 2>&1; then fail 'invalid limit accepted'; fi

# Healthy site + stale backup must alert. Failed SMTP must remain retryable.
cat > "$TMP/bin/curl" <<'EOF'
#!/bin/sh
printf '{"status":"ok"}\n'
EOF
cat > "$TMP/bin/docker" <<'EOF'
#!/bin/sh
cat >/dev/null
exit "${MOCK_SMTP_EXIT:-0}"
EOF
chmod +x "$TMP/bin/curl" "$TMP/bin/docker"
export PATH="$TMP/bin:$PATH"
export STATE_FILE="$APP_DIR/backups/alert-state"
watch="$ROOT/deploy/enhe-ai-tools/scripts/enhe-health-watch.sh"
sh "$watch" >/dev/null
[ ! -e "$STATE_FILE" ] || fail 'healthy site created alert state'
touch -t 202001010000 "$BACKUP_DIR/enhe-ai-tools-fixture.dump"
if MOCK_SMTP_EXIT=1 sh "$watch" >/dev/null 2>&1; then fail 'stale backup with failed SMTP returned healthy'; fi
[ ! -e "$STATE_FILE" ] || fail 'failed SMTP incorrectly suppressed retries'
if sh "$watch" >/dev/null 2>&1; then fail 'stale backup returned healthy'; fi
[ -s "$STATE_FILE" ] || fail 'successful alert did not set throttle state'
touch "$BACKUP_DIR/enhe-ai-tools-fixture.dump"
sh "$watch" >/dev/null
[ ! -e "$STATE_FILE" ] || fail 'recovered backup did not reset alert state'

# Mock system cron; preserve both users' unrelated entries, install root first.
export CRON_FIXTURE="$TMP/cron"
mkdir -p "$CRON_FIXTURE"
printf '0 0 * * * unrelated-root\n' > "$CRON_FIXTURE/root"
printf '0 0 * * * unrelated-user\n0 3 * * * old # enhe-ai-tools launch operations backup\n' > "$CRON_FIXTURE/ubuntu"
cat > "$TMP/bin/id" <<'EOF'
#!/bin/sh
case "$*" in '-u') echo 0 ;; 'ubuntu') exit 0 ;; esac
EOF
cat > "$TMP/bin/crontab" <<'EOF'
#!/bin/sh
set -eu
who=root
if [ "$1" = -u ]; then who="$2"; shift 2; fi
if [ "$1" = -l ]; then cat "$CRON_FIXTURE/$who"; exit; fi
printf '%s\n' "$who" >> "$CRON_FIXTURE/writes"
if [ "$1" = - ]; then cat > "$CRON_FIXTURE/$who"; else cp "$1" "$CRON_FIXTURE/$who"; fi
EOF
chmod +x "$TMP/bin/id" "$TMP/bin/crontab"
sh "$ROOT/deploy/enhe-ai-tools/scripts/enhe-install-cron.sh" >/dev/null
grep -q unrelated-root "$CRON_FIXTURE/root" || fail 'root unrelated job lost'
grep -q unrelated-user "$CRON_FIXTURE/ubuntu" || fail 'user unrelated job lost'
[ "$(grep -c 'enhe-ai-tools launch operations' "$CRON_FIXTURE/root")" -eq 3 ] || fail 'expected three root jobs'
if grep -q 'enhe-ai-tools launch operations' "$CRON_FIXTURE/ubuntu"; then fail 'old user jobs retained'; fi
[ "$(head -1 "$CRON_FIXTURE/writes")" = root ] || fail 'old schedule removed before replacement installed'
echo '[backup-monitor-test] freshness, corruption, alert retry/recovery, and cron identity tests passed'
