#!/bin/sh
set -eu

log() { printf "[%s] %s\n" "frontend-entry" "$*"; }

CACHE_DIR="${NPM_CONFIG_CACHE:-/app/.npm-cache}"
mkdir -p "$CACHE_DIR" || true
log "Using npm cache at $CACHE_DIR"

NEED_INSTALL=0
if [ -x node_modules/.bin/next ]; then
  log "Dependencies present."
else
  NEED_INSTALL=1
fi

if [ "$NEED_INSTALL" -eq 1 ]; then
  rm -rf node_modules .next || true
  log "Installing dependencies (npm ci || npm install)..."
  npm ci || npm install
fi

PORT="${PORT:-3000}"
log "Starting frontend dev on port $PORT"
exec npm run dev
#!/bin/sh
set -eu

# Configurable thresholds (percent)
WARN_PCT="${DISK_WARN_PCT:-85}"
FAIL_PCT="${DISK_FAIL_PCT:-95}"
# Space-separated list of paths to check
CHECK_PATHS="${DISK_CHECK_PATHS:-/tmp /app}"

log() { printf "[%s] %s\n" "entrypoint" "$*"; }

check_path() {
  dir="$1"
  # Use POSIX df output; strip % sign
  used_pct=$(df -P "$dir" 2>/dev/null | awk 'NR==2 {gsub(/%/,"",$5); print $5}') || used_pct=0
  if [ -z "$used_pct" ]; then used_pct=0; fi
  if [ "$used_pct" -ge "$FAIL_PCT" ]; then
    log "ERROR: Disk usage on $dir is ${used_pct}% (>= ${FAIL_PCT}%). Failing fast to avoid crash loops."
    exit 70
  elif [ "$used_pct" -ge "$WARN_PCT" ]; then
    log "WARNING: Disk usage on $dir is ${used_pct}% (>= ${WARN_PCT}%). Consider pruning Docker images/volumes."
  else
    log "OK: Disk usage on $dir is ${used_pct}% (< ${WARN_PCT}%)."
  fi
}

log "Starting dev entrypoint..."
for p in $CHECK_PATHS; do
  check_path "$p"
done

# Ensure npm cache exists (default moved away from /tmp)
CACHE_DIR="${NPM_CONFIG_CACHE:-/app/.npm-cache}"
mkdir -p "$CACHE_DIR" || true
log "Using npm cache at $CACHE_DIR"

# Install deps if missing, then start dev server
if [ -x node_modules/.bin/next ]; then
  log "Dependencies present."
else
  log "Installing dependencies (npm ci || npm install)..."
  npm ci || npm install
fi

log "Starting dev server (npm run dev)"
exec npm run dev
