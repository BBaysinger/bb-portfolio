#!/bin/sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
APP_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
PORT_VALUE=${PORT:-3000}
BACKEND_VALUE=${BACKEND_INTERNAL_URL:-}
DETACH_VALUE=${DETACH:-0}

cd "$APP_DIR"

echo "[start-prod-like] Building frontend..."
npm run build

STANDALONE_DIR="$APP_DIR/.next/standalone/frontend"
STATIC_TARGET_DIR="$STANDALONE_DIR/.next/static"
PUBLIC_TARGET_DIR="$STANDALONE_DIR/public"
PID_DIR="$APP_DIR/.next/run"
LOG_DIR="$APP_DIR/.next/logs"
PID_FILE="$PID_DIR/prod-like-$PORT_VALUE.pid"
LOG_FILE="$LOG_DIR/prod-like-$PORT_VALUE.log"

mkdir -p "$PID_DIR" "$LOG_DIR"
rm -rf "$STATIC_TARGET_DIR"
cp -R "$APP_DIR/.next/static" "$STATIC_TARGET_DIR"

rm -rf "$PUBLIC_TARGET_DIR"
cp -R "$APP_DIR/public" "$PUBLIC_TARGET_DIR"

if [ -z "$BACKEND_VALUE" ]; then
  echo "[start-prod-like] Warning: BACKEND_INTERNAL_URL is not set in the current shell."
  echo "[start-prod-like] If the backend is still running in Docker local, use BACKEND_INTERNAL_URL=http://localhost:8081."
fi

if [ "$DETACH_VALUE" = "1" ]; then
  if [ -f "$PID_FILE" ]; then
    EXISTING_PID=$(cat "$PID_FILE")
    if kill -0 "$EXISTING_PID" 2>/dev/null; then
      echo "[start-prod-like] Already running on port $PORT_VALUE with pid $EXISTING_PID"
      echo "[start-prod-like] Logs: $LOG_FILE"
      exit 0
    fi
    rm -f "$PID_FILE"
  fi

  echo "[start-prod-like] Starting detached standalone server on port $PORT_VALUE"
  nohup env PORT="$PORT_VALUE" BACKEND_INTERNAL_URL="$BACKEND_VALUE" \
    node "$STANDALONE_DIR/server.js" >"$LOG_FILE" 2>&1 &
  SERVER_PID=$!
  echo "$SERVER_PID" >"$PID_FILE"
  echo "[start-prod-like] PID: $SERVER_PID"
  echo "[start-prod-like] Logs: $LOG_FILE"
  exit 0
fi

echo "[start-prod-like] Starting standalone server on port $PORT_VALUE"
exec env PORT="$PORT_VALUE" node "$STANDALONE_DIR/server.js"