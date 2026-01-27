#!/usr/bin/env bash
# deploy-remote-hardening.sh
# Push and apply nginx, SSH hardening, fail2ban, and metrics script to a remote EC2 host.
# Usage:
#   ./scripts/hardening/deploy-remote-hardening.sh \
#       --host <ip-or-host> \
#       --key ~/.ssh/bb-portfolio-site-key.pem \
#       [--user ec2-user] [--dry-run]
#
# If --host is omitted, EC2_INSTANCE_IP will be read from the repo-root .env.
#
# Requires: ssh, scp, sudo rights on remote. Assumes target is Amazon Linux (dnf).
set -euo pipefail

HOST=""
KEY=""
USER="ec2-user"
DRY_RUN=0
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

source "$REPO_ROOT/scripts/lib/repo-env.sh"
bb_load_repo_env "$REPO_ROOT"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host) HOST="$2"; shift 2;;
    --key) KEY="$2"; shift 2;;
    --user) USER="$2"; shift 2;;
    --dry-run) DRY_RUN=1; shift;;
    *) echo "[!] Unknown arg: $1" >&2; exit 1;;
  esac
done

HOST="${HOST:-${EC2_INSTANCE_IP:-}}"

if [[ -z "$KEY" ]]; then
  echo "[!] --key is required" >&2
  exit 1
fi
if [[ -z "$HOST" ]]; then
  echo "[!] --host is required (or set EC2_INSTANCE_IP in repo-root .env)" >&2
  exit 1
fi

REMOTE_TMP="/home/$USER/hardening-tmp"
FILES=(
  "deploy/nginx/nginx.conf"
  "deploy/fail2ban/jail.local"
  "scripts/hardening/apply-sshd-hardening.sh"
  "scripts/monitoring/publish-cloudwatch-metrics.sh"
)

run() {
  echo "[remote] $1"
  if [[ $DRY_RUN -eq 0 ]]; then
    ssh -i "$KEY" "$USER@$HOST" "$1"
  fi
}

# 1. Create temp dir & push files
mkdir -p "$REPO_ROOT" || true
if [[ $DRY_RUN -eq 0 ]]; then
  ssh -i "$KEY" "$USER@$HOST" "mkdir -p $REMOTE_TMP"
fi
for f in "${FILES[@]}"; do
  SRC="$REPO_ROOT/$f"
  if [[ ! -f "$SRC" ]]; then
    echo "[!] Missing file: $SRC" >&2; exit 1
  fi
  echo "[scp] $f -> $HOST:$REMOTE_TMP/"
  if [[ $DRY_RUN -eq 0 ]]; then
    scp -i "$KEY" "$SRC" "$USER@$HOST:$REMOTE_TMP/"
  fi
done

# 2. Apply nginx config
run "sudo cp $REMOTE_TMP/nginx.conf /etc/nginx/nginx.conf && sudo nginx -t && sudo systemctl reload nginx"

# 3. Install fail2ban if needed
run "command -v fail2ban-client >/dev/null || sudo dnf install -y fail2ban"
run "sudo cp $REMOTE_TMP/jail.local /etc/fail2ban/jail.local && sudo systemctl enable --now fail2ban && sudo systemctl restart fail2ban"

# 4. Apply sshd hardening
run "sudo chmod +x $REMOTE_TMP/apply-sshd-hardening.sh && sudo bash $REMOTE_TMP/apply-sshd-hardening.sh"

# 5. Install metrics script
run "sudo mkdir -p /usr/local/bin && sudo cp $REMOTE_TMP/publish-cloudwatch-metrics.sh /usr/local/bin/publish-cloudwatch-metrics.sh && sudo chmod +x /usr/local/bin/publish-cloudwatch-metrics.sh"

# 6. Show verification summary
run "grep -E 'limit_req_zone' /etc/nginx/nginx.conf || true"
run "sudo nginx -T | grep -E 'limit_req_zone|api_limit|admin_limit' || true"
run "sudo fail2ban-client status sshd || true"
run "egrep -i '^(PasswordAuthentication|AllowUsers|MaxAuthTries|MaxStartups|LoginGraceTime)' /etc/ssh/sshd_config || true"

cat <<EOF
[+] Deployment steps queued${DRY_RUN:+ (dry-run)}.
To execute for real (if dry-run was used), rerun without --dry-run.
Example:
  ./scripts/hardening/deploy-remote-hardening.sh \
    --host $HOST --key $KEY --user $USER
EOF
