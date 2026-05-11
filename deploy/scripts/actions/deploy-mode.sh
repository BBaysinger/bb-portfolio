#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

source "$REPO_ROOT/scripts/lib/repo-env.sh"
bb_load_repo_env "$REPO_ROOT"

KEY_PATH="${1:?ssh key path arg required}"
MODE="${DEPLOY_MODE_ACTION:-${2:-}}"
SSH_TARGET="$(bb_ec2_ssh_target_or_die)"
ENVIRONMENT="${ENVIRONMENT:?ENVIRONMENT env required}"
declare -a SSH_OPTS_ARR
read -r -a SSH_OPTS_ARR <<<"$(bb_ssh_opts_string)"

if [[ "$MODE" != "enable" && "$MODE" != "disable" ]]; then
  echo "DEPLOY_MODE_ACTION must be enable or disable" >&2
  exit 1
fi

bb_retry 3 4 "deploy mode ${MODE}" \
  ssh -i "$KEY_PATH" "${SSH_OPTS_ARR[@]}" \
  "$SSH_TARGET" "MODE='$MODE' ENVIRONMENT='$ENVIRONMENT' bash -s" <<'SSH'
set -euo pipefail

marker_path() {
  case "$1" in
    prod) echo "/var/run/bb-portfolio-maintenance-prod" ;;
    dev) echo "/var/run/bb-portfolio-maintenance-dev" ;;
    *) echo "unknown environment: $1" >&2; return 1 ;;
  esac
}

MARKER=$(marker_path "$ENVIRONMENT")
if [ "$MODE" = "enable" ]; then
  sudo touch "$MARKER"
  echo "Enabled deploy mode for $ENVIRONMENT ($MARKER)"
else
  sudo rm -f "$MARKER"
  echo "Disabled deploy mode for $ENVIRONMENT ($MARKER)"
fi
SSH
