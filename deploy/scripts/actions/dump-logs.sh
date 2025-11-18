#!/usr/bin/env bash
set -euo pipefail
KEY_PATH="${1:?ssh key path arg required}" 
EC2_HOST="${EC2_HOST:?EC2_HOST env required}"
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
