#!/usr/bin/env bash
set -euo pipefail
# Real-time tail of certbot / nginx / caddy logs on target instance.
# Provides prefixed streaming of letsencrypt log plus optional service journals.
# Usage examples:
#   ./deploy/scripts/certbot-live-tail.sh --role active --follow nginx
#   ./deploy/scripts/certbot-live-tail.sh --ip 44.246.43.116 --lines 50 --follow certbot --follow nginx

ROLE=active
TARGET_IP="${TARGET_IP:-}"
REGION=us-west-2
LINES=25
EXTRA_FOLLOW=()
SSH_KEY="${SSH_KEY:-$HOME/.ssh/bb-portfolio-site-key.pem}"
CONNECT_TIMEOUT=${CONNECT_TIMEOUT:-6}
TAG_PROJECT="bb-portfolio"

usage(){ cat <<USAGE
certbot-live-tail.sh - real-time certbot / nginx / caddy log viewer

Options:
  --ip <addr>        Explicit public IP (overrides role lookup)
  --role <role>      Role tag to auto-discover (default: active)
  --follow <svc>     Extra service to stream (repeat flag) [nginx|caddy|certbot]
  --lines <n>        Initial letsencrypt lines (default: 25)
  --region <reg>     AWS region (default: us-west-2)
  -h|--help          Show help

Examples:
  ./certbot-live-tail.sh --role active --follow nginx
  ./certbot-live-tail.sh --ip 44.246.43.116 --follow certbot --lines 100
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --ip) TARGET_IP="$2"; shift 2;;
    --role) ROLE="$2"; shift 2;;
    --lines) LINES="$2"; shift 2;;
    --follow) EXTRA_FOLLOW+=("$2"); shift 2;;
    --region) REGION="$2"; shift 2;;
    -h|--help) usage; exit 0;;
    *) echo "Unknown arg: $1" >&2; usage; exit 1;;
  esac
done

need(){ command -v "$1" >/dev/null 2>&1 || { echo "Missing command: $1" >&2; exit 1; }; }
need aws; need ssh

if [[ ! -f "$SSH_KEY" ]]; then echo "SSH key missing: $SSH_KEY" >&2; exit 2; fi

if [[ -z "$TARGET_IP" ]]; then
  TARGET_IP=$(aws ec2 describe-instances --region "$REGION" \
    --filters "Name=tag:Project,Values=$TAG_PROJECT" "Name=tag:Role,Values=$ROLE" "Name=instance-state-name,Values=running" \
    --query 'Reservations[].Instances[].PublicIpAddress' --output text | awk 'NF' | head -n1 || true)
fi
[[ -z "$TARGET_IP" ]] && { echo "Unable to resolve target IP (role=$ROLE)." >&2; exit 3; }

# Portable SSH preflight without relying on GNU timeout
# We attempt a quick SSH handshake with ConnectTimeout=$CONNECT_TIMEOUT and no auth.
# Classify common failure modes for better guidance.
PROBE_OUT=$(ssh -o PreferredAuthentications=none -o PasswordAuthentication=no -o KbdInteractiveAuthentication=no \
  -o BatchMode=yes -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=$CONNECT_TIMEOUT \
  -p 22 ec2-user@"$TARGET_IP" -T exit 0 2>&1 || true)
if echo "$PROBE_OUT" | grep -qi "Connection refused\|No route to host\|Network is unreachable"; then
  # Double-check by attempting a real SSH with key; if it still fails, abort.
  if ! ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=$CONNECT_TIMEOUT ec2-user@"$TARGET_IP" -T true 2>/dev/null; then
    echo "Port 22 unreachable for $TARGET_IP" >&2; exit 4
  fi
fi
if echo "$PROBE_OUT" | grep -qi "timed out during banner exchange\|Connection timed out"; then
  # Some hosts may still accept key-auth quickly; try a real SSH before aborting
  if ! ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=$CONNECT_TIMEOUT ec2-user@"$TARGET_IP" -T true 2>/dev/null; then
    echo "SSH reachable but stalls during banner exchange; cannot live-tail." >&2
    echo "Hints: 1) run orchestrator with --reboot-on-ssh-hang, 2) attach temp SG: ./deploy/scripts/sg-temp-ssh-access.sh --role $ROLE, 3) check fail2ban/ufw on host." >&2
    exit 5
  fi
fi

SSH_OPTS=(-i "$SSH_KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=$CONNECT_TIMEOUT)
EXTRA_LIST="${EXTRA_FOLLOW[*]}"

printf "\033[0;34m[live-tail] target=%s role=%s lines=%s extra=[%s]\033[0m\n" "$TARGET_IP" "$ROLE" "$LINES" "${EXTRA_LIST:-none}" >&2

ssh "${SSH_OPTS[@]}" ec2-user@"$TARGET_IP" 'bash -s --' "$LINES" "$EXTRA_LIST" <<'REMOTE'
set -e
sudo mkdir -p /var/log/letsencrypt || true
sudo touch /var/log/letsencrypt/letsencrypt.log || true
LINES_VAL="$1"
EXTRA="$2"
function pfx(){ local tag="$1"; shift; while IFS= read -r line; do printf "%s %s\n" "$tag" "$line"; done; }
sudo tail -n "$LINES_VAL" -f /var/log/letsencrypt/letsencrypt.log | pfx CERTBOT &
PIDS=($!)
for svc in $EXTRA; do
  case "$svc" in
    nginx) sudo journalctl -u nginx -f -n 25 | pfx NGINX & PIDS+=($!);;
    caddy) sudo journalctl -u caddy -f -n 25 | pfx CADDY & PIDS+=($!);;
    certbot) sudo journalctl -u certbot -f -n 25 | pfx CERTBOT-JOURNAL & PIDS+=($!);;
    "" ) ;; # ignore empty
    *) echo "[live-tail] unknown service: $svc" >&2;;
  esac
done
echo "Press Ctrl-C to stop streaming..."
trap 'echo Stopping tails; for pid in "${PIDS[@]}"; do kill "$pid" 2>/dev/null || true; done' INT TERM
wait
REMOTE