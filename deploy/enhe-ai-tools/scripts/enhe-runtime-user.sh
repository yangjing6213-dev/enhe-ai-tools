#!/bin/sh
# Used only when restoring/restarting a previously verified image. Normal
# deployment remains pinned to 1000:1000 in the production Compose file.
normalize_enhe_runtime_user() {
  case "$1" in
    ''|root|0|root:root|0:0) printf '0:0\n' ;;
    node|1000|node:node|1000:1000) printf '1000:1000\n' ;;
    *) echo 'Unknown runtime user; refusing to widen rollback privileges.' >&2; return 1 ;;
  esac
}

create_enhe_runtime_user_override_path() {
  runtime_dir="$1"
  temporary_path="$(mktemp "$runtime_dir/.runtime-user.XXXXXX")" || return 1
  override_path="$temporary_path.json"

  if ! ln "$temporary_path" "$override_path"; then
    rm -f "$temporary_path"
    return 1
  fi

  if ! rm -f "$temporary_path"; then
    rm -f "$override_path"
    return 1
  fi

  printf '%s\n' "$override_path"
}

write_enhe_runtime_user_override() {
  runtime_image_id="$1"
  runtime_override_path="$2"
  case "$runtime_image_id" in
    sha256:*) runtime_image_digest="${runtime_image_id#sha256:}" ;;
    *) echo 'Runtime user lookup requires an immutable image ID.' >&2; return 1 ;;
  esac
  case "$runtime_image_digest" in
    ''|*[!0-9a-fA-F]*) return 1 ;;
  esac
  [ "${#runtime_image_digest}" -eq 64 ] || return 1
  runtime_image_user="$(docker image inspect --format '{{.Config.User}}' "$runtime_image_id")" || return 1
  runtime_user="$(normalize_enhe_runtime_user "$runtime_image_user")" || return 1
  runtime_caps=''
  if [ "$runtime_user" = '0:0' ]; then
    # The old root image owns its cache, but current host mounts belong to node.
    # Restore only DAC_OVERRIDE for that verified historical image so both can
    # be written; retain cap_drop ALL and no-new-privileges from the base config.
    runtime_caps=',"cap_add":["DAC_OVERRIDE"]'
  fi
  # Only the validated user and root's single required capability differ.
  # Ports, mounts, resource limits and no-new-privileges remain unchanged.
  printf '{"services":{"app":{"user":"%s"%s},"seo-audit-worker":{"user":"%s"%s},"seo-audit-scheduler":{"user":"%s"%s}}}\n' \
    "$runtime_user" "$runtime_caps" "$runtime_user" "$runtime_caps" "$runtime_user" "$runtime_caps" > "$runtime_override_path"
  chmod 600 "$runtime_override_path"
}
