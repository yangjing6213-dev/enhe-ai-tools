#!/bin/sh
set -eu

APP_DIR="/opt/enhe-ai-tools"

cd "$APP_DIR"
docker compose -f deploy/enhe-ai-tools/docker-compose.yml up -d --build
docker compose -f deploy/enhe-ai-tools/docker-compose.yml ps
