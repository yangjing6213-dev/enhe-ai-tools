#!/bin/sh
set -eu

APP_DIR="/opt/enhe-ai-tools"
SERVICE="${1:-app}"

cd "$APP_DIR"
docker compose -f deploy/enhe-ai-tools/docker-compose.yml logs -f "$SERVICE"
