#!/bin/sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
APP_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
PORT_VALUE=${PORT:-3000}
PID_FILE="$APP_DIR/.next/run/prod-like-$PORT_VALUE.pid"

if [ ! -f "$PID_FILE" ]; then
  echo "[stop-prod-like] No pid file found for port $PORT_VALUE"
  exit 0
fi

SERVER_PID=$(cat "$PID_FILE")

if kill -0 "$SERVER_PID" 2>/dev/null; then
  echo "[stop-prod-like] Stopping pid $SERVER_PID on port $PORT_VALUE"
  kill "$SERVER_PID"
else
  echo "[stop-prod-like] Process $SERVER_PID is not running"
fi

rm -f "$PID_FILE"