#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

source "$REPO_ROOT/scripts/lib/repo-env.sh"
bb_load_repo_env "$REPO_ROOT"

KEY_PATH="${1:?ssh key path arg required}"
SSH_TARGET="$(bb_ec2_ssh_target_or_die)"
ENVIRONMENT="${ENVIRONMENT:?ENVIRONMENT env required}"
declare -a SSH_OPTS_ARR
read -r -a SSH_OPTS_ARR <<<"$(bb_ssh_opts_string)"

ssh_log() {
  local name="$1"
  echo "==== logs: $name (last 200 lines) ===="
  bb_retry 3 4 "log fetch for ${name}" \
    ssh -i "$KEY_PATH" "${SSH_OPTS_ARR[@]}" "$SSH_TARGET" \
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
