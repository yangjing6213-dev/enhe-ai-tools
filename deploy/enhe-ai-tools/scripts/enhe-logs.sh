#!/bin/sh
set -eu

case "${1:-app}" in
  app) container="enhe-ai-tools-app" ;;
  db) container="enhe-ai-tools-db" ;;
  worker|seo-audit-worker) container="enhe-ai-tools-seo-audit-worker" ;;
  scheduler|seo-audit-scheduler) container="enhe-ai-tools-seo-audit-scheduler" ;;
  *)
    echo "Service must be app, db, worker, or scheduler." >&2
    exit 1
    ;;
esac

docker logs --follow "$container"
