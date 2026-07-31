#!/bin/sh
set -eu

APP_DIR="${APP_DIR:-/opt/enhe-ai-tools}"
LOCK_HELPER="$APP_DIR/deploy/enhe-ai-tools/scripts/enhe-operation-lock.sh"

test -f "$LOCK_HELPER" || { echo "Operation lock helper not found: $LOCK_HELPER" >&2; exit 1; }
. "$LOCK_HELPER"
acquire_enhe_operation_lock

for container in \
  enhe-ai-tools-seo-audit-worker \
  enhe-ai-tools-seo-audit-scheduler \
  enhe-ai-tools-app \
  enhe-ai-tools-db; do
  if docker container inspect "$container" >/dev/null 2>&1; then
    docker stop "$container" >/dev/null
  fi
done
