#!/bin/sh
set -eu

APP_DIR="${APP_DIR:-/opt/enhe-ai-tools}"
COMPOSE_FILE="$APP_DIR/deploy/enhe-ai-tools/docker-compose.yml"
ENV_FILE="$APP_DIR/deploy/enhe-ai-tools/.env"
ZPAY_ENV_FILE="$APP_DIR/zpay.env"
RUNTIME_DIR="$APP_DIR/deploy/enhe-ai-tools/runtime"
LOCK_HELPER="$APP_DIR/deploy/enhe-ai-tools/scripts/enhe-operation-lock.sh"
COMPATIBILITY_PROBE="$APP_DIR/deploy/enhe-ai-tools/scripts/legacy-rollback-compatibility.cjs"

is_release_ref() {
  case "$1" in
    ""|*[!0-9a-fA-F]*) return 1 ;;
  esac
  [ "${#1}" -eq 40 ]
}

is_rollback_image_tag() {
  if is_release_ref "$1"; then
    return 0
  fi
  case "$1" in
    rollback-*) ;;
    *) return 1 ;;
  esac
  payload="${1#rollback-}"
  attempt_ref="${payload%-*}"
  image_short="${payload##*-}"
  if [ "$attempt_ref" = "$payload" ] || ! is_release_ref "$attempt_ref"; then
    return 1
  fi
  case "$image_short" in
    ""|*[!0-9a-fA-F]*) return 1 ;;
  esac
  [ "${#image_short}" -eq 12 ]
}

container_is_healthy() {
  status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$1" 2>/dev/null || true)"
  [ "$status" = "healthy" ]
}

if [ "${ROLLBACK_ENHE_AI_TOOLS:-}" != "ROLLBACK_ENHE_AI_TOOLS" ]; then
  echo "Set ROLLBACK_ENHE_AI_TOOLS=ROLLBACK_ENHE_AI_TOOLS to confirm rollback." >&2
  exit 1
fi
: "${ROLLBACK_IMAGE:?ROLLBACK_IMAGE must be a prior release or immutable rollback tag}"
: "${ROLLBACK_RELEASE_REF:?ROLLBACK_RELEASE_REF must identify the code inside the rollback image}"
: "${ROLLBACK_RELEASE_VERIFIED:?ROLLBACK_RELEASE_VERIFIED must be 0 or 1}"
: "${ROLLBACK_TOPOLOGY:?ROLLBACK_TOPOLOGY must be full or app-only}"
if ! is_rollback_image_tag "$ROLLBACK_IMAGE"; then
  echo "ROLLBACK_IMAGE must be a 40-character release ref or immutable rollback tag." >&2
  exit 1
fi
if ! is_release_ref "$ROLLBACK_RELEASE_REF"; then
  echo "ROLLBACK_RELEASE_REF must be exactly 40 hexadecimal characters." >&2
  exit 1
fi
case "$ROLLBACK_RELEASE_VERIFIED" in
  0|1) ;;
  *) echo "ROLLBACK_RELEASE_VERIFIED must be 0 or 1." >&2; exit 1 ;;
esac
case "$ROLLBACK_TOPOLOGY" in
  full|app-only) ;;
  *) echo "ROLLBACK_TOPOLOGY must be full or app-only." >&2; exit 1 ;;
esac
test -f "$ENV_FILE" || { echo "Missing env file: $ENV_FILE" >&2; exit 1; }
test -f "$ZPAY_ENV_FILE" || { echo "Missing payment env file: $ZPAY_ENV_FILE" >&2; exit 1; }
test -f "$LOCK_HELPER" || { echo "Operation lock helper not found: $LOCK_HELPER" >&2; exit 1; }
test -f "$COMPATIBILITY_PROBE" || { echo "Rollback compatibility probe not found: $COMPATIBILITY_PROBE" >&2; exit 1; }
. "$LOCK_HELPER"
acquire_enhe_operation_lock

APP_IMAGE_TAG="$ROLLBACK_IMAGE"
rollback_release_ref="$(printf '%s' "$ROLLBACK_RELEASE_REF" | tr 'A-F' 'a-f')"
RELEASE_REF="$rollback_release_ref"
export RELEASE_REF APP_IMAGE_TAG
cd "$APP_DIR"
rollback_image_id="$(docker image inspect --format '{{.Id}}' "enhe-ai-tools:$ROLLBACK_IMAGE")"
if [ "$ROLLBACK_RELEASE_VERIFIED" = "1" ]; then
  image_release_ref="$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$rollback_image_id" 2>/dev/null || true)"
  if ! is_release_ref "$image_release_ref"; then
    echo "Verified rollback images require a valid OCI revision label." >&2
    exit 1
  fi
  image_release_ref="$(printf '%s' "$image_release_ref" | tr 'A-F' 'a-f')"
  if [ "$image_release_ref" != "$rollback_release_ref" ]; then
    echo "Rollback image release identity does not match ROLLBACK_RELEASE_REF." >&2
    exit 1
  fi
else
  if [ "$ROLLBACK_TOPOLOGY" != "app-only" ]; then
    echo "An unverified legacy image may only use the app-only rollback topology." >&2
    exit 1
  fi
  case "${ROLLBACK_LEGACY_IMAGE_ID:-}" in
    sha256:*) ;;
    *) echo "ROLLBACK_LEGACY_IMAGE_ID must be the exact legacy image ID." >&2; exit 1 ;;
  esac
  legacy_digest="${ROLLBACK_LEGACY_IMAGE_ID#sha256:}"
  case "$legacy_digest" in
    ""|*[!0-9a-fA-F]*)
      echo "ROLLBACK_LEGACY_IMAGE_ID must contain a 64-character SHA-256 digest." >&2
      exit 1
      ;;
  esac
  if [ "${#legacy_digest}" -ne 64 ] || [ "$rollback_image_id" != "$ROLLBACK_LEGACY_IMAGE_ID" ]; then
    echo "Legacy rollback image ID does not match the immutable rollback tag." >&2
    exit 1
  fi
  legacy_runtime_ref="$(printf '%s' "$legacy_digest" | cut -c1-40 | tr 'A-F' 'a-f')"
  if [ "$rollback_release_ref" != "$legacy_runtime_ref" ]; then
    echo "Unverified legacy runtime identity must be derived from its image digest." >&2
    exit 1
  fi
fi

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config -q
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d db
attempt=1
while ! container_is_healthy enhe-ai-tools-db; do
  if [ "$attempt" -ge 30 ]; then
    echo "Database did not become healthy for the rollback compatibility probe." >&2
    exit 1
  fi
  attempt=$((attempt + 1))
  sleep 2
done
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" run \
  --rm --no-deps -T app node - < "$COMPATIBILITY_PROBE"

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" stop \
  seo-audit-worker seo-audit-scheduler app || true
if [ "$ROLLBACK_TOPOLOGY" = "app-only" ]; then
  docker rm -f \
    enhe-ai-tools-seo-audit-worker \
    enhe-ai-tools-seo-audit-scheduler >/dev/null 2>&1 || true
fi
rm -f \
  "$RUNTIME_DIR/seo-audit-worker-heartbeat.json" \
  "$RUNTIME_DIR/seo-audit-scheduler-heartbeat.json"

if [ "$ROLLBACK_TOPOLOGY" = "full" ]; then
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d \
    --no-build --force-recreate db app seo-audit-worker seo-audit-scheduler
else
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d \
    --no-build --force-recreate db app
fi

if [ "$ROLLBACK_TOPOLOGY" = "app-only" ]; then
  app_health_path="/api/health?scope=app"
else
  app_health_path="/api/health"
fi

attempt=1
while :; do
  if container_is_healthy enhe-ai-tools-app && \
     docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T app \
       node -e "fetch('http://127.0.0.1:3000$app_health_path').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"; then
    if [ "$ROLLBACK_TOPOLOGY" = "app-only" ] || \
       { container_is_healthy enhe-ai-tools-seo-audit-worker && \
         container_is_healthy enhe-ai-tools-seo-audit-scheduler; }; then
      break
    fi
  fi
  if [ "$attempt" -ge 45 ]; then
    echo "Rolled-back runtime health check failed for topology $ROLLBACK_TOPOLOGY." >&2
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps >&2
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=80 \
      app seo-audit-worker seo-audit-scheduler >&2
    exit 1
  fi
  attempt=$((attempt + 1))
  sleep 2
done

mkdir -p "$RUNTIME_DIR"
umask 077
active_state_tmp="$RUNTIME_DIR/active-release.env.tmp"
active_legacy_image_id=""
if [ "$ROLLBACK_RELEASE_VERIFIED" = "0" ]; then
  active_legacy_image_id="$rollback_image_id"
fi
printf 'APP_IMAGE_TAG=%s\nRELEASE_REF=%s\nROLLBACK_TOPOLOGY=%s\nRELEASE_IDENTITY_VERIFIED=%s\nLEGACY_IMAGE_ID=%s\n' \
  "$APP_IMAGE_TAG" "$RELEASE_REF" "$ROLLBACK_TOPOLOGY" "$ROLLBACK_RELEASE_VERIFIED" \
  "$active_legacy_image_id" \
  > "$active_state_tmp"
mv "$active_state_tmp" "$RUNTIME_DIR/active-release.env"

if [ "$ROLLBACK_RELEASE_VERIFIED" = "0" ]; then
  echo "Legacy app-only rollback completed for immutable image $rollback_image_id; Git release identity is intentionally unverified."
else
  echo "Runtime rollback completed for verified release $RELEASE_REF."
fi
