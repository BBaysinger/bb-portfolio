#!/usr/bin/env bash
set -euo pipefail
KEY_PATH="${1:?ssh key path arg required}" 
EC2_HOST="${EC2_HOST:?EC2_HOST env required}"
ENVIRONMENT="${ENVIRONMENT:?ENVIRONMENT env required}"
START_DEV="${START_DEV:-true}"

remote_pre_clean() {
  ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ec2-user@"$EC2_HOST" "ENVIRONMENT='$ENVIRONMENT' bash -s" <<'BASH'
set -e
echo "== Disk usage before =="
df -h / || true
docker system df || true
echo "== Stop/remove stale containers (ignore errors) =="
case "${ENVIRONMENT}" in
  prod) docker rm -f bb-portfolio-backend-prod bb-portfolio-frontend-prod 2>/dev/null || true ;;
  dev)  docker rm -f bb-portfolio-backend-dev  bb-portfolio-frontend-dev  2>/dev/null || true ;;
  both) docker rm -f bb-portfolio-backend-dev  bb-portfolio-frontend-dev  bb-portfolio-backend-prod bb-portfolio-frontend-prod 2>/dev/null || true ;;
 esac
echo "== Prune unused images/containers/networks (no volumes) =="
docker system prune -af || true
echo "== Prune builder cache =="
docker builder prune -af || true
echo "== Check free space and prune volumes only if critically low =="
FREE_KB=$(df -Pk / | sed -n '2p' | tr -s ' ' | cut -d' ' -f4)
THRESHOLD_KB=$((3 * 1024 * 1024)) # 3GB
if [ "$FREE_KB" -lt "$THRESHOLD_KB" ]; then
  echo "Low disk space detected ($(df -h / | sed -n '2p' | tr -s ' ' | cut -d' ' -f4)) — pruning unused volumes..."
  docker volume prune -f || true
fi
echo "== Disk usage after prune =="
df -h / || true
docker system df || true
BASH
}

remote_restart() {
  ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ec2-user@"$EC2_HOST" "ENVIRONMENT='$ENVIRONMENT' START_DEV='$START_DEV' bash -s" <<'BASH'
set -e
cd /home/ec2-user/bb-portfolio
aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin 778230822028.dkr.ecr.us-west-2.amazonaws.com >/dev/null 2>&1 || true
export AWS_ACCOUNT_ID=778230822028
COMPOSE_FILE="deploy/compose/docker-compose.yml"
try_up() {
  local profile="$1"; local attempts=0
  until [ $attempts -ge 3 ]; do
    if COMPOSE_PROFILES="$profile" docker-compose -f "$COMPOSE_FILE" up -d --force-recreate; then
      return 0
    fi
    attempts=$((attempts+1))
    echo "compose up failed for $profile (attempt $attempts), retrying in 5s..."
    sleep 5
  done
  echo "compose up failed for $profile after retries" >&2
  return 1
}
case "${ENVIRONMENT}" in
  prod)
    COMPOSE_PROFILES=prod docker-compose -f "$COMPOSE_FILE" pull || true
    try_up prod
    ;;
  dev)
    COMPOSE_PROFILES=dev docker-compose -f "$COMPOSE_FILE" pull || true
    try_up dev
    ;;
  both)
    COMPOSE_PROFILES=prod docker-compose -f "$COMPOSE_FILE" pull || true
    try_up prod || true
    if [ "$START_DEV" = "true" ] || [ "$START_DEV" = true ]; then
      COMPOSE_PROFILES=dev docker-compose -f "$COMPOSE_FILE" pull || true
      try_up dev || true
    fi
    ;;
 esac
BASH
}

remote_pre_clean
remote_restart

echo "Container restart sequence complete"
