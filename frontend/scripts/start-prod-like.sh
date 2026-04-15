#!/bin/sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
APP_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
PORT_VALUE=${PORT:-3000}
BACKEND_VALUE=${BACKEND_INTERNAL_URL:-}
DETACH_VALUE=${DETACH:-0}
RESTART_VALUE=${RESTART:-0}
RUNTIME_DIR="$APP_DIR/.runtime/prod-like"
PID_DIR="$RUNTIME_DIR/run"
LOG_DIR="$RUNTIME_DIR/logs"
PID_FILE="$PID_DIR/prod-like-$PORT_VALUE.pid"
LOG_FILE="$LOG_DIR/prod-like-$PORT_VALUE.log"

mkdir -p "$PID_DIR" "$LOG_DIR"

get_port_listener_pid() {
  if ! command -v lsof >/dev/null 2>&1; then
    return 1
  fi

  lsof -tiTCP:"$PORT_VALUE" -sTCP:LISTEN 2>/dev/null | head -n 1
}

stop_pid_and_wait() {
  TARGET_PID=$1
  LABEL=$2

  echo "[start-prod-like] Stopping $LABEL pid $TARGET_PID on port $PORT_VALUE"
  kill "$TARGET_PID"

  WAIT_COUNT=0
  while kill -0 "$TARGET_PID" 2>/dev/null; do
    WAIT_COUNT=$((WAIT_COUNT + 1))
    if [ "$WAIT_COUNT" -ge 50 ]; then
      echo "[start-prod-like] Timed out waiting for pid $TARGET_PID to exit"
      return 1
    fi
    sleep 0.1
  done

  return 0
}

cd "$APP_DIR"

STANDALONE_DIR="$APP_DIR/.next/standalone/frontend"
STATIC_TARGET_DIR="$STANDALONE_DIR/.next/static"
PUBLIC_TARGET_DIR="$STANDALONE_DIR/public"

if [ -z "$BACKEND_VALUE" ]; then
  echo "[start-prod-like] Warning: BACKEND_INTERNAL_URL is not set in the current shell."
  echo "[start-prod-like] If the backend is still running in Docker local, use BACKEND_INTERNAL_URL=http://localhost:8081."
fi

if [ "$DETACH_VALUE" = "1" ]; then
  if [ -f "$PID_FILE" ]; then
    EXISTING_PID=$(cat "$PID_FILE")
    if kill -0 "$EXISTING_PID" 2>/dev/null; then
      if [ "$RESTART_VALUE" = "1" ]; then
        stop_pid_and_wait "$EXISTING_PID" "tracked"
      else
        echo "[start-prod-like] Already running on port $PORT_VALUE with pid $EXISTING_PID"
        echo "[start-prod-like] Logs: $LOG_FILE"
        exit 0
      fi
    fi
    rm -f "$PID_FILE"
  fi

  LISTENER_PID=$(get_port_listener_pid || true)
  if [ -n "${LISTENER_PID:-}" ]; then
    if [ "$RESTART_VALUE" = "1" ]; then
      stop_pid_and_wait "$LISTENER_PID" "untracked"
    else
      echo "[start-prod-like] Port $PORT_VALUE is already in use by pid $LISTENER_PID"
      echo "[start-prod-like] Stop it first or rerun with RESTART=1"
      exit 1
    fi
  fi
fi

echo "[start-prod-like] Building frontend..."
npm run build

rm -rf "$STATIC_TARGET_DIR"
cp -R "$APP_DIR/.next/static" "$STATIC_TARGET_DIR"

rm -rf "$PUBLIC_TARGET_DIR"
cp -R "$APP_DIR/public" "$PUBLIC_TARGET_DIR"

if [ "$DETACH_VALUE" = "1" ]; then
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