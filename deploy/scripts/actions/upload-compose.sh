#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

source "$REPO_ROOT/scripts/lib/repo-env.sh"
bb_load_repo_env "$REPO_ROOT"

KEY_PATH="${1:?ssh key path arg required}"
SSH_TARGET="$(bb_ec2_ssh_target_or_die)"
declare -a SSH_OPTS_ARR
read -r -a SSH_OPTS_ARR <<<"$(bb_ssh_opts_string)"

bb_retry 3 4 "ensure remote compose directory" \
  ssh -i "$KEY_PATH" "${SSH_OPTS_ARR[@]}" "$SSH_TARGET" "sudo mkdir -p /home/ec2-user/bb-portfolio/deploy/compose && sudo chown -R ec2-user:ec2-user /home/ec2-user/bb-portfolio"

bb_retry 3 4 "compose file upload" \
  scp -i "$KEY_PATH" "${SSH_OPTS_ARR[@]}" "deploy/compose/docker-compose.yml" "$SSH_TARGET":/home/ec2-user/bb-portfolio/deploy/compose/docker-compose.yml

echo "Compose file uploaded"
