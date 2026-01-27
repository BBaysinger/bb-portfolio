#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

source "$REPO_ROOT/scripts/lib/repo-env.sh"
bb_load_repo_env "$REPO_ROOT"

KEY_PATH="${1:?ssh key path arg required}" 
EC2_HOST="$(bb_ec2_host_or_die)"

ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=30 ec2-user@"$EC2_HOST" "sudo mkdir -p /home/ec2-user/bb-portfolio/deploy/compose && sudo chown -R ec2-user:ec2-user /home/ec2-user/bb-portfolio"
scp -i "$KEY_PATH" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=30 -o ServerAliveInterval=10 -o ServerAliveCountMax=3 -C \
  "deploy/compose/docker-compose.yml" \
  ec2-user@"$EC2_HOST":/home/ec2-user/bb-portfolio/deploy/compose/docker-compose.yml

echo "Compose file uploaded"
