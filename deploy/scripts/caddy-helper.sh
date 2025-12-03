#!/usr/bin/env zsh
set -euo pipefail

# Wrapper to run Caddy-related compose commands with a prune reminder.
# Warns if last prune is older than a threshold before running.

PROJECT_ROOT=${PROJECT_ROOT:-$(pwd)}
COMPOSE_FILE=${COMPOSE_FILE:-"$PROJECT_ROOT/deploy/compose/docker-compose.yml"}
COMPOSE_PROFILES=${COMPOSE_PROFILES:-"local,proxy"}
PRUNE_STATE_DIR=${PRUNE_STATE_DIR:-"$HOME/.bb-portfolio"}
PRUNE_STATE_FILE=${PRUNE_STATE_FILE:-"$PRUNE_STATE_DIR/last-prune"}
PRUNE_MAX_AGE_HOURS=${PRUNE_MAX_AGE_HOURS:-168} # default 7 days
PAYLOAD_PROXY_SERVER_URL=${PAYLOAD_PROXY_SERVER_URL:-"http://localhost:8080"}

usage() {
  cat <<EOF
Usage: $0 [up|down|stop|restart|logs]

Examples:
  $0 up       # start caddy + deps
  $0 down     # stop caddy only (no prune, no -v)
  $0 stop     # stop caddy only
  $0 restart  # restart caddy
  $0 logs     # tail caddy logs

Env vars:
  COMPOSE_FILE, COMPOSE_PROFILES, PRUNE_STATE_FILE, PRUNE_MAX_AGE_HOURS
EOF
}

warn_if_prune_stale() {
  if [[ -f "$PRUNE_STATE_FILE" ]]; then
    local last_ts=$(cat "$PRUNE_STATE_FILE")
    local last_epoch=$(date -j -f "%Y-%m-%dT%H:%M:%SZ" "$last_ts" +%s 2>/dev/null || date -u -d "$last_ts" +%s)
    local now_epoch=$(date +%s)
    local max_age_sec=$((PRUNE_MAX_AGE_HOURS * 3600))
    local age_sec=$((now_epoch - last_epoch))
    if (( age_sec > max_age_sec )); then
      echo "[caddy-helper] Reminder: Last prune at $last_ts (> ${PRUNE_MAX_AGE_HOURS}h). Consider: zsh deploy/scripts/docker-maintenance.sh"
    fi
  else
    echo "[caddy-helper] No prune record found. Consider: zsh deploy/scripts/docker-maintenance.sh"
  fi
}

cmd=${1:-}
[[ -z "$cmd" ]] && usage && exit 2

case "$cmd" in
  up)
    warn_if_prune_stale
    PAYLOAD_PUBLIC_SERVER_URL=${PAYLOAD_PUBLIC_SERVER_URL:-$PAYLOAD_PROXY_SERVER_URL} COMPOSE_PROFILES=$COMPOSE_PROFILES docker compose -f "$COMPOSE_FILE" up -d bb-portfolio-frontend-local caddy-local ;;
  down)
    warn_if_prune_stale
    PAYLOAD_PUBLIC_SERVER_URL=${PAYLOAD_PUBLIC_SERVER_URL:-$PAYLOAD_PROXY_SERVER_URL} COMPOSE_PROFILES=$COMPOSE_PROFILES docker compose -f "$COMPOSE_FILE" stop caddy-local ;;
  stop)
    warn_if_prune_stale
    PAYLOAD_PUBLIC_SERVER_URL=${PAYLOAD_PUBLIC_SERVER_URL:-$PAYLOAD_PROXY_SERVER_URL} COMPOSE_PROFILES=$COMPOSE_PROFILES docker compose -f "$COMPOSE_FILE" stop caddy-local ;;
  restart)
    warn_if_prune_stale
    PAYLOAD_PUBLIC_SERVER_URL=${PAYLOAD_PUBLIC_SERVER_URL:-$PAYLOAD_PROXY_SERVER_URL} COMPOSE_PROFILES=$COMPOSE_PROFILES docker compose -f "$COMPOSE_FILE" restart caddy-local ;;
  logs)
    PAYLOAD_PUBLIC_SERVER_URL=${PAYLOAD_PUBLIC_SERVER_URL:-$PAYLOAD_PROXY_SERVER_URL} COMPOSE_PROFILES=$COMPOSE_PROFILES docker compose -f "$COMPOSE_FILE" logs -f caddy-local ;;
  *)
    usage; exit 2;;
esac
