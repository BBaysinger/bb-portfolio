#!/usr/bin/env bash
# migrate-ec2-directory.sh
# Safely rename the project directory on the EC2 host from /home/ec2-user/portfolio
# to /home/ec2-user/bb-portfolio, preserving environment files and restarting containers.
# Intended to be run LOCALLY, initiating SSH commands to the remote host.
# Usage:
#   ./scripts/migrate-ec2-directory.sh --host ec2-user@<IP_OR_DNS> --key ~/.ssh/bb-portfolio-site-key.pem [--symlink] [--dry-run]
#
# If --host is omitted, defaults to ec2-user@EC2_INSTANCE_IP from the repo-root .env.
#
# Steps:
# 1. Verify connectivity & required commands.
# 2. Stop running compose services (old path).
# 3. Rename directory or create fresh target if not present.
# 4. Optional: create symlink /home/ec2-user/portfolio -> /home/ec2-user/bb-portfolio.
# 5. Adjust ownership & permissions.
# 6. Start containers using new path.
# 7. Health check HTTP 200.
#
# Rollback:
#   mv /home/ec2-user/bb-portfolio /home/ec2-user/portfolio && restart using old path.
set -euo pipefail

HOST=""
KEY=""
DO_SYMLINK=false
DRY_RUN=false

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

source "$REPO_ROOT/scripts/lib/repo-env.sh"
bb_load_repo_env "$REPO_ROOT"

log() { printf "[migrate-dir] %s\n" "$*"; }
err() { printf "[migrate-dir][error] %s\n" "$*" >&2; }
usage() {
  cat <<EOF
Usage: $0 --host ec2-user@IP --key /path/to/key.pem [--symlink] [--dry-run]

--host       SSH target (defaults to ec2-user@EC2_INSTANCE_IP from repo-root .env)
--key        Private key path
--symlink    Leave backward-compatible symlink /home/ec2-user/portfolio
--dry-run    Show planned remote commands without executing
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host) HOST="$2"; shift 2;;
    --key) KEY="$2"; shift 2;;
    --symlink) DO_SYMLINK=true; shift;;
    --dry-run) DRY_RUN=true; shift;;
    -h|--help) usage; exit 0;;
    *) err "Unknown arg $1"; usage; exit 1;;
  esac
done

if [[ -z "$HOST" ]]; then
  SSH_USER="${EC2_SSH_USER:-ec2-user}"
  if [[ -n "${EC2_INSTANCE_IP:-}" ]]; then
    HOST="$SSH_USER@$EC2_INSTANCE_IP"
  else
    err "--host is required (or set EC2_INSTANCE_IP in repo-root .env)"; usage; exit 1
  fi
fi
[[ -z "$KEY" ]] && { err "--key required"; usage; exit 1; }

REMOTE_CMDS='set -euo pipefail
OLD=/home/ec2-user/portfolio
NEW=/home/ec2-user/bb-portfolio
log(){ printf "[remote-migrate] %s\n" "$*"; }
log "Checking existing paths";
if [[ ! -d "$OLD" && -d "$NEW" ]]; then
  log "Old directory missing; new already exists. Nothing to rename.";
else
  if [[ -d "$NEW" && -d "$OLD" ]]; then
    log "Target $NEW exists; archiving old instead of rename.";
    mv "$OLD" "/home/ec2-user/portfolio_legacy_$(date +%Y%m%d_%H%M%S)";
  elif [[ -d "$OLD" ]]; then
    log "Renaming $OLD -> $NEW";
    mv "$OLD" "$NEW";
  else
    log "Neither old nor new exist; creating $NEW";
    mkdir -p "$NEW";
  fi
fi
if [[ "${DO_SYMLINK}" == "true" ]]; then
  if [[ ! -e "$OLD" ]]; then
    ln -s "$NEW" "$OLD";
    log "Symlink created $OLD -> $NEW";
  else
    log "Symlink requested but $OLD still exists (not creating).";
  fi
fi
chown -R ec2-user:ec2-user "$NEW" || true
log "Stopping any old compose services";
if [[ -f "$OLD/deploy/compose/docker-compose.yml" ]]; then
  (cd "$OLD"; docker compose -f deploy/compose/docker-compose.yml down || true)
fi
if [[ -f "$NEW/deploy/compose/docker-compose.yml" ]]; then
  log "Starting compose services from new path";
  (cd "$NEW"; COMPOSE_PROFILES=prod docker compose -f deploy/compose/docker-compose.yml up -d)
fi
sleep 5
log "Health check";
if command -v curl >/dev/null 2>&1; then
  curl -s -o /dev/null -w "HTTP%{http_code}\n" http://localhost || true
fi
ls -la "$NEW" | head -20
'

log "Preparing migration (symlink=$DO_SYMLINK dry-run=$DRY_RUN)"

if $DRY_RUN; then
  echo "--- Planned remote script ---"
  echo "$REMOTE_CMDS" | sed "s/DO_SYMLINK=true/DO_SYMLINK=$DO_SYMLINK/"
  exit 0
fi

# Inject symlink flag into remote script
REMOTE_CMDS="DO_SYMLINK=$DO_SYMLINK
$REMOTE_CMDS"

log "Executing remote migration steps"
ssh -i "$KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$HOST" "$REMOTE_CMDS"

log "Done. Consider removing legacy symlink later (if created)."