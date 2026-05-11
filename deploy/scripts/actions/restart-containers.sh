#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

source "$REPO_ROOT/scripts/lib/repo-env.sh"
bb_load_repo_env "$REPO_ROOT"

KEY_PATH="${1:?ssh key path arg required}"
SSH_TARGET="$(bb_ec2_ssh_target_or_die)"
ENVIRONMENT="${ENVIRONMENT:?ENVIRONMENT env required}"
START_DEV="${START_DEV:-true}"
declare -a SSH_OPTS_ARR
read -r -a SSH_OPTS_ARR <<<"$(bb_ssh_opts_string)"

remote_pre_clean() {
  bb_retry 3 4 "remote docker cleanup" \
    ssh -i "$KEY_PATH" "${SSH_OPTS_ARR[@]}" "$SSH_TARGET" "ENVIRONMENT='$ENVIRONMENT' bash -s" <<'BASH'
set -e
echo "== Disk usage before =="
df -h / || true
docker system df || true
echo "== Preserve live containers; prune only unused Docker resources =="
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
  bb_retry 3 4 "remote container restart" \
    ssh -i "$KEY_PATH" "${SSH_OPTS_ARR[@]}" "$SSH_TARGET" "ENVIRONMENT='$ENVIRONMENT' START_DEV='$START_DEV' bash -s" <<'BASH'
set -e
cd /home/ec2-user/bb-portfolio
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || true)
if [ -n "$AWS_ACCOUNT_ID" ] && [ "$AWS_ACCOUNT_ID" != "None" ]; then
  aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.us-west-2.amazonaws.com" >/dev/null 2>&1 || true
  export AWS_ACCOUNT_ID
else
  echo "WARN: Could not resolve AWS_ACCOUNT_ID via sts; skipping ECR login" >&2
fi
COMPOSE_FILE="deploy/compose/docker-compose.yml"
try_up() {
  local profile="$1"; local attempts=0
  until [ $attempts -ge 3 ]; do
    if COMPOSE_PROFILES="$profile" docker-compose -f "$COMPOSE_FILE" up -d; then
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
