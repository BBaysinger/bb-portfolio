#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

source "$REPO_ROOT/scripts/lib/repo-env.sh"
bb_load_repo_env "$REPO_ROOT"

KEY_PATH="${1:?ssh key path arg required}" 
EC2_HOST="$(bb_ec2_host_or_die)"
ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ec2-user@"$EC2_HOST" $'set -e
  echo "== Docker ps =="
  docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
  echo
  echo "== Docker compose version =="
  if docker compose version >/dev/null 2>&1; then
    COMPOSE_BIN="docker compose"
  else
    COMPOSE_BIN="docker-compose"
  fi
  $COMPOSE_BIN version || true
  echo
  echo "== Listening ports (ss) =="
  ss -lntp || true
  echo
  echo "== Compose ps (prod) =="
  COMPOSE_PROFILES=prod $COMPOSE_BIN -f /home/ec2-user/bb-portfolio/deploy/compose/docker-compose.yml ps || true
  echo
  echo "== Nginx status =="
  systemctl is-active nginx || true
  nginx -t || true
  echo
  echo "== HTTP probes =="
  for url in \
    "http://localhost:3000/" \
    "http://localhost:3001/api/health" \
    "http://localhost:4000/" \
    "http://localhost:4001/api/health"; do
    code=$(curl -s -o /dev/null -w "%{http_code}" "$url" || true)
    echo "$code $url"
  done
  echo
  echo "== Nginx vhost probes =="
  # Probe HTTP vhost routing via Host header to ensure /api goes to backend
  http_code=$(curl -s -o /dev/null -w "%{http_code}" -H 'Host: bbaysinger.com' http://127.0.0.1/api/health/ || true)
  echo "HTTP  $http_code Host:bbaysinger.com http://127.0.0.1/api/health/"
  dev_http_code=$(curl -s -o /dev/null -w "%{http_code}" -H 'Host: dev.bbaysinger.com' http://127.0.0.1/api/health/ || true)
  echo "HTTP  $dev_http_code Host:dev.bbaysinger.com http://127.0.0.1/api/health/"
  # Probe HTTPS via local resolve (bypass DNS); ignore cert mismatch if any
  https_code=$(curl -s -k -o /dev/null -w "%{http_code}" --resolve bbaysinger.com:443:127.0.0.1 https://bbaysinger.com/api/health/ || true)
  echo "HTTPS $https_code bbaysinger.com /api/health/"
  dev_https_code=$(curl -s -k -o /dev/null -w "%{http_code}" --resolve dev.bbaysinger.com:443:127.0.0.1 https://dev.bbaysinger.com/api/health/ || true)
  echo "HTTPS $dev_https_code dev.bbaysinger.com /api/health/"
  echo
  echo "== Nginx logs (last 50 lines with /api/health) =="
  sudo sh -lc "grep -E '/api/health' /var/log/nginx/access.log | tail -n 50" || true
  sudo sh -lc "tail -n 50 /var/log/nginx/error.log" || true
'
