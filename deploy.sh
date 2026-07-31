#!/bin/sh
set -eu

APP_DIR="${APP_DIR:-/opt/enhe-ai-tools}"
COMPOSE_FILE="$APP_DIR/deploy/enhe-ai-tools/docker-compose.yml"
ENV_FILE="$APP_DIR/deploy/enhe-ai-tools/.env"
ZPAY_ENV_FILE="$APP_DIR/zpay.env"
RUNTIME_DIR="$APP_DIR/deploy/enhe-ai-tools/runtime"
RELEASE_REF="${RELEASE_REF:-}"
EXPECTED_DB_VOLUME="enhe-ai-tools_enhe-ai-tools-postgres-data"
BACKUP_FILE=""
ROLLBACK_IMAGE_TARGET=""
ROLLBACK_RELEASE_REF=""
ROLLBACK_RELEASE_VERIFIED=""
ROLLBACK_TOPOLOGY=""
ROLLBACK_LEGACY_IMAGE_ID=""
DEPLOYMENT_COMPLETE=0
WRITER_QUIESCE_STARTED=0
PRODUCTION_MIGRATION_STARTED=0
PREVIOUS_APP_WAS_RUNNING=0
PREVIOUS_APP_IMAGE_ID=""
PREVIOUS_WORKER_WAS_RUNNING=0
PREVIOUS_WORKER_IMAGE_ID=""
PREVIOUS_SCHEDULER_WAS_RUNNING=0
PREVIOUS_SCHEDULER_IMAGE_ID=""
LOCK_HELPER="$APP_DIR/deploy/enhe-ai-tools/scripts/enhe-operation-lock.sh"
ROLLBACK_COMPATIBILITY_SCRIPT="$APP_DIR/deploy/enhe-ai-tools/scripts/enhe-verify-rollback-compatibility.sh"
PRE_MIGRATION_RECOVERY_SCRIPT="$APP_DIR/deploy/enhe-ai-tools/scripts/enhe-recover-pre-migration-runtime.sh"

is_release_ref() {
  case "$1" in
    ""|*[!0-9a-fA-F]*) return 1 ;;
  esac
  [ "${#1}" -eq 40 ]
}

if ! is_release_ref "$RELEASE_REF"; then
  echo "RELEASE_REF must be exactly 40 hexadecimal characters." >&2
  exit 1
fi
RELEASE_REF="$(printf '%s' "$RELEASE_REF" | tr 'A-F' 'a-f')"
if [ ! -f "$ENV_FILE" ]; then
  echo "Missing environment file: $ENV_FILE" >&2
  exit 1
fi
if [ ! -f "$ZPAY_ENV_FILE" ]; then
  echo "Missing payment environment file: $ZPAY_ENV_FILE" >&2
  exit 1
fi
if [ ! -f "$LOCK_HELPER" ]; then
  echo "Operation lock helper not found: $LOCK_HELPER" >&2
  exit 1
fi
if [ ! -f "$ROLLBACK_COMPATIBILITY_SCRIPT" ]; then
  echo "Rollback compatibility drill not found: $ROLLBACK_COMPATIBILITY_SCRIPT" >&2
  exit 1
fi
if [ ! -f "$PRE_MIGRATION_RECOVERY_SCRIPT" ]; then
  echo "Pre-migration runtime recovery script not found: $PRE_MIGRATION_RECOVERY_SCRIPT" >&2
  exit 1
fi
. "$LOCK_HELPER"
acquire_enhe_operation_lock

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

show_recovery_commands() {
  if [ "$DEPLOYMENT_COMPLETE" -eq 1 ]; then
    return
  fi
  if [ "$PRODUCTION_MIGRATION_STARTED" -eq 0 ] && \
     [ "$WRITER_QUIESCE_STARTED" -eq 1 ]; then
    echo "Deployment failed before the production migration started; restarting the exact previous runtime." >&2
    if APP_DIR="$APP_DIR" \
       PREVIOUS_APP_WAS_RUNNING="$PREVIOUS_APP_WAS_RUNNING" \
       PREVIOUS_APP_IMAGE_ID="$PREVIOUS_APP_IMAGE_ID" \
       PREVIOUS_WORKER_WAS_RUNNING="$PREVIOUS_WORKER_WAS_RUNNING" \
       PREVIOUS_WORKER_IMAGE_ID="$PREVIOUS_WORKER_IMAGE_ID" \
       PREVIOUS_SCHEDULER_WAS_RUNNING="$PREVIOUS_SCHEDULER_WAS_RUNNING" \
       PREVIOUS_SCHEDULER_IMAGE_ID="$PREVIOUS_SCHEDULER_IMAGE_ID" \
       sh "$PRE_MIGRATION_RECOVERY_SCRIPT"; then
      echo "Production database migration did not start; the previous runtime was restored automatically." >&2
      if [ -n "$BACKUP_FILE" ]; then
        echo "PRE-MIGRATION DATABASE BACKUP RETAINED: $BACKUP_FILE" >&2
      fi
      return
    fi
    echo "Automatic pre-migration runtime recovery failed; manual recovery is required." >&2
  fi
  echo "Deployment failed. No database restore is performed automatically." >&2
  if [ -n "$ROLLBACK_IMAGE_TARGET" ] && [ -n "$ROLLBACK_RELEASE_REF" ]; then
    rollback_command="ROLLBACK_ENHE_AI_TOOLS=ROLLBACK_ENHE_AI_TOOLS ROLLBACK_IMAGE=$ROLLBACK_IMAGE_TARGET ROLLBACK_RELEASE_REF=$ROLLBACK_RELEASE_REF ROLLBACK_RELEASE_VERIFIED=$ROLLBACK_RELEASE_VERIFIED ROLLBACK_TOPOLOGY=$ROLLBACK_TOPOLOGY"
    if [ "$ROLLBACK_RELEASE_VERIFIED" = "0" ]; then
      rollback_command="$rollback_command ROLLBACK_LEGACY_IMAGE_ID=$ROLLBACK_LEGACY_IMAGE_ID"
    fi
    echo "RECOVERY STEP 1 - APPLICATION ROLLBACK: $rollback_command sh $APP_DIR/deploy/enhe-ai-tools/scripts/enhe-rollback-app.sh" >&2
  fi
  if [ -n "$BACKUP_FILE" ]; then
    echo "PRE-MIGRATION DATABASE BACKUP RETAINED: $BACKUP_FILE" >&2
    echo "Do not restore automatically after the new runtime may have accepted writes." >&2
    echo "LAST-RESORT DATABASE RESTORE (creates a pre-restore snapshot first): RESTORE_ENHE_AI_TOOLS=RESTORE_ENHE_AI_TOOLS sh $APP_DIR/deploy/enhe-ai-tools/scripts/enhe-restore-db.sh $BACKUP_FILE" >&2
  fi
}

container_is_healthy() {
  status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$1" 2>/dev/null || true)"
  [ "$status" = "healthy" ]
}

trap show_recovery_commands EXIT
trap 'exit 1' HUP INT TERM

cd "$APP_DIR"
APP_IMAGE_TAG="$RELEASE_REF"
export RELEASE_REF APP_IMAGE_TAG
compose config -q

if ! docker volume inspect "$EXPECTED_DB_VOLUME" >/dev/null 2>&1; then
  echo "Required production database volume is missing: $EXPECTED_DB_VOLUME" >&2
  exit 1
fi

if docker container inspect enhe-ai-tools-db >/dev/null 2>&1; then
  existing_db_volume="$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Name}}{{end}}{{end}}' enhe-ai-tools-db)"
  if [ "$existing_db_volume" != "$EXPECTED_DB_VOLUME" ]; then
    echo "Database container is mounted to an unexpected volume." >&2
    exit 1
  fi
fi

if docker container inspect enhe-ai-tools-app >/dev/null 2>&1; then
  previous_image_id="$(docker inspect --format '{{.Image}}' enhe-ai-tools-app)"
  previous_image_digest="${previous_image_id#sha256:}"
  previous_image_short="$(printf '%s' "$previous_image_digest" | cut -c1-12)"
  case "$previous_image_short" in
    ""|*[!0-9a-fA-F]*)
      echo "Could not derive a stable rollback image identity." >&2
      exit 1
      ;;
  esac
  if [ "${#previous_image_short}" -ne 12 ]; then
    echo "Could not derive a stable rollback image identity." >&2
    exit 1
  fi

  ROLLBACK_LEGACY_IMAGE_ID="$previous_image_id"
  previous_release_ref="$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$previous_image_id" 2>/dev/null || true)"
  if is_release_ref "$previous_release_ref"; then
    ROLLBACK_RELEASE_VERIFIED=1
    if docker run --rm --entrypoint sh "$previous_image_id" -c \
      'test -f /app/deploy/enhe-ai-tools/scripts/seo-audit-worker.mjs && test -f /app/deploy/enhe-ai-tools/scripts/seo-audit-scheduler.mjs' \
      >/dev/null 2>&1; then
      ROLLBACK_TOPOLOGY=full
    else
      ROLLBACK_TOPOLOGY=app-only
    fi
  else
    previous_release_ref="$(printf '%s' "$previous_image_digest" | cut -c1-40)"
    if ! is_release_ref "$previous_release_ref"; then
      echo "Cannot derive a legacy rollback identity from the running image." >&2
      exit 1
    fi
    ROLLBACK_RELEASE_VERIFIED=0
    ROLLBACK_TOPOLOGY=app-only
  fi
  ROLLBACK_RELEASE_REF="$(printf '%s' "$previous_release_ref" | tr 'A-F' 'a-f')"
  ROLLBACK_IMAGE_TAG="rollback-$RELEASE_REF-$previous_image_short"
  existing_rollback_image_id="$(docker image inspect --format '{{.Id}}' "enhe-ai-tools:$ROLLBACK_IMAGE_TAG" 2>/dev/null || true)"
  if [ -z "$existing_rollback_image_id" ]; then
    docker image tag "$previous_image_id" "enhe-ai-tools:$ROLLBACK_IMAGE_TAG"
  elif [ "$existing_rollback_image_id" != "$previous_image_id" ]; then
    echo "Immutable rollback tag already points to a different image." >&2
    exit 1
  fi
  ROLLBACK_IMAGE_TARGET="$ROLLBACK_IMAGE_TAG"
fi

compose build app
built_release_ref="$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "enhe-ai-tools:$RELEASE_REF")"
if [ "$built_release_ref" != "$RELEASE_REF" ]; then
  echo "Built image release label does not match RELEASE_REF." >&2
  exit 1
fi
compose run --rm --no-deps app \
  node --import tsx deploy/enhe-ai-tools/scripts/validate-deploy-config.ts
compose run --rm --no-deps seo-audit-worker node -e '
  const { createHash } = require("node:crypto");
  const { readFileSync } = require("node:fs");
  const expected = process.env.SEO_AUDIT_ENGINE_SHA256.toLowerCase();
  const actual = createHash("sha256").update(readFileSync(process.env.SEO_AUDIT_ENGINE_PATH)).digest("hex");
  if (actual !== expected) { console.error("SEO audit engine checksum mismatch."); process.exit(1); }
'

compose up -d db

attempt=1
while ! compose exec -T db sh -lc 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >/dev/null 2>&1; do
  if [ "$attempt" -ge 30 ]; then
    echo "Database did not become healthy." >&2
    exit 1
  fi
  attempt=$((attempt + 1))
  sleep 2
done

mounted_db_volume="$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Name}}{{end}}{{end}}' enhe-ai-tools-db)"
if [ "$mounted_db_volume" != "$EXPECTED_DB_VOLUME" ]; then
  echo "Database volume identity check failed after startup." >&2
  exit 1
fi

compose exec -T db sh -lc \
  'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  < "$APP_DIR/deploy/enhe-ai-tools/scripts/preflight-production-database.sql"

if docker container inspect enhe-ai-tools-app >/dev/null 2>&1; then
  PREVIOUS_APP_IMAGE_ID="$(docker inspect --format '{{.Image}}' enhe-ai-tools-app)"
  if [ "$(docker inspect --format '{{.State.Running}}' enhe-ai-tools-app)" = "true" ]; then
    PREVIOUS_APP_WAS_RUNNING=1
  fi
fi
if docker container inspect enhe-ai-tools-seo-audit-worker >/dev/null 2>&1; then
  PREVIOUS_WORKER_IMAGE_ID="$(docker inspect --format '{{.Image}}' enhe-ai-tools-seo-audit-worker)"
  if [ "$(docker inspect --format '{{.State.Running}}' enhe-ai-tools-seo-audit-worker)" = "true" ]; then
    PREVIOUS_WORKER_WAS_RUNNING=1
  fi
fi
if docker container inspect enhe-ai-tools-seo-audit-scheduler >/dev/null 2>&1; then
  PREVIOUS_SCHEDULER_IMAGE_ID="$(docker inspect --format '{{.Image}}' enhe-ai-tools-seo-audit-scheduler)"
  if [ "$(docker inspect --format '{{.State.Running}}' enhe-ai-tools-seo-audit-scheduler)" = "true" ]; then
    PREVIOUS_SCHEDULER_WAS_RUNNING=1
  fi
fi
WRITER_QUIESCE_STARTED=1
compose stop seo-audit-worker seo-audit-scheduler app || true
for writer_container in \
  enhe-ai-tools-seo-audit-worker \
  enhe-ai-tools-seo-audit-scheduler \
  enhe-ai-tools-app; do
  if docker container inspect "$writer_container" >/dev/null 2>&1 && \
     [ "$(docker inspect --format '{{.State.Running}}' "$writer_container")" = "true" ]; then
    echo "Database writer did not stop: $writer_container" >&2
    exit 1
  fi
done
mkdir -p "$RUNTIME_DIR"
rm -f \
  "$RUNTIME_DIR/seo-audit-worker-heartbeat.json" \
  "$RUNTIME_DIR/seo-audit-scheduler-heartbeat.json"

BACKUP_FILE="$(sh "$APP_DIR/deploy/enhe-ai-tools/scripts/enhe-backup-db.sh")"
test -f "$BACKUP_FILE"
compose exec -T db pg_restore --list < "$BACKUP_FILE" > /dev/null

if [ -n "$ROLLBACK_IMAGE_TARGET" ]; then
  sh "$ROLLBACK_COMPATIBILITY_SCRIPT" \
    "$BACKUP_FILE" \
    "enhe-ai-tools:$ROLLBACK_IMAGE_TARGET" \
    "$ROLLBACK_RELEASE_REF" \
    "enhe-ai-tools:$RELEASE_REF" \
    "$RELEASE_REF"
fi

PRODUCTION_MIGRATION_STARTED=1
compose run --rm --no-deps app sh -lc \
  'cd /app && ./node_modules/.bin/prisma migrate deploy'

compose up -d --no-build --force-recreate app seo-audit-worker seo-audit-scheduler

attempt=1
while :; do
  if container_is_healthy enhe-ai-tools-app && \
     container_is_healthy enhe-ai-tools-seo-audit-worker && \
     container_is_healthy enhe-ai-tools-seo-audit-scheduler && \
     compose exec -T app node -e \
       "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"; then
    break
  fi
  if [ "$attempt" -ge 60 ]; then
    echo "Full runtime health check failed." >&2
    compose ps >&2
    compose logs --tail=80 app seo-audit-worker seo-audit-scheduler >&2
    exit 1
  fi
  attempt=$((attempt + 1))
  sleep 2
done

compose exec -T app sh -lc 'cd /app && ./node_modules/.bin/prisma migrate status'
compose ps
umask 077
active_state_tmp="$RUNTIME_DIR/active-release.env.tmp"
printf 'APP_IMAGE_TAG=%s\nRELEASE_REF=%s\nROLLBACK_TOPOLOGY=full\nRELEASE_IDENTITY_VERIFIED=1\nLEGACY_IMAGE_ID=\n' \
  "$RELEASE_REF" "$RELEASE_REF" > "$active_state_tmp"
mv "$active_state_tmp" "$RUNTIME_DIR/active-release.env"
DEPLOYMENT_COMPLETE=1
echo "Deployment completed for release $RELEASE_REF."
