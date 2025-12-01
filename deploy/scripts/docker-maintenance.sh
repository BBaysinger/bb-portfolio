#!/usr/bin/env zsh
set -euo pipefail

# Docker maintenance script for local dev on macOS
# - Stops local/proxy services and removes anonymous volumes
# - Prunes unused containers, networks, images
# - Prunes unused volumes
# - Prunes old build caches (BuildKit/buildx)

PROJECT_ROOT=${PROJECT_ROOT:-$(pwd)}
COMPOSE_FILE=${COMPOSE_FILE:-"$PROJECT_ROOT/deploy/compose/docker-compose.yml"}
COMPOSE_PROFILES=${COMPOSE_PROFILES:-"local,proxy"}
PRUNE_STATE_DIR=${PRUNE_STATE_DIR:-"$HOME/.bb-portfolio"}
PRUNE_STATE_FILE=${PRUNE_STATE_FILE:-"$PRUNE_STATE_DIR/last-prune"}

echo "[docker-maintenance] Using compose file: $COMPOSE_FILE"
echo "[docker-maintenance] Using profiles: $COMPOSE_PROFILES"

echo "[docker-maintenance] Bringing down services and removing volumes..."
COMPOSE_PROFILES=$COMPOSE_PROFILES docker compose -f "$COMPOSE_FILE" down -v || true

echo "[docker-maintenance] Pruning Docker system (containers, networks, dangling images)..."
docker system prune -af || true

echo "[docker-maintenance] Pruning Docker volumes..."
docker volume prune -f || true

echo "[docker-maintenance] Pruning BuildKit/buildx caches older than 7 days..."
docker buildx prune -af --filter until=168h || true

mkdir -p "$PRUNE_STATE_DIR" || true
date -u +%Y-%m-%dT%H:%M:%SZ > "$PRUNE_STATE_FILE" || true
echo "[docker-maintenance] Recorded last prune at: $(cat "$PRUNE_STATE_FILE")"

echo "[docker-maintenance] Done. You can start services again with:"
echo "COMPOSE_PROFILES=$COMPOSE_PROFILES docker compose -f \"$COMPOSE_FILE\" up -d bb-portfolio-backend-local bb-portfolio-frontend-local caddy-local"
