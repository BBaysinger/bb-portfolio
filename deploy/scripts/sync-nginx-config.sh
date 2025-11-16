#!/usr/bin/env bash
set -euo pipefail

################################################################################
# Nginx Configuration Sync
################################################################################
# Deploys nginx reverse proxy configuration to EC2 instances with dynamic
# IP substitution for blue candidate instance accessibility.
#
# Why This Exists:
# Blue (candidate) instance needs to be accessible by IP for validation before
# DNS cutover. This script injects the blue IP into nginx config so requests to
# http://<blue-ip> are routed correctly (not rejected by default_server block).
#
# Template Substitution:
# - deploy/nginx/bb-portfolio.conf.template contains BLUE_IP_PLACEHOLDER
# - This script replaces it with actual blue instance IP (from terraform output)
# - Result: nginx responds to domain names AND blue IP address
#
# Called By:
# - deployment-orchestrator.sh (after terraform apply, passes --blue-ip flag)
# - Manually via `npm run sync:nginx` (for config updates only)
################################################################################

usage() {
  cat <<USAGE
Usage: $0 --host ec2-user@<ip-or-host> [--key ~/.ssh/key.pem] [--blue-ip <ip>]

Options:
  --host      SSH host in the form user@host (required)
  --key       Path to SSH private key (default: ~/.ssh/bb-portfolio-site-key.pem)
  --blue-ip   Blue instance IP address to substitute in template (optional)

This will:
  - Upload deploy/nginx/bb-portfolio.conf.template to /tmp/bb-portfolio.conf on the host
  - Substitute BLUE_IP_PLACEHOLDER with actual blue IP if --blue-ip is provided
  - Backup existing /etc/nginx/conf.d/bb-portfolio.conf (and legacy portfolio.conf) with a timestamp
  - Replace it with the uploaded file (installs to /etc/nginx/conf.d/bb-portfolio.conf)
  - Test Nginx configuration and reload if successful
USAGE
}

HOST=""
KEY="${HOME}/.ssh/bb-portfolio-site-key.pem"
BLUE_IP=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host)
      HOST="$2"; shift 2;;
    --key)
      KEY="$2"; shift 2;;
    --blue-ip)
      BLUE_IP="$2"; shift 2;;
    -h|--help)
      usage; exit 0;;
    *)
      echo "Unknown option: $1" >&2; usage; exit 1;;
  esac
done

if [[ -z "$HOST" ]]; then
  echo "--host is required" >&2
  usage
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LOCAL_CONF="${REPO_ROOT}/deploy/nginx/bb-portfolio.conf.template"

if [[ ! -f "$LOCAL_CONF" ]]; then
  echo "Config template not found: $LOCAL_CONF" >&2
  exit 1
fi

# Prepare config file with IP substitution if needed
TEMP_CONF="/tmp/bb-portfolio-nginx-$$.conf"
if [[ -n "$BLUE_IP" ]]; then
  echo "Substituting BLUE_IP_PLACEHOLDER with $BLUE_IP ..."
  sed "s/BLUE_IP_PLACEHOLDER/$BLUE_IP/g" "$LOCAL_CONF" > "$TEMP_CONF"
else
  cp "$LOCAL_CONF" "$TEMP_CONF"
fi

echo "Uploading Nginx config to $HOST ..."
scp -i "$KEY" -o StrictHostKeyChecking=accept-new "$TEMP_CONF" "$HOST:/tmp/bb-portfolio.conf"
rm -f "$TEMP_CONF"

echo "Applying Nginx config on $HOST ..."
# Use stdin heredoc to avoid complex quoting issues over SSH
ssh -i "$KEY" -o StrictHostKeyChecking=accept-new "$HOST" 'sudo bash -s' <<'REMOTE_CMDS'
set -euo pipefail
ts=$(date +%Y%m%d_%H%M%S)
TARGET="/etc/nginx/conf.d/bb-portfolio.conf"
LEGACY="/etc/nginx/conf.d/portfolio.conf"

if [[ -f "$TARGET" ]]; then
  cp "$TARGET" "$TARGET.bak.$ts"
  echo "Backup created: $TARGET.bak.$ts"
fi
if [[ -f "$LEGACY" ]]; then
  cp "$LEGACY" "$LEGACY.bak.$ts"
  echo "Legacy backup created: $LEGACY.bak.$ts"
  rm -f "$LEGACY"
fi
mv /tmp/bb-portfolio.conf "$TARGET"
nginx -t && systemctl reload nginx && echo "Nginx reloaded successfully."
REMOTE_CMDS

echo "Done."
