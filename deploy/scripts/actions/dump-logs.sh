#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

source "$REPO_ROOT/scripts/lib/repo-env.sh"
bb_load_repo_env "$REPO_ROOT"

KEY_PATH="${1:?ssh key path arg required}" 
EC2_HOST="$(bb_ec2_host_or_die)"
ENVIRONMENT="${ENVIRONMENT:?ENVIRONMENT env required}"

ssh_log() {
  local name="$1"
  echo "==== logs: $name (last 200 lines) ===="
  ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ec2-user@"$EC2_HOST" \
    "docker logs --tail 200 --timestamps $name 2>&1 || true"
  echo
}

case "$ENVIRONMENT" in
  prod)
    ssh_log bb-portfolio-frontend-prod
    ssh_log bb-portfolio-backend-prod
    ;;
  dev)
    ssh_log bb-portfolio-frontend-dev
    ssh_log bb-portfolio-backend-dev
    ;;
  both)
    ssh_log bb-portfolio-frontend-prod
    ssh_log bb-portfolio-backend-prod
    ssh_log bb-portfolio-frontend-dev
    ssh_log bb-portfolio-backend-dev
    ;;
esac
