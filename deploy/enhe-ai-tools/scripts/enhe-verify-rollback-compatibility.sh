#!/bin/sh
set -eu

APP_DIR="${APP_DIR:-/opt/enhe-ai-tools}"
PROBE_FILE="$APP_DIR/deploy/enhe-ai-tools/scripts/legacy-rollback-compatibility.cjs"
backup_file="${1:-}"
rollback_image="${2:-}"
rollback_release_ref="${3:-}"
candidate_image="${4:-}"
candidate_release_ref="${5:-}"

is_release_ref() {
  case "$1" in
    ""|*[!0-9a-fA-F]*) return 1 ;;
  esac
  [ "${#1}" -eq 40 ]
}

test -f "$backup_file" || { echo "Rollback drill backup not found: $backup_file" >&2; exit 1; }
test -f "$PROBE_FILE" || { echo "Rollback compatibility probe not found: $PROBE_FILE" >&2; exit 1; }
test -n "$rollback_image" || { echo "Rollback image is required." >&2; exit 1; }
test -n "$candidate_image" || { echo "Candidate image is required." >&2; exit 1; }
is_release_ref "$rollback_release_ref" || {
  echo "Rollback release identity must be 40 hexadecimal characters." >&2
  exit 1
}
is_release_ref "$candidate_release_ref" || {
  echo "Candidate release identity must be 40 hexadecimal characters." >&2
  exit 1
}
docker image inspect "$rollback_image" >/dev/null
docker image inspect "$candidate_image" >/dev/null

nonce="$(date -u +%Y%m%d%H%M%S)-$$"
network="enhe-rollback-drill-$nonce"
volume="enhe-rollback-drill-$nonce"
db_container="enhe-rollback-db-$nonce"
rollback_app_container="enhe-rollback-app-$nonce"
candidate_app_container="enhe-candidate-app-$nonce"
db_name="rollback_compatibility"
db_user="rollback_compatibility"
db_password="compatibility_$(cat /proc/sys/kernel/random/uuid | tr -d '-')"
database_url="postgresql://$db_user:$db_password@$db_container:5432/$db_name?schema=public"

cleanup() {
  docker rm -f \
    "$rollback_app_container" \
    "$candidate_app_container" \
    "$db_container" >/dev/null 2>&1 || true
  docker volume rm -f "$volume" >/dev/null 2>&1 || true
  docker network rm "$network" >/dev/null 2>&1 || true
}
trap cleanup EXIT
trap 'exit 1' HUP INT TERM

run_app_health_probe() {
  probe_image="$1"
  probe_release_ref="$2"
  probe_container="$3"
  probe_label="$4"

  docker run -d \
    --name "$probe_container" \
    --network "$network" \
    -e "DATABASE_URL=$database_url" \
    -e "RELEASE_REF=$probe_release_ref" \
    -e "AUTH_SECRET=rollback-compatibility-drill-only" \
    -e "AUDIT_WORKER_TOKEN_CURRENT=rollback-compatibility-worker-token-20260731" \
    -e "SEO_AUDIT_ANONYMOUS_HMAC_SECRET=rollback-compatibility-anonymous-hmac-secret-20260731" \
    -e "APP_URL=http://127.0.0.1:3000" \
    -e "NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000" \
    -e "NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000" \
    -e "HOSTNAME=0.0.0.0" \
    -e "RUN_PRISMA_MIGRATE=0" \
    -e "ZPAY_MODE=disabled" \
    -e "SEO_AUDIT_MONITORING_SALES_ENABLED=false" \
    "$probe_image" >/dev/null

  attempt=1
  while ! docker exec "$probe_container" node -e \
    "fetch('http://127.0.0.1:3000/api/health?scope=app').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))" \
    >/dev/null 2>&1; do
    if [ "$attempt" -ge 60 ]; then
      echo "$probe_label image failed app health on the migrated database clone." >&2
      docker logs --tail=80 "$probe_container" >&2 || true
      exit 1
    fi
    attempt=$((attempt + 1))
    sleep 2
  done
  docker rm -f "$probe_container" >/dev/null
}

docker network create "$network" >/dev/null
docker volume create "$volume" >/dev/null
docker run -d \
  --name "$db_container" \
  --network "$network" \
  -e "POSTGRES_DB=$db_name" \
  -e "POSTGRES_USER=$db_user" \
  -e "POSTGRES_PASSWORD=$db_password" \
  -v "$volume:/var/lib/postgresql/data" \
  postgres:16-alpine >/dev/null

attempt=1
while ! docker exec "$db_container" psql -v ON_ERROR_STOP=1 -U "$db_user" -d "$db_name" -Atqc "SELECT 1" >/dev/null 2>&1; do
  if [ "$attempt" -ge 45 ]; then
    echo "Rollback compatibility database did not become ready." >&2
    exit 1
  fi
  attempt=$((attempt + 1))
  sleep 1
done

docker exec -i "$db_container" pg_restore --exit-on-error \
  --no-owner --no-privileges -U "$db_user" -d "$db_name" < "$backup_file"

docker run --rm \
  --network "$network" \
  --entrypoint sh \
  -e "DATABASE_URL=$database_url" \
  "$candidate_image" \
  -lc 'cd /app && ./node_modules/.bin/prisma migrate deploy'

run_app_health_probe "$candidate_image" "$candidate_release_ref" \
  "$candidate_app_container" "Candidate"

docker run --rm \
  --network "$network" \
  --entrypoint node \
  -e "DATABASE_URL=$database_url" \
  -v "$PROBE_FILE:/tmp/legacy-rollback-compatibility.cjs:ro" \
  "$rollback_image" \
  /tmp/legacy-rollback-compatibility.cjs

run_app_health_probe "$rollback_image" "$rollback_release_ref" \
  "$rollback_app_container" "Rollback"

echo "Rollback image compatibility drill passed on an isolated migrated database clone."
