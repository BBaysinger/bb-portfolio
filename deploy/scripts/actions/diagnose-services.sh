#!/usr/bin/env bash
set -euo pipefail
KEY_PATH="${1:?ssh key path arg required}" 
EC2_HOST="${EC2_HOST:?EC2_HOST env required}"
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
'
