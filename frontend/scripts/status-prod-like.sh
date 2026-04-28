#!/bin/sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
APP_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
PORT_VALUE=${PORT:-3000}
RUNTIME_DIR="$APP_DIR/.runtime/prod-like"
PID_FILE="$RUNTIME_DIR/run/prod-like-$PORT_VALUE.pid"
LOG_FILE="$RUNTIME_DIR/logs/prod-like-$PORT_VALUE.log"

get_port_listener_pid() {
  if ! command -v lsof >/dev/null 2>&1; then
    return 1
  fi

  lsof -tiTCP:"$PORT_VALUE" -sTCP:LISTEN 2>/dev/null | head -n 1
}

if [ ! -f "$PID_FILE" ]; then
  LISTENER_PID=$(get_port_listener_pid || true)
  if [ -n "${LISTENER_PID:-}" ]; then
    echo "[status-prod-like] Running (untracked)"
    echo "[status-prod-like] Port: $PORT_VALUE"
    echo "[status-prod-like] PID: $LISTENER_PID"
    echo "[status-prod-like] Log file: $LOG_FILE"
    exit 0
  fi

  echo "[status-prod-like] Not running on port $PORT_VALUE"
  echo "[status-prod-like] Expected pid file: $PID_FILE"
  echo "[status-prod-like] Expected log file: $LOG_FILE"
  exit 0
fi

SERVER_PID=$(cat "$PID_FILE")

if ! kill -0 "$SERVER_PID" 2>/dev/null; then
  echo "[status-prod-like] Stale pid file for port $PORT_VALUE"
  echo "[status-prod-like] PID in file: $SERVER_PID"
  echo "[status-prod-like] Log file: $LOG_FILE"
  exit 0
fi

echo "[status-prod-like] Running"
echo "[status-prod-like] Port: $PORT_VALUE"
echo "[status-prod-like] PID: $SERVER_PID"
echo "[status-prod-like] Log file: $LOG_FILE"
