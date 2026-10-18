#!/bin/sh
set -eu
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT HUP INT TERM
export APP_DIR="$TMP/app"
scripts="$APP_DIR/deploy/enhe-ai-tools/scripts"
mkdir -p "$scripts" "$TMP/bin"
cp "$ROOT/deploy/enhe-ai-tools/scripts/enhe-operation-lock.sh" \
   "$ROOT/deploy/enhe-ai-tools/scripts/enhe-runtime-user.sh" \
   "$ROOT/deploy/enhe-ai-tools/scripts/enhe-rollback-app.sh" \
   "$ROOT/deploy/enhe-ai-tools/scripts/enhe-start.sh" \
   "$ROOT/deploy/enhe-ai-tools/scripts/legacy-rollback-compatibility.cjs" "$scripts/"
: > "$APP_DIR/deploy/enhe-ai-tools/.env"
: > "$APP_DIR/zpay.env"
export MOCK_RELEASE=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
export MOCK_IMAGE_ID=sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
export MOCK_LOG="$TMP/docker.log"
export MOCK_OVERRIDE="$TMP/override.json"
cat > "$TMP/bin/docker" <<'EOF'
#!/bin/sh
set -eu
printf '%s\n' "$*" >> "$MOCK_LOG"
case "$1" in
  image)
    case "$*" in
      *'{{.Config.User}}'*) printf '%s\n' "${MOCK_IMAGE_USER:-}" ;;
      *'{{.Id}}'*) printf '%s\n' "$MOCK_IMAGE_ID" ;;
      *) printf '%s\n' "$MOCK_RELEASE" ;;
    esac ;;
  inspect) printf 'healthy\n' ;;
  compose)
    for arg in "$@"; do
      case "$arg" in *.runtime-user.*.json) cp "$arg" "$MOCK_OVERRIDE" ;; esac
    done ;;
esac
EOF
chmod +x "$TMP/bin/docker"
export PATH="$TMP/bin:$PATH"
fail() { echo "[runtime-user-test] $*" >&2; exit 1; }
rollback() {
  ROLLBACK_ENHE_AI_TOOLS=ROLLBACK_ENHE_AI_TOOLS ROLLBACK_IMAGE="$MOCK_RELEASE" \
    ROLLBACK_RELEASE_REF="$MOCK_RELEASE" ROLLBACK_RELEASE_VERIFIED=1 ROLLBACK_TOPOLOGY=full \
    sh "$scripts/enhe-rollback-app.sh"
}

# The old image predates USER node. Explicit rollback must recover as root,
# while leaving production Compose's normal user setting untouched.
: > "$MOCK_LOG"
rollback >/dev/null
grep -q '"user":"0:0"' "$MOCK_OVERRIDE" || fail 'legacy root image was not restored with its actual user'
grep -q '"cap_add":\["DAC_OVERRIDE"\]' "$MOCK_OVERRIDE" || fail 'legacy root cannot write current node-owned private mounts'
grep -q 'up -d --no-build --force-recreate db app seo-audit-worker seo-audit-scheduler' "$MOCK_LOG" || fail 'full old runtime was not restored'
if find "$APP_DIR" -name '.runtime-user.*.json' | grep -q .; then fail 'temporary privilege override leaked after rollback'; fi
sh "$scripts/enhe-start.sh" >/dev/null
grep -q '"user":"0:0"' "$MOCK_OVERRIDE" || fail 'restart of persisted old release lost its original user'

# New non-root images remain non-root even through rollback/start workflows.
MOCK_IMAGE_USER=node rollback >/dev/null
grep -q '"user":"1000:1000"' "$MOCK_OVERRIDE" || fail 'new image rollback escalated to root'
if grep -q 'cap_add' "$MOCK_OVERRIDE"; then fail 'normal node rollback received root-only capability'; fi
MOCK_IMAGE_USER=1000:1000 sh "$scripts/enhe-start.sh" >/dev/null
grep -q '"user":"1000:1000"' "$MOCK_OVERRIDE" || fail 'new image restart escalated to root'

# A changed/unknown user is rejected before config, stopping or recreating.
: > "$MOCK_LOG"
if MOCK_IMAGE_USER=daemon rollback >/dev/null 2>&1; then fail 'unknown rollback user accepted'; fi
if grep -q '^compose' "$MOCK_LOG"; then fail 'unknown user reached mutating Compose phase'; fi
if find "$APP_DIR" -name '.runtime-user.*.json' | grep -q .; then fail 'failed rollback left an override'; fi
grep -q 'user: "1000:1000"' "$ROOT/deploy/enhe-ai-tools/docker-compose.yml" || fail 'normal production no longer pins node user'
echo '[runtime-user-test] root legacy rollback/restart, non-root rollback/restart, unknown-user refusal and override cleanup passed'
