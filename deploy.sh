#!/bin/sh
set -eu

APP_DIR="${APP_DIR:-/opt/enhe-ai-tools}"
COMPOSE_FILE="$APP_DIR/deploy/enhe-ai-tools/docker-compose.yml"
ENV_FILE="${ENHE_ENV_FILE:-$APP_DIR/deploy/enhe-ai-tools/.env}"
RELEASE_REF="${RELEASE_REF:-}"
BACKUP_FILE=""
PREVIOUS_RELEASE_REF=""
DEPLOYMENT_COMPLETE=0

case "$RELEASE_REF" in
  ""|*[!0-9a-fA-F]*)
    echo "RELEASE_REF must be exactly 40 hexadecimal characters." >&2
    exit 1
    ;;
esac
if [ "${#RELEASE_REF}" -ne 40 ]; then
  echo "RELEASE_REF must be exactly 40 hexadecimal characters." >&2
  exit 1
fi
if [ ! -f "$ENV_FILE" ]; then
  echo "Missing environment file: $ENV_FILE" >&2
  exit 1
fi
set -a
. "$ENV_FILE"
set +a
: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"
: "${AUTH_COOKIE_NAME:?AUTH_COOKIE_NAME is required}"
: "${AUTH_SECRET:?AUTH_SECRET is required}"
: "${APP_URL:?APP_URL is required}"
: "${NEXT_PUBLIC_APP_URL:?NEXT_PUBLIC_APP_URL is required}"
: "${NEXT_PUBLIC_SITE_URL:?NEXT_PUBLIC_SITE_URL is required}"
: "${AUDIT_WORKER_TOKEN_CURRENT:?AUDIT_WORKER_TOKEN_CURRENT is required}"
: "${SEO_AUDIT_ANONYMOUS_HMAC_SECRET:?SEO_AUDIT_ANONYMOUS_HMAC_SECRET is required}"
: "${SEO_AUDIT_ENGINE_HOST_PATH:?SEO_AUDIT_ENGINE_HOST_PATH is required}"
: "${SEO_AUDIT_ENGINE_SHA256:?SEO_AUDIT_ENGINE_SHA256 is required}"
: "${ZPAY_MODE:?ZPAY_MODE is required}"

for site_origin in "$APP_URL" "$NEXT_PUBLIC_APP_URL" "$NEXT_PUBLIC_SITE_URL"; do
  case "$site_origin" in
    http://*|https://*) ;;
    *)
      echo "APP_URL, NEXT_PUBLIC_APP_URL, and NEXT_PUBLIC_SITE_URL must be http(s) origins." >&2
      exit 1
      ;;
  esac
done
if [ "${#AUTH_SECRET}" -lt 32 ]; then
  echo "AUTH_SECRET must contain at least 32 characters." >&2
  exit 1
fi
if [ "${#AUDIT_WORKER_TOKEN_CURRENT}" -lt 24 ] ||
   [ "${#AUDIT_WORKER_TOKEN_CURRENT}" -gt 512 ]; then
  echo "AUDIT_WORKER_TOKEN_CURRENT must contain 24 to 512 characters." >&2
  exit 1
fi
case "$AUDIT_WORKER_TOKEN_CURRENT" in
  *[[:space:]]*)
    echo "AUDIT_WORKER_TOKEN_CURRENT must not contain whitespace." >&2
    exit 1
    ;;
esac
if [ "${#SEO_AUDIT_ANONYMOUS_HMAC_SECRET}" -lt 32 ]; then
  echo "SEO_AUDIT_ANONYMOUS_HMAC_SECRET must contain at least 32 characters." >&2
  exit 1
fi
case "$SEO_AUDIT_ENGINE_HOST_PATH" in
  /*) ;;
  *)
    echo "SEO_AUDIT_ENGINE_HOST_PATH must be absolute." >&2
    exit 1
    ;;
esac
if [ ! -f "$SEO_AUDIT_ENGINE_HOST_PATH" ]; then
  echo "SEO audit engine not found: $SEO_AUDIT_ENGINE_HOST_PATH" >&2
  exit 1
fi
case "$SEO_AUDIT_ENGINE_SHA256" in
  *[!0-9a-fA-F]*)
    echo "SEO_AUDIT_ENGINE_SHA256 must be a 64-character hexadecimal digest." >&2
    exit 1
    ;;
esac
if [ "${#SEO_AUDIT_ENGINE_SHA256}" -ne 64 ]; then
  echo "SEO_AUDIT_ENGINE_SHA256 must be a 64-character hexadecimal digest." >&2
  exit 1
fi
expected_engine_sha256="$(printf '%s' "$SEO_AUDIT_ENGINE_SHA256" | tr 'A-F' 'a-f')"
actual_engine_sha256="$(sha256sum "$SEO_AUDIT_ENGINE_HOST_PATH" | awk '{print $1}')"
if [ "$actual_engine_sha256" != "$expected_engine_sha256" ]; then
  echo "SEO audit engine checksum mismatch." >&2
  exit 1
fi
case "$ZPAY_MODE" in
  live)
    : "${ZPAY_PID:?ZPAY_PID is required when ZPAY_MODE=live}"
    : "${ZPAY_KEY:?ZPAY_KEY is required when ZPAY_MODE=live}"
    ;;
  disabled) ;;
  *)
    echo "ZPAY_MODE must be disabled or live." >&2
    exit 1
    ;;
esac
case "${ADMIN_EMAIL_NOTIFICATIONS_ENABLED:-}" in
  true)
    : "${ADMIN_ALERT_EMAILS:?ADMIN_ALERT_EMAILS is required when email notifications are enabled}"
    : "${SMTP_HOST:?SMTP_HOST is required when email notifications are enabled}"
    : "${SMTP_PORT:?SMTP_PORT is required when email notifications are enabled}"
    : "${SMTP_USER:?SMTP_USER is required when email notifications are enabled}"
    : "${SMTP_PASSWORD:?SMTP_PASSWORD is required when email notifications are enabled}"
    : "${SMTP_FROM:?SMTP_FROM is required when email notifications are enabled}"
    ;;
  ""|false) ;;
  *)
    echo "ADMIN_EMAIL_NOTIFICATIONS_ENABLED must be true or false." >&2
    exit 1
    ;;
esac

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

show_recovery_commands() {
  if [ "$DEPLOYMENT_COMPLETE" -eq 1 ]; then
    return
  fi
  echo "Deployment failed. No database restore is performed automatically." >&2
  if [ -n "$BACKUP_FILE" ]; then
    echo "RESTORE: RESTORE_ENHE_AI_TOOLS=RESTORE_ENHE_AI_TOOLS $APP_DIR/deploy/enhe-ai-tools/scripts/enhe-restore-db.sh $BACKUP_FILE" >&2
  fi
  if [ -n "$PREVIOUS_RELEASE_REF" ]; then
    echo "ROLLBACK: ROLLBACK_ENHE_AI_TOOLS=ROLLBACK_ENHE_AI_TOOLS ROLLBACK_IMAGE=$PREVIOUS_RELEASE_REF $APP_DIR/deploy/enhe-ai-tools/scripts/enhe-rollback-app.sh" >&2
  fi
}

trap show_recovery_commands EXIT
trap 'exit 1' HUP INT TERM

cd "$APP_DIR"
previous_image="$(docker inspect --format '{{.Config.Image}}' enhe-ai-tools-app 2>/dev/null || true)"
case "$previous_image" in
  enhe-ai-tools:*) PREVIOUS_RELEASE_REF="${previous_image#enhe-ai-tools:}" ;;
esac

export RELEASE_REF
compose build app
compose up -d db

attempt=1
while ! compose exec -T db pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; do
  if [ "$attempt" -ge 30 ]; then
    echo "Database did not become healthy." >&2
    exit 1
  fi
  attempt=$((attempt + 1))
  sleep 2
done

BACKUP_FILE="$("$APP_DIR/deploy/enhe-ai-tools/scripts/enhe-backup-db.sh")"
test -f "$BACKUP_FILE"
compose exec -T db pg_restore --list < "$BACKUP_FILE" > /dev/null

compose run --rm app sh -lc 'cd /app && ./node_modules/.bin/prisma migrate deploy'
compose up -d --no-build --force-recreate app seo-audit-worker seo-audit-scheduler

attempt=1
while ! compose exec -T app node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"; do
  if [ "$attempt" -ge 45 ]; then
    echo "Full runtime health check failed." >&2
    compose ps >&2
    compose logs --tail=80 app seo-audit-worker seo-audit-scheduler >&2
    exit 1
  fi
  attempt=$((attempt + 1))
  sleep 2
done

compose ps
DEPLOYMENT_COMPLETE=1
echo "Deployment completed for release $RELEASE_REF."
