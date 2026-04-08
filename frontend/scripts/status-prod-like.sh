#!/bin/sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
APP_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
PORT_VALUE=${PORT:-3000}
PID_FILE="$APP_DIR/.next/run/prod-like-$PORT_VALUE.pid"
LOG_FILE="$APP_DIR/.next/logs/prod-like-$PORT_VALUE.log"

if [ ! -f "$PID_FILE" ]; then
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