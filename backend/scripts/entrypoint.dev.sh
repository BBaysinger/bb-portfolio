#!/bin/sh

# Dev container entrypoint.
#
# Responsibilities:
# - Fails fast if disk usage is critically high on key paths (to avoid crash loops).
# - Ensures an npm cache directory exists.
# - Ensures dependencies are installed and compatible, then starts the dev server.
#
# Usage:
#   ./scripts/entrypoint.dev.sh
#
# Environment:
# - DISK_WARN_PCT: warn when disk usage >= this percent (default: 85)
# - DISK_FAIL_PCT: exit 70 when disk usage >= this percent (default: 95)
# - DISK_CHECK_PATHS: space-separated list of paths to check (default: "/tmp /app")
# - NPM_CONFIG_CACHE: npm cache dir (default: /app/.npm-cache)
#
# Exit codes:
# - 70: disk usage over FAIL threshold
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
NEED_INSTALL=0
if [ -x node_modules/.bin/next ]; then
  # Check installed Next.js version and ensure it matches package.json major >=16
  if [ -f node_modules/next/package.json ]; then
    installed_ver=$(node -e 'console.log(require("./node_modules/next/package.json").version || "")') || installed_ver=""
    installed_major=$(echo "$installed_ver" | awk -F. '{print $1}')
    if [ -z "$installed_major" ] || [ "$installed_major" -lt 16 ]; then
      log "Detected Next.js $installed_ver (<16). Forcing clean install."
      NEED_INSTALL=1
    else
      log "Dependencies present. Next.js $installed_ver."
    fi
  else
    log "next/package.json missing; forcing install."
    NEED_INSTALL=1
  fi
else
  NEED_INSTALL=1
fi

if [ "$NEED_INSTALL" -eq 1 ]; then
  rm -rf node_modules .next || true
  log "Installing dependencies (npm ci || npm install)..."
  npm ci || npm install
fi

log "Starting dev server (npm run dev)"
exec npm run dev
