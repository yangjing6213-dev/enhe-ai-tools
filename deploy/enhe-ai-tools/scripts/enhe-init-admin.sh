#!/bin/sh
set -eu

APP_DIR="${APP_DIR:-/opt/enhe-ai-tools}"
APP_CONTAINER="${ENHE_APP_CONTAINER:-enhe-ai-tools-app}"
LOCK_DIR="$APP_DIR/deploy/enhe-ai-tools/runtime"

if [ "${ADMIN_BOOTSTRAP_CONFIRM:-}" != "CREATE_ENHE_ADMIN" ]; then
  echo "Set ADMIN_BOOTSTRAP_CONFIRM=CREATE_ENHE_ADMIN to confirm administrator creation." >&2
  exit 1
fi
: "${ADMIN_BOOTSTRAP_EMAIL:?ADMIN_BOOTSTRAP_EMAIL is required}"
: "${ADMIN_BOOTSTRAP_PASSWORD:?ADMIN_BOOTSTRAP_PASSWORD is required}"
mkdir -p "$LOCK_DIR"
LOCK_DIR="$(cd "$LOCK_DIR" && pwd -P)"
exec 9>"$LOCK_DIR/enhe-operation.lock"
if ! flock -n 9; then
  echo "Another ENHE production operation is running." >&2
  exit 75
fi

docker container inspect "$APP_CONTAINER" >/dev/null 2>&1 || {
  echo "Application container not found: $APP_CONTAINER" >&2
  exit 1
}

docker exec -i \
  -e ADMIN_BOOTSTRAP_EMAIL \
  -e ADMIN_BOOTSTRAP_PASSWORD \
  -e ADMIN_BOOTSTRAP_CONFIRM \
  "$APP_CONTAINER" node prisma/ensure-super-admin.js
