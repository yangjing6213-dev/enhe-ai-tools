#!/bin/sh
set -eu

APP_DIR="${APP_DIR:-/opt/enhe-ai-tools}"
COMPOSE_FILE="$APP_DIR/deploy/enhe-ai-tools/docker-compose.yml"
ENV_FILE="$APP_DIR/deploy/enhe-ai-tools/.env"
ZPAY_ENV_FILE="$APP_DIR/zpay.env"
RUNTIME_DIR="$APP_DIR/deploy/enhe-ai-tools/runtime"
ACTIVE_STATE_FILE="$RUNTIME_DIR/active-release.env"
LOCK_HELPER="$APP_DIR/deploy/enhe-ai-tools/scripts/enhe-operation-lock.sh"
RELEASE_REF="${RELEASE_REF:-}"
APP_IMAGE_TAG="${APP_IMAGE_TAG:-}"
ROLLBACK_RELEASE_REF="${ROLLBACK_RELEASE_REF:-}"
release_identity_verified="${RELEASE_IDENTITY_VERIFIED:-}"
rollback_topology="${ROLLBACK_TOPOLOGY:-}"
legacy_image_id="${LEGACY_IMAGE_ID:-${ROLLBACK_LEGACY_IMAGE_ID:-}}"
state_loaded=0

is_release_ref() {
  case "$1" in
    ""|*[!0-9a-fA-F]*) return 1 ;;
  esac
  [ "${#1}" -eq 40 ]
}

is_rollback_image_tag() {
  case "$1" in
    rollback-*) ;;
    *) return 1 ;;
  esac
  payload="${1#rollback-}"
  attempted_release_ref="${payload%-*}"
  image_short="${payload##*-}"
  if [ "$attempted_release_ref" = "$payload" ] || ! is_release_ref "$attempted_release_ref"; then
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

read_required_state_value() {
  state_key="$1"
  awk -v key="$state_key" '
    BEGIN { prefix = key "=" }
    index($0, prefix) == 1 {
      count += 1
      value = substr($0, length(prefix) + 1)
    }
    END {
      if (count != 1) exit 1
      print value
    }
  ' "$ACTIVE_STATE_FILE"
}

read_optional_state_value() {
  state_key="$1"
  awk -v key="$state_key" '
    BEGIN { prefix = key "=" }
    index($0, prefix) == 1 {
      count += 1
      value = substr($0, length(prefix) + 1)
    }
    END {
      if (count > 1) exit 1
      if (count == 1) print value
    }
  ' "$ACTIVE_STATE_FILE"
}

invalid_active_state() {
  echo "Invalid active release state: $ACTIVE_STATE_FILE" >&2
  exit 1
}

test -f "$ENV_FILE" || { echo "Missing env file: $ENV_FILE" >&2; exit 1; }
test -f "$ZPAY_ENV_FILE" || { echo "Missing payment env file: $ZPAY_ENV_FILE" >&2; exit 1; }
test -f "$LOCK_HELPER" || { echo "Operation lock helper not found: $LOCK_HELPER" >&2; exit 1; }
. "$LOCK_HELPER"
acquire_enhe_operation_lock

if [ -z "$APP_IMAGE_TAG" ] && \
   [ -z "$RELEASE_REF" ] && \
   [ -z "$ROLLBACK_RELEASE_REF" ] && \
   [ -z "$release_identity_verified" ] && \
   [ -z "$rollback_topology" ] && \
   [ -z "$legacy_image_id" ] && \
   [ -f "$ACTIVE_STATE_FILE" ]; then
  APP_IMAGE_TAG="$(read_required_state_value APP_IMAGE_TAG)" || invalid_active_state
  RELEASE_REF="$(read_required_state_value RELEASE_REF)" || invalid_active_state
  rollback_topology="$(read_required_state_value ROLLBACK_TOPOLOGY)" || invalid_active_state
  release_identity_verified="$(read_required_state_value RELEASE_IDENTITY_VERIFIED)" || invalid_active_state
  legacy_image_id="$(read_optional_state_value LEGACY_IMAGE_ID)" || invalid_active_state
  case "$APP_IMAGE_TAG" in
    rollback-*) ROLLBACK_RELEASE_REF="$RELEASE_REF" ;;
  esac
  state_loaded=1
fi

should_inspect_current=0
if [ "$state_loaded" -eq 0 ]; then
  if [ -z "$APP_IMAGE_TAG" ]; then
    should_inspect_current=1
  elif [ -z "$RELEASE_REF" ]; then
    case "$APP_IMAGE_TAG" in
      rollback-*) should_inspect_current=0 ;;
      *) should_inspect_current=1 ;;
    esac
  fi
fi

if [ "$should_inspect_current" -eq 1 ]; then
  if docker container inspect enhe-ai-tools-app >/dev/null 2>&1; then
    current_image="$(docker inspect --format '{{.Config.Image}}' enhe-ai-tools-app)"
    if [ -z "$APP_IMAGE_TAG" ]; then
      APP_IMAGE_TAG="${current_image#enhe-ai-tools:}"
    fi
    if [ -z "$RELEASE_REF" ]; then
      RELEASE_REF="$(docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' enhe-ai-tools-app | sed -n 's/^RELEASE_REF=//p' | head -n 1)"
    fi
  fi
fi

if [ -z "$APP_IMAGE_TAG" ]; then
  APP_IMAGE_TAG="$RELEASE_REF"
fi
if [ -z "$release_identity_verified" ]; then
  release_identity_verified=1
fi
if [ -z "$rollback_topology" ]; then
  rollback_topology=full
fi
case "$release_identity_verified" in
  0|1) ;;
  *) echo "RELEASE_IDENTITY_VERIFIED must be 0 or 1." >&2; exit 1 ;;
esac
case "$rollback_topology" in
  full|app-only) ;;
  *) echo "ROLLBACK_TOPOLOGY must be full or app-only." >&2; exit 1 ;;
esac

case "$APP_IMAGE_TAG" in
  rollback-*)
    if ! is_rollback_image_tag "$APP_IMAGE_TAG"; then
      echo "APP_IMAGE_TAG must be a release ref or immutable rollback tag." >&2
      exit 1
    fi
    if ! is_release_ref "$ROLLBACK_RELEASE_REF"; then
      echo "ROLLBACK_RELEASE_REF is required when APP_IMAGE_TAG is a rollback tag." >&2
      exit 1
    fi
    expected_release_ref="$(printf '%s' "$ROLLBACK_RELEASE_REF" | tr 'A-F' 'a-f')"
    if [ -n "$RELEASE_REF" ]; then
      if ! is_release_ref "$RELEASE_REF"; then
        echo "RELEASE_REF must be the deployed 40-character commit ref." >&2
        exit 1
      fi
      normalized_release_ref="$(printf '%s' "$RELEASE_REF" | tr 'A-F' 'a-f')"
      if [ "$normalized_release_ref" != "$expected_release_ref" ]; then
        echo "RELEASE_REF must match ROLLBACK_RELEASE_REF for a rollback image." >&2
        exit 1
      fi
    fi
    RELEASE_REF="$expected_release_ref"
    ;;
  *)
    if ! is_release_ref "$APP_IMAGE_TAG"; then
      echo "APP_IMAGE_TAG must be a release ref or immutable rollback tag." >&2
      exit 1
    fi
    if ! is_release_ref "$RELEASE_REF"; then
      echo "RELEASE_REF must be the deployed 40-character commit ref." >&2
      exit 1
    fi
    RELEASE_REF="$(printf '%s' "$RELEASE_REF" | tr 'A-F' 'a-f')"
    expected_release_ref="$RELEASE_REF"
    ;;
esac

if ! image_id="$(docker image inspect --format '{{.Id}}' "enhe-ai-tools:$APP_IMAGE_TAG" 2>/dev/null)" || [ -z "$image_id" ]; then
  echo "APP_IMAGE_TAG must identify an existing immutable image." >&2
  exit 1
fi

if [ "$release_identity_verified" = "0" ]; then
  if [ "$state_loaded" -ne 1 ]; then
    echo "An unverified legacy image may only restart from persisted active release state." >&2
    exit 1
  fi
  if [ "$rollback_topology" != "app-only" ]; then
    echo "An unverified legacy image may only use the app-only topology." >&2
    exit 1
  fi
  rollback_topology="app-only"
  case "$legacy_image_id" in
    sha256:*) ;;
    *) echo "LEGACY_IMAGE_ID must be an immutable SHA-256 image ID." >&2; exit 1 ;;
  esac
  legacy_digest="${legacy_image_id#sha256:}"
  case "$legacy_digest" in
    ""|*[!0-9a-fA-F]*)
      echo "LEGACY_IMAGE_ID must contain a 64-character SHA-256 digest." >&2
      exit 1
      ;;
  esac
  if [ "${#legacy_digest}" -ne 64 ] || [ "$image_id" != "$legacy_image_id" ]; then
    echo "Persisted legacy image ID does not match the immutable rollback tag." >&2
    exit 1
  fi
  legacy_runtime_ref="$(printf '%s' "$legacy_digest" | cut -c1-40 | tr 'A-F' 'a-f')"
  if [ "$expected_release_ref" != "$legacy_runtime_ref" ]; then
    echo "Persisted legacy runtime identity does not match its image digest." >&2
    exit 1
  fi
else
  image_release_ref="$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$image_id" 2>/dev/null || true)"
  if ! is_release_ref "$image_release_ref"; then
    echo "Selected image has no valid org.opencontainers.image.revision label." >&2
    exit 1
  fi
  image_release_ref="$(printf '%s' "$image_release_ref" | tr 'A-F' 'a-f')"
  if [ "$image_release_ref" != "$expected_release_ref" ]; then
    echo "Image release identity does not match RELEASE_REF." >&2
    exit 1
  fi
  legacy_image_id=""
fi

export RELEASE_REF APP_IMAGE_TAG

cd "$APP_DIR"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config -q
mkdir -p "$RUNTIME_DIR"
rm -f \
  "$RUNTIME_DIR/seo-audit-worker-heartbeat.json" \
  "$RUNTIME_DIR/seo-audit-scheduler-heartbeat.json"

if [ "$rollback_topology" = "app-only" ]; then
  docker rm -f \
    enhe-ai-tools-seo-audit-worker \
    enhe-ai-tools-seo-audit-scheduler >/dev/null 2>&1 || true
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --no-build db app
  app_health_command="fetch('http://127.0.0.1:3000/api/health?scope=app').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
else
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --no-build
  app_health_command="fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
fi

attempt=1
while :; do
  runtime_healthy=0
  if container_is_healthy enhe-ai-tools-app && \
     docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T app \
       node -e "$app_health_command"; then
    if [ "$rollback_topology" = "app-only" ] || \
       { container_is_healthy enhe-ai-tools-seo-audit-worker && \
         container_is_healthy enhe-ai-tools-seo-audit-scheduler; }; then
      runtime_healthy=1
    fi
  fi
  if [ "$runtime_healthy" -eq 1 ]; then
    break
  fi
  if [ "$attempt" -ge 60 ]; then
    if [ "$rollback_topology" = "full" ]; then
      echo "Full runtime health check failed." >&2
      docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=80 \
        app seo-audit-worker seo-audit-scheduler >&2
    else
      echo "App-only runtime health check failed." >&2
      docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=80 app >&2
    fi
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps >&2
    exit 1
  fi
  attempt=$((attempt + 1))
  sleep 2
done

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
if [ "$rollback_topology" = "full" ]; then
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T app \
    sh -lc 'cd /app && ./node_modules/.bin/prisma migrate status'
fi

umask 077
active_state_tmp="$ACTIVE_STATE_FILE.tmp"
printf 'APP_IMAGE_TAG=%s\nRELEASE_REF=%s\nROLLBACK_TOPOLOGY=%s\nRELEASE_IDENTITY_VERIFIED=%s\nLEGACY_IMAGE_ID=%s\n' \
  "$APP_IMAGE_TAG" "$RELEASE_REF" "$rollback_topology" \
  "$release_identity_verified" "$legacy_image_id" > "$active_state_tmp"
mv "$active_state_tmp" "$ACTIVE_STATE_FILE"
