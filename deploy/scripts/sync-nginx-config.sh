#!/usr/bin/env bash
set -euo pipefail

# Sync the Nginx vhost config from repo to the EC2 host and reload Nginx.

usage() {
  cat <<USAGE
Usage: $0 --host ec2-user@<ip-or-host> [--key ~/.ssh/key.pem]

Options:
  --host    SSH host in the form user@host (required)
  --key     Path to SSH private key (default: ~/.ssh/bb-portfolio-site-key.pem)

This will:
  - Upload deploy/nginx/portfolio.conf.template to /tmp/portfolio.conf on the host
  - Backup existing /etc/nginx/conf.d/portfolio.conf with a timestamp
  - Replace it with the uploaded file
  - Test Nginx configuration and reload if successful
USAGE
}

HOST=""
KEY="${HOME}/.ssh/bb-portfolio-site-key.pem"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host)
      HOST="$2"; shift 2;;
    --key)
      KEY="$2"; shift 2;;
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
LOCAL_CONF="${REPO_ROOT}/deploy/nginx/portfolio.conf.template"

if [[ ! -f "$LOCAL_CONF" ]]; then
  echo "Config template not found: $LOCAL_CONF" >&2
  exit 1
fi

echo "Uploading Nginx config to $HOST ..."
scp -i "$KEY" -o StrictHostKeyChecking=accept-new "$LOCAL_CONF" "$HOST:/tmp/portfolio.conf"

echo "Applying Nginx config on $HOST ..."
# Use stdin heredoc to avoid complex quoting issues over SSH
ssh -i "$KEY" -o StrictHostKeyChecking=accept-new "$HOST" 'sudo bash -s' <<'REMOTE_CMDS'
set -euo pipefail
ts=$(date +%Y%m%d_%H%M%S)
if [[ -f /etc/nginx/conf.d/portfolio.conf ]]; then
  cp /etc/nginx/conf.d/portfolio.conf "/etc/nginx/conf.d/portfolio.conf.bak.$ts"
  echo "Backup created: /etc/nginx/conf.d/portfolio.conf.bak.$ts"
fi
mv /tmp/portfolio.conf /etc/nginx/conf.d/portfolio.conf
nginx -t && systemctl reload nginx && echo "Nginx reloaded successfully."
REMOTE_CMDS

echo "Done."
