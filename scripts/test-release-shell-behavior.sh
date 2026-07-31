#!/bin/sh
set -eu

REPO_DIR="${1:-/repo}"
TMP_ROOT="$(mktemp -d)"
trap 'rm -rf "$TMP_ROOT"' EXIT HUP INT TERM

fail() {
  echo "[release-shell-test] $1" >&2
  exit 1
}

wait_for_file() {
  file="$1"
  attempt=0
  while [ ! -f "$file" ]; do
    attempt=$((attempt + 1))
    [ "$attempt" -lt 100 ] || fail "timed out waiting for $file"
    sleep 0.02
  done
}

LOCK_APP="$TMP_ROOT/lock-app"
LOCK_HELPER="$LOCK_APP/deploy/enhe-ai-tools/scripts/enhe-operation-lock.sh"
mkdir -p "$(dirname "$LOCK_HELPER")"
cp "$REPO_DIR/deploy/enhe-ai-tools/scripts/enhe-operation-lock.sh" "$LOCK_HELPER"

APP_DIR="$LOCK_APP" sh -c '
  . "$APP_DIR/deploy/enhe-ai-tools/scripts/enhe-operation-lock.sh"
  acquire_enhe_operation_lock
  : > "$APP_DIR/lock-ready"
  sleep 1
' &
lock_holder_pid=$!
wait_for_file "$LOCK_APP/lock-ready"
if APP_DIR="$LOCK_APP" sh -c '
  . "$APP_DIR/deploy/enhe-ai-tools/scripts/enhe-operation-lock.sh"
  acquire_enhe_operation_lock
' >"$TMP_ROOT/lock-second.out" 2>&1; then
  fail "a concurrent operation acquired the production lock"
fi
wait "$lock_holder_pid"

APP_DIR="$LOCK_APP" sh -c '
  . "$APP_DIR/deploy/enhe-ai-tools/scripts/enhe-operation-lock.sh"
  acquire_enhe_operation_lock
  sh -c '\''
    . "$APP_DIR/deploy/enhe-ai-tools/scripts/enhe-operation-lock.sh"
    acquire_enhe_operation_lock
  '\''
' || fail "a nested operation did not inherit the production lock"

LEGACY_APP="$TMP_ROOT/legacy-app"
LEGACY_SCRIPTS="$LEGACY_APP/deploy/enhe-ai-tools/scripts"
FAKE_BIN="$TMP_ROOT/fake-bin"
DOCKER_LOG="$TMP_ROOT/docker.log"
mkdir -p "$LEGACY_SCRIPTS" "$LEGACY_APP/deploy/enhe-ai-tools/runtime" "$FAKE_BIN"
cp "$REPO_DIR/deploy/enhe-ai-tools/scripts/enhe-operation-lock.sh" "$LEGACY_SCRIPTS/"
cp "$REPO_DIR/deploy/enhe-ai-tools/scripts/enhe-start.sh" "$LEGACY_SCRIPTS/"
: > "$LEGACY_APP/deploy/enhe-ai-tools/.env"
: > "$LEGACY_APP/zpay.env"

legacy_digest="bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
legacy_release_ref="$(printf '%s' "$legacy_digest" | cut -c1-40)"
attempted_release_ref="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
legacy_tag="rollback-$attempted_release_ref-$(printf '%s' "$legacy_digest" | cut -c1-12)"
cat > "$LEGACY_APP/deploy/enhe-ai-tools/runtime/active-release.env" <<EOF
APP_IMAGE_TAG=$legacy_tag
RELEASE_REF=$legacy_release_ref
ROLLBACK_TOPOLOGY=app-only
RELEASE_IDENTITY_VERIFIED=0
LEGACY_IMAGE_ID=sha256:$legacy_digest
EOF

cat > "$FAKE_BIN/docker" <<'EOF'
#!/bin/sh
set -eu
printf '%s\n' "$*" >> "$DOCKER_LOG"
case "$1" in
  image)
    case "$*" in
      *"{{.Id}}"*) printf '%s\n' "$FAKE_IMAGE_ID" ;;
      *) printf '\n' ;;
    esac
    ;;
  inspect)
    printf 'healthy\n'
    ;;
  container)
    exit 1
    ;;
  compose|rm)
    exit 0
    ;;
  *)
    exit 0
    ;;
esac
EOF
chmod +x "$FAKE_BIN/docker"

: > "$DOCKER_LOG"
PATH="$FAKE_BIN:$PATH" \
  APP_DIR="$LEGACY_APP" \
  DOCKER_LOG="$DOCKER_LOG" \
  FAKE_IMAGE_ID="sha256:$legacy_digest" \
  sh "$LEGACY_SCRIPTS/enhe-start.sh"

grep -F "up -d --no-build db app" "$DOCKER_LOG" >/dev/null ||
  fail "legacy restart did not use the app-only topology"
if grep -F "up -d --no-build db app seo-audit-worker" "$DOCKER_LOG" >/dev/null; then
  fail "legacy restart attempted to start modern sidecars"
fi
grep -F "/api/health?scope=app" "$DOCKER_LOG" >/dev/null ||
  fail "legacy restart did not use app-scoped health"
if grep -F "prisma migrate status" "$DOCKER_LOG" >/dev/null; then
  fail "legacy restart used Prisma migration status as compatibility evidence"
fi

: > "$DOCKER_LOG"
if PATH="$FAKE_BIN:$PATH" \
  APP_DIR="$LEGACY_APP" \
  DOCKER_LOG="$DOCKER_LOG" \
  FAKE_IMAGE_ID="sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc" \
  sh "$LEGACY_SCRIPTS/enhe-start.sh" >"$TMP_ROOT/legacy-mismatch.out" 2>&1; then
  fail "legacy restart accepted a different image ID"
fi
if grep -F "compose" "$DOCKER_LOG" >/dev/null; then
  fail "legacy image mismatch reached Docker Compose"
fi

BACKUP_APP="$TMP_ROOT/backup-app"
BACKUP_SCRIPTS="$BACKUP_APP/deploy/enhe-ai-tools/scripts"
BACKUP_DIR="$BACKUP_APP/backups/db"
BACKUP_BIN="$TMP_ROOT/backup-bin"
mkdir -p "$BACKUP_SCRIPTS" "$BACKUP_DIR" "$BACKUP_BIN"
cp "$REPO_DIR/deploy/enhe-ai-tools/scripts/enhe-operation-lock.sh" "$BACKUP_SCRIPTS/"
cp "$REPO_DIR/deploy/enhe-ai-tools/scripts/enhe-backup-db.sh" "$BACKUP_SCRIPTS/"

cat > "$BACKUP_BIN/date" <<'EOF'
#!/bin/sh
printf '20260101T000000Z\n'
EOF
cat > "$BACKUP_BIN/docker" <<'EOF'
#!/bin/sh
set -eu
if [ "$1" = "container" ]; then
  exit 0
fi
case "$*" in
  *pg_dump*) printf 'test-backup-data\n' ;;
esac
exit 0
EOF
chmod +x "$BACKUP_BIN/date" "$BACKUP_BIN/docker"

first_backup="$(
  PATH="$BACKUP_BIN:$PATH" APP_DIR="$BACKUP_APP" BACKUP_DIR="$BACKUP_DIR" \
    sh "$BACKUP_SCRIPTS/enhe-backup-db.sh"
)"
second_backup="$(
  PATH="$BACKUP_BIN:$PATH" APP_DIR="$BACKUP_APP" BACKUP_DIR="$BACKUP_DIR" \
    sh "$BACKUP_SCRIPTS/enhe-backup-db.sh"
)"
[ "$first_backup" != "$second_backup" ] || fail "same-second backups collided"
[ -f "$first_backup" ] || fail "first backup was overwritten"
[ -f "$second_backup" ] || fail "second backup was not created"
(cd "$BACKUP_DIR" && sha256sum -c "$(basename "$first_backup").sha256" >/dev/null)
(cd "$BACKUP_DIR" && sha256sum -c "$(basename "$second_backup").sha256" >/dev/null)

RECOVERY_APP="$TMP_ROOT/recovery-app"
RECOVERY_SCRIPTS="$RECOVERY_APP/deploy/enhe-ai-tools/scripts"
RECOVERY_BIN="$TMP_ROOT/recovery-bin"
RECOVERY_LOG="$TMP_ROOT/recovery-docker.log"
mkdir -p "$RECOVERY_SCRIPTS" "$RECOVERY_BIN"
cp "$REPO_DIR/deploy/enhe-ai-tools/scripts/enhe-operation-lock.sh" "$RECOVERY_SCRIPTS/"
cp "$REPO_DIR/deploy/enhe-ai-tools/scripts/enhe-recover-pre-migration-runtime.sh" "$RECOVERY_SCRIPTS/"

app_image="sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
worker_image="sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
scheduler_image="sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
cat > "$RECOVERY_BIN/docker" <<'EOF'
#!/bin/sh
set -eu
printf '%s\n' "$*" >> "$RECOVERY_LOG"
if [ "$1" = "inspect" ]; then
  case "$*" in
    *"{{.Image}}"*enhe-ai-tools-app*) printf '%s\n' "$RECOVERY_APP_IMAGE" ;;
    *"{{.Image}}"*enhe-ai-tools-seo-audit-worker*) printf '%s\n' "$RECOVERY_WORKER_IMAGE" ;;
    *"{{.Image}}"*enhe-ai-tools-seo-audit-scheduler*) printf '%s\n' "$RECOVERY_SCHEDULER_IMAGE" ;;
    *) printf 'healthy\n' ;;
  esac
fi
exit 0
EOF
chmod +x "$RECOVERY_BIN/docker"

: > "$RECOVERY_LOG"
PATH="$RECOVERY_BIN:$PATH" \
  APP_DIR="$RECOVERY_APP" \
  RECOVERY_LOG="$RECOVERY_LOG" \
  RECOVERY_APP_IMAGE="$app_image" \
  RECOVERY_WORKER_IMAGE="$worker_image" \
  RECOVERY_SCHEDULER_IMAGE="$scheduler_image" \
  PREVIOUS_APP_WAS_RUNNING=1 \
  PREVIOUS_APP_IMAGE_ID="$app_image" \
  PREVIOUS_WORKER_WAS_RUNNING=1 \
  PREVIOUS_WORKER_IMAGE_ID="$worker_image" \
  PREVIOUS_SCHEDULER_WAS_RUNNING=1 \
  PREVIOUS_SCHEDULER_IMAGE_ID="$scheduler_image" \
  sh "$RECOVERY_SCRIPTS/enhe-recover-pre-migration-runtime.sh"
grep -F "start enhe-ai-tools-app" "$RECOVERY_LOG" >/dev/null ||
  fail "pre-migration recovery did not restart the app"
grep -F "start enhe-ai-tools-seo-audit-worker" "$RECOVERY_LOG" >/dev/null ||
  fail "pre-migration recovery did not restart the worker"
grep -F "start enhe-ai-tools-seo-audit-scheduler" "$RECOVERY_LOG" >/dev/null ||
  fail "pre-migration recovery did not restart the scheduler"

: > "$RECOVERY_LOG"
if PATH="$RECOVERY_BIN:$PATH" \
  APP_DIR="$RECOVERY_APP" \
  RECOVERY_LOG="$RECOVERY_LOG" \
  RECOVERY_APP_IMAGE="$app_image" \
  RECOVERY_WORKER_IMAGE="$worker_image" \
  RECOVERY_SCHEDULER_IMAGE="$scheduler_image" \
  PREVIOUS_APP_WAS_RUNNING=1 \
  PREVIOUS_APP_IMAGE_ID="sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd" \
  PREVIOUS_WORKER_WAS_RUNNING=0 \
  PREVIOUS_WORKER_IMAGE_ID='' \
  PREVIOUS_SCHEDULER_WAS_RUNNING=0 \
  PREVIOUS_SCHEDULER_IMAGE_ID='' \
  sh "$RECOVERY_SCRIPTS/enhe-recover-pre-migration-runtime.sh" \
  >"$TMP_ROOT/recovery-mismatch.out" 2>&1; then
  fail "pre-migration recovery accepted a different app image"
fi
if grep -F "start " "$RECOVERY_LOG" >/dev/null; then
  fail "pre-migration recovery started a container after identity mismatch"
fi

echo "[release-shell-test] lock, legacy restart, backup collision, and recovery checks passed"
