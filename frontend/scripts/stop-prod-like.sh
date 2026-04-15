#!/bin/sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
APP_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
PORT_VALUE=${PORT:-3000}
RUNTIME_DIR="$APP_DIR/.runtime/prod-like"
PID_FILE="$RUNTIME_DIR/run/prod-like-$PORT_VALUE.pid"

get_port_listener_pid() {
  if ! command -v lsof >/dev/null 2>&1; then
    return 1
  fi

  lsof -tiTCP:"$PORT_VALUE" -sTCP:LISTEN 2>/dev/null | head -n 1
}

if [ ! -f "$PID_FILE" ]; then
  LISTENER_PID=$(get_port_listener_pid || true)
  if [ -n "${LISTENER_PID:-}" ]; then
    echo "[stop-prod-like] Stopping untracked pid $LISTENER_PID on port $PORT_VALUE"
    kill "$LISTENER_PID"
    exit 0
  fi

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