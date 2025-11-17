#!/usr/bin/env bash
# Host diagnostic helper: gather listener, proxy, container, and app health info.
set -euo pipefail

# Usage: ./host-diag.sh [--no-aws] [--ports "80 3000 3001 4000 4001"]
# Optional env: DIAG_PORTS (space-separated list)

DIAG_PORTS=${DIAG_PORTS:-"auto"}
AWS_ENABLED=1
for arg in "$@"; do
  case "$arg" in
    --no-aws) AWS_ENABLED=0 ;;
    --ports) shift; DIAG_PORTS="$1" ;;
  esac
  shift || true
done

section() { echo -e "\n===== $* ====="; }
header()  { printf "\n-- %s --\n" "$*"; }

section "TIMESTAMP"; date -u

section "PUBLIC IP";
if curl -s --max-time 2 http://169.254.169.254/latest/meta-data/public-ipv4 >/dev/null; then
  META_IP=$(curl -s --max-time 2 http://169.254.169.254/latest/meta-data/public-ipv4 || true)
  EXT_IP=$(curl -s --max-time 3 http://checkip.amazonaws.com || true)
  echo "Metadata IP: $META_IP"; echo "External IP: $EXT_IP";
else
  echo "Instance metadata IP fetch failed (IMDS disabled?).";
fi

section "LISTENERS (ss)";
if command -v ss >/dev/null 2>&1; then
  if [ "$DIAG_PORTS" = "auto" ]; then
    (ss -tlnp || true)
  else
    (ss -tlnp || true) | grep -E ":($(echo "$DIAG_PORTS" | tr ' ' '|'))\\b" || echo "No expected listeners matched"
  fi
else
  echo "ss not available (skipping listener detail)"
fi

section "NGINX STATUS";
if systemctl list-unit-files | grep -q '^nginx.service'; then
  systemctl status nginx.service --no-pager | sed -n '1,40p'
  header "nginx -t"; (nginx -t 2>&1 || true)
else
  echo "nginx.service not installed"
fi

section "CADDY STATUS";
if systemctl list-unit-files | grep -q '^caddy.service'; then
  systemctl status caddy.service --no-pager | sed -n '1,30p'
else
  echo "caddy.service not installed"
fi

section "DOCKER SERVICE";
(systemctl status docker.service --no-pager | sed -n '1,25p') || echo "docker service status unavailable"

section "DOCKER CONTAINERS";
DOCKER_PS_OUTPUT=$(docker ps --format '{{.Names}}|{{.Ports}}' || true)
{ echo -e "NAME\tPORTS"; echo "$DOCKER_PS_OUTPUT" | awk -F '|' '{printf "%s\t%s\n", $1, $2}'; } | column -t

# Auto-discover host ports if DIAG_PORTS=auto
if [ "$DIAG_PORTS" = "auto" ]; then
  DISCOVERED=$(echo "$DOCKER_PS_OUTPUT" | \
    sed -n 's/.*\([0-9]\{2,5\}\)->[0-9]\{2,5\}\/tcp.*/\1/p' | \
    tr '\n' ' ' | xargs -n1 echo | sort -u | tr '\n' ' ')
  # Include common expected ports if present or mapped internally
  for p in 80 3000 3001 4000 4001 443; do
    echo "$DOCKER_PS_OUTPUT" | grep -q "${p}->" && DISCOVERED="$DISCOVERED $p"
  done
  DIAG_PORTS=$(echo "$DISCOVERED" | xargs -n1 echo | sort -u | tr '\n' ' ')
  [ -z "$DIAG_PORTS" ] && DIAG_PORTS="80 3000 3001"
  section "AUTO-DISCOVERED PORTS"; echo "$DIAG_PORTS"
fi

section "APP PORT PROBES";
for p in $DIAG_PORTS; do
  header "curl :$p / (HEAD)";
  (time curl -s -o /dev/null -w 'HTTP %{http_code}\n' --max-time 4 http://localhost:$p/ || echo "curl timeout or failure") 2>&1 | sed 's/^real/elapsed/'
  header "curl :$p /api/health/ (HEAD)";
  (curl -I --max-time 4 http://localhost:$p/api/health/ 2>&1 || echo "health endpoint failed") | sed -n '1,5p'
done

section "FAIL2BAN (if present)";
if systemctl list-unit-files | grep -q '^fail2ban.service'; then
  systemctl status fail2ban.service --no-pager | sed -n '1,20p'
  fail2ban-client status 2>/dev/null || true
else
  echo "fail2ban not installed"
fi

section "IPTABLES RULES (port 80)";
(iptables -L -n || true) | grep -E '(:80|DROP|REJECT)' || echo "No DROP/REJECT rules referencing :80 found"

section "NGINX CONF SNIPPET";
if [ -f /etc/nginx/nginx.conf ]; then
  sed -n '1,120p' /etc/nginx/nginx.conf
  for f in /etc/nginx/conf.d/*.conf; do
    [ -f "$f" ] || continue; header "$f"; sed -n '1,120p' "$f";
  done
else
  echo "No /etc/nginx/nginx.conf present"
fi

if [ "$AWS_ENABLED" -eq 1 ] && command -v aws >/dev/null 2>&1; then
  section "AWS SECURITY GROUP & SUBNET";
  IID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id || true)
  REGION=$(curl -s http://169.254.169.254/latest/dynamic/instance-identity/document | grep region | awk -F '"' '{print $4}')
  if [ -n "$IID" ] && [ -n "$REGION" ]; then
    SG_IDS=$(aws ec2 describe-instances --region "$REGION" --instance-ids "$IID" --query 'Reservations[0].Instances[0].SecurityGroups[].GroupId' --output text || true)
    SUBNET_ID=$(aws ec2 describe-instances --region "$REGION" --instance-ids "$IID" --query 'Reservations[0].Instances[0].SubnetId' --output text || true)
    echo "Instance: $IID Region: $REGION"; echo "SGs: $SG_IDS"; echo "Subnet: $SUBNET_ID";
    for sg in $SG_IDS; do
      header "Inbound rules for $sg";
      aws ec2 describe-security-groups --region "$REGION" --group-ids "$sg" --query 'SecurityGroups[0].IpPermissions' --output json || true
    done
  else
    echo "Could not derive instance metadata for AWS queries"
  fi
else
  section "AWS CHECKS"; echo "Skipped (aws CLI not available or --no-aws specified)"
fi

section "DONE"; echo "Diagnostics complete.";
