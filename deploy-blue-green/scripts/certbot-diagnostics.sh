#!/usr/bin/env bash
set -euo pipefail
# Standalone Certbot / Nginx / Caddy diagnostics collector for bb-portfolio
# Usage examples:
#   ./deploy/scripts/certbot-diagnostics.sh                 # auto-detect active instance
#   TARGET_IP=44.246.43.116 ./deploy/scripts/certbot-diagnostics.sh
#   ./deploy/scripts/certbot-diagnostics.sh --ip 44.246.43.116 --reason manual-check
# Output: deploy/logs/certbot-diag-<UTC_TIMESTAMP>/bb-diag-<TIMESTAMP>.tar.gz
# Requires: aws, jq, ssh key (~/.ssh/bb-portfolio-site-key.pem)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
OUT_DIR="$(pwd)/deploy/logs/certbot-diag-${TIMESTAMP}"
mkdir -p "$OUT_DIR"
REASON="manual"
TARGET_IP="${TARGET_IP:-}"
REGION="us-west-2"
TAG_PROJECT="bb-portfolio"
SSH_KEY_DEFAULT="$HOME/.ssh/bb-portfolio-site-key.pem"
CONNECT_TIMEOUT=6

usage() {
  cat <<USAGE
Certbot / Nginx / Caddy diagnostics collector

Options:
  --ip <address>      Target public IP (if omitted, auto-detect Role=active)
  --role <tag-role>   Override role used for auto-detect (default: active)
  --reason <text>     Reason string embedded in bundle (default: manual)
  --region <aws-reg>  AWS region (default: us-west-2)
  -h|--help           Show this help

Env overrides:
  TARGET_IP=<ip>      Same as --ip
  SSH_KEY=<path>      SSH key path (default: ~/.ssh/bb-portfolio-site-key.pem)
  CONNECT_TIMEOUT=<s> SSH connect timeout (default: 6)
USAGE
}
ROLE="active"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --ip) TARGET_IP="$2"; shift 2;;
    --role) ROLE="$2"; shift 2;;
    --reason) REASON="$2"; shift 2;;
    --region) REGION="$2"; shift 2;;
    -h|--help) usage; exit 0;;
    *) echo "Unknown arg: $1" >&2; usage; exit 1;;
  esac
done

need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing required command: $1" >&2; exit 1; }; }
need aws; need jq; need tar; need ssh; need scp

SSH_KEY="${SSH_KEY:-$SSH_KEY_DEFAULT}"
if [[ ! -f "$SSH_KEY" ]]; then
  echo "SSH key not found: $SSH_KEY" >&2; exit 2
fi

if [[ -z "$TARGET_IP" ]]; then
  TARGET_IP=$(aws ec2 describe-instances --region "$REGION" \
    --filters "Name=tag:Project,Values=$TAG_PROJECT" "Name=tag:Role,Values=$ROLE" "Name=instance-state-name,Values=running" \
    --query 'Reservations[].Instances[].PublicIpAddress' --output text | awk 'NF' | head -n1 || true)
fi

if [[ -z "$TARGET_IP" ]]; then
  echo "Could not determine target IP (role=$ROLE). Provide --ip explicitly." >&2; exit 3
fi

log() { printf "\033[0;34m[certbot-diag] %s\033[0m\n" "$*"; }
warn() { printf "\033[1;33m[certbot-diag][warn] %s\033[0m\n" "$*"; }
err() { printf "\033[0;31m[certbot-diag][error] %s\033[0m\n" "$*" >&2; }

log "Target IP: $TARGET_IP (role=$ROLE reason=$REASON)"

# Quick reachability test
if ! timeout "$CONNECT_TIMEOUT" bash -c "</dev/tcp/${TARGET_IP}/22" 2>/dev/null; then
  warn "Port 22 not reachable (timeout ${CONNECT_TIMEOUT}s). Aborting diagnostics to avoid hang."; exit 4
fi

SSH_OPTS=(-i "$SSH_KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=$CONNECT_TIMEOUT)

log "Collecting remote bundle..."
ssh "${SSH_OPTS[@]}" ec2-user@"$TARGET_IP" env TIMESTAMP="$TIMESTAMP" REASON="$REASON" bash -lc 'set -e
  RDIR="/tmp/certbot-diag-${TIMESTAMP}"; mkdir -p "$RDIR"
  echo "reason: $REASON" > "$RDIR/reason.txt"
  for s in nginx caddy certbot; do
    sudo systemctl status "$s" >"$RDIR/systemctl-${s}.txt" 2>&1 || true
    sudo journalctl -u "$s" -n 500 >"$RDIR/journal-${s}.log" 2>&1 || true
  done
  (ss -tulpen || netstat -tulpen || true) >"$RDIR/ports.txt" 2>&1 || true
  ps aux >"$RDIR/ps-aux.txt" 2>&1 || true
  sudo iptables -S >"$RDIR/iptables-S.txt" 2>&1 || true
  sudo firewall-cmd --state >"$RDIR/firewalld-state.txt" 2>&1 || true
  sudo firewall-cmd --list-all >"$RDIR/firewalld-list.txt" 2>&1 || true
  sudo cp -f /etc/nginx/nginx.conf "$RDIR/nginx.conf" 2>/dev/null || true
  sudo cp -rf /etc/nginx/sites-enabled "$RDIR/nginx-sites-enabled" 2>/dev/null || true
  sudo cp -f /etc/caddy/Caddyfile "$RDIR/Caddyfile" 2>/dev/null || true
  sudo mkdir -p "$RDIR/logs" || true
  sudo cp -rf /var/log/nginx "$RDIR/logs/nginx" 2>/dev/null || true
  sudo cp -rf /var/log/caddy "$RDIR/logs/caddy" 2>/dev/null || true
  sudo cp -rf /var/log/letsencrypt "$RDIR/logs/letsencrypt" 2>/dev/null || true
  for d in bbaysinger.com www.bbaysinger.com dev.bbaysinger.com; do
    (dig +short A "$d" || true) >"$RDIR/dns-${d}.txt" 2>&1 || true
  done
  tar -C /tmp -czf "/tmp/certbot-diag-${TIMESTAMP}.tar.gz" "certbot-diag-${TIMESTAMP}" || true
'

if scp "${SSH_OPTS[@]}" ec2-user@"$TARGET_IP":"/tmp/certbot-diag-${TIMESTAMP}.tar.gz" "$OUT_DIR/" >/dev/null 2>&1; then
  log "Bundle copied: $OUT_DIR/certbot-diag-${TIMESTAMP}.tar.gz"
else
  warn "Failed to copy diagnostics bundle"
fi

ssh "${SSH_OPTS[@]}" ec2-user@"$TARGET_IP" bash -lc 'rm -rf /tmp/certbot-diag-* || true' >/dev/null 2>&1 || true

log "Complete. Inspect with: tar -tzf $OUT_DIR/certbot-diag-${TIMESTAMP}.tar.gz | head"
