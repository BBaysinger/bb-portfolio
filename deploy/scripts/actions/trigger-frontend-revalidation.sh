#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

source "$REPO_ROOT/scripts/lib/repo-env.sh"
bb_load_repo_env "$REPO_ROOT"

KEY_PATH="${1:?ssh key path arg required}"
ENVIRONMENT="${ENVIRONMENT:?ENVIRONMENT env required}"
FRONTEND_REVALIDATE_SECRET="${FRONTEND_REVALIDATE_SECRET:?FRONTEND_REVALIDATE_SECRET env required}"
SSH_TARGET="$(bb_ec2_ssh_target_or_die)"

declare -a SSH_OPTS_ARR
read -r -a SSH_OPTS_ARR <<<"$(bb_ssh_opts_string)"

port=3000
if [ "$ENVIRONMENT" = "dev" ]; then
  port=4000
fi

payload='{"reason":"post-deploy-revalidate","source":"github-actions-redeploy"}'
base_url="http://127.0.0.1:${port}"
auth_header="Authorization: Bearer $FRONTEND_REVALIDATE_SECRET"

# Invalidation is lazy. Warm the primary public pages immediately so the newly
# deployed frontend replaces build-snapshot HTML with live environment data
# before the first visitor arrives.
remote_command="curl -fsS -X POST -H '$auth_header' -H 'Content-Type: application/json' -d '$payload' $base_url/api/revalidate/projects/ >/dev/null"
remote_command+=" && curl -fsS -X POST -H '$auth_header' -H 'Content-Type: application/json' -d '$payload' $base_url/api/revalidate/cv/ >/dev/null"
remote_command+=" && curl -fsS -X POST -H '$auth_header' -H 'Content-Type: application/json' -d '$payload' $base_url/api/revalidate/site/ >/dev/null"
remote_command+=" && curl -fsS -H 'X-Cache-Warm: 1' $base_url/ >/dev/null"
remote_command+=" && curl -fsS -H 'X-Cache-Warm: 1' $base_url/cv/ >/dev/null"
remote_command+=" && curl -fsS -H 'X-Cache-Warm: 1' $base_url/.well-known/security.txt >/dev/null"

bb_retry 3 4 "trigger frontend revalidation" \
  ssh -i "$KEY_PATH" "${SSH_OPTS_ARR[@]}" "$SSH_TARGET" \
  "$remote_command"
