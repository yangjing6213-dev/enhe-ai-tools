#!/bin/sh
set -eu

cd /app

echo "[enhe-ai-tools] starting Next.js server on port 3000..."
exec node server.js
