#!/bin/sh
set -eu

APP_DIR="${APP_DIR:-/opt/enhe-ai-tools}"
LOCK_HELPER="$APP_DIR/deploy/enhe-ai-tools/scripts/enhe-operation-lock.sh"
APP_CONTAINER="enhe-ai-tools-app"
WORKER_CONTAINER="enhe-ai-tools-seo-audit-worker"
SCHEDULER_CONTAINER="enhe-ai-tools-seo-audit-scheduler"
PREVIOUS_APP_WAS_RUNNING="${PREVIOUS_APP_WAS_RUNNING:-0}"
PREVIOUS_APP_IMAGE_ID="${PREVIOUS_APP_IMAGE_ID:-}"
PREVIOUS_WORKER_WAS_RUNNING="${PREVIOUS_WORKER_WAS_RUNNING:-0}"
PREVIOUS_WORKER_IMAGE_ID="${PREVIOUS_WORKER_IMAGE_ID:-}"
PREVIOUS_SCHEDULER_WAS_RUNNING="${PREVIOUS_SCHEDULER_WAS_RUNNING:-0}"
PREVIOUS_SCHEDULER_IMAGE_ID="${PREVIOUS_SCHEDULER_IMAGE_ID:-}"

validate_flag() {
  case "$2" in
    0|1) ;;
    *) echo "$1 must be 0 or 1." >&2; exit 1 ;;
  esac
}

validate_image_id() {
  image_id_name="$1"
  image_id_value="$2"
  case "$image_id_value" in
    sha256:*) ;;
    *) echo "$image_id_name must be an immutable SHA-256 image ID." >&2; exit 1 ;;
  esac
  digest="${image_id_value#sha256:}"
  case "$digest" in
    ""|*[!0-9a-fA-F]*)
      echo "$image_id_name must contain a 64-character SHA-256 digest." >&2
      exit 1
      ;;
  esac
  [ "${#digest}" -eq 64 ] || {
    echo "$image_id_name must contain a 64-character SHA-256 digest." >&2
    exit 1
  }
}

assert_container_image() {
  container="$1"
  expected_image_id="$2"
  actual_image_id="$(docker inspect --format '{{.Image}}' "$container" 2>/dev/null || true)"
  if [ "$actual_image_id" != "$expected_image_id" ]; then
    echo "Refusing pre-migration recovery because $container no longer uses the recorded image." >&2
    exit 1
  fi
}

container_is_ready() {
  status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$1" 2>/dev/null || true)"
  [ "$status" = "healthy" ] || [ "$status" = "running" ]
}

test -f "$LOCK_HELPER" || { echo "Operation lock helper not found: $LOCK_HELPER" >&2; exit 1; }
. "$LOCK_HELPER"
acquire_enhe_operation_lock

validate_flag PREVIOUS_APP_WAS_RUNNING "$PREVIOUS_APP_WAS_RUNNING"
validate_flag PREVIOUS_WORKER_WAS_RUNNING "$PREVIOUS_WORKER_WAS_RUNNING"
validate_flag PREVIOUS_SCHEDULER_WAS_RUNNING "$PREVIOUS_SCHEDULER_WAS_RUNNING"

if [ "$PREVIOUS_APP_WAS_RUNNING" -eq 1 ]; then
  validate_image_id PREVIOUS_APP_IMAGE_ID "$PREVIOUS_APP_IMAGE_ID"
  assert_container_image "$APP_CONTAINER" "$PREVIOUS_APP_IMAGE_ID"
fi
if [ "$PREVIOUS_WORKER_WAS_RUNNING" -eq 1 ]; then
  validate_image_id PREVIOUS_WORKER_IMAGE_ID "$PREVIOUS_WORKER_IMAGE_ID"
  assert_container_image "$WORKER_CONTAINER" "$PREVIOUS_WORKER_IMAGE_ID"
fi
if [ "$PREVIOUS_SCHEDULER_WAS_RUNNING" -eq 1 ]; then
  validate_image_id PREVIOUS_SCHEDULER_IMAGE_ID "$PREVIOUS_SCHEDULER_IMAGE_ID"
  assert_container_image "$SCHEDULER_CONTAINER" "$PREVIOUS_SCHEDULER_IMAGE_ID"
fi

if [ "$PREVIOUS_APP_WAS_RUNNING" -eq 1 ]; then
  docker start "$APP_CONTAINER" >/dev/null
fi
if [ "$PREVIOUS_WORKER_WAS_RUNNING" -eq 1 ]; then
  docker start "$WORKER_CONTAINER" >/dev/null
fi
if [ "$PREVIOUS_SCHEDULER_WAS_RUNNING" -eq 1 ]; then
  docker start "$SCHEDULER_CONTAINER" >/dev/null
fi

attempt=1
while :; do
  runtime_ready=1
  if [ "$PREVIOUS_APP_WAS_RUNNING" -eq 1 ] && ! container_is_ready "$APP_CONTAINER"; then
    runtime_ready=0
  fi
  if [ "$PREVIOUS_WORKER_WAS_RUNNING" -eq 1 ] && ! container_is_ready "$WORKER_CONTAINER"; then
    runtime_ready=0
  fi
  if [ "$PREVIOUS_SCHEDULER_WAS_RUNNING" -eq 1 ] && ! container_is_ready "$SCHEDULER_CONTAINER"; then
    runtime_ready=0
  fi
  if [ "$runtime_ready" -eq 1 ]; then
    break
  fi
  if [ "$attempt" -ge 60 ]; then
    echo "The exact pre-migration runtime did not become ready after restart." >&2
    exit 1
  fi
  attempt=$((attempt + 1))
  sleep 2
done

echo "The exact pre-migration runtime containers were restarted."
