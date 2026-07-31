#!/bin/sh

acquire_enhe_operation_lock() {
  : "${APP_DIR:?APP_DIR is required before acquiring the ENHE operation lock}"

  lock_dir="$APP_DIR/deploy/enhe-ai-tools/runtime"
  mkdir -p "$lock_dir"
  lock_dir="$(cd "$lock_dir" && pwd -P)"
  lock_file="$lock_dir/enhe-operation.lock"

  if [ "${ENHE_OPERATION_LOCK_HELD:-}" = "1" ]; then
    inherited_lock="$(readlink /proc/self/fd/9 2>/dev/null || true)"
    if [ "$inherited_lock" != "$lock_file" ] || \
       [ "${ENHE_OPERATION_LOCK_FILE:-}" != "$lock_file" ] || \
       ! flock -n 9; then
      echo "Inherited ENHE operation lock is invalid." >&2
      exit 1
    fi
    return
  fi

  exec 9>"$lock_file"
  if ! flock -n 9; then
    echo "Another ENHE deployment, rollback, restore, start, stop, or backup operation is running." >&2
    exit 75
  fi

  ENHE_OPERATION_LOCK_HELD=1
  ENHE_OPERATION_LOCK_FILE="$lock_file"
  export ENHE_OPERATION_LOCK_HELD ENHE_OPERATION_LOCK_FILE
}
