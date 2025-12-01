#!/usr/bin/env bash
set -euo pipefail
KEY_PATH="${1:?ssh key path arg required}" 
EC2_HOST="${EC2_HOST:?EC2_HOST env required}"
ENVIRONMENT="${ENVIRONMENT:?ENVIRONMENT env required}"
START_DEV="${START_DEV:-true}"
ATTEMPTS="${HEALTH_ATTEMPTS:-12}"; DELAY="${HEALTH_DELAY_SECONDS:-5}"
CURL_ATTEMPTS="${CURL_ATTEMPTS:-3}"; CURL_DELAY="${CURL_DELAY_SECONDS:-2}"
CURL_MAX_TIME="${CURL_MAX_TIME_SECONDS:-3}"; CURL_CONNECT_TIMEOUT_SEC="${CURL_CONNECT_TIMEOUT:-1}"
GRACE="${HEALTH_STARTING_GRACE_SECONDS:-40}" # Allow backend health: starting state for this many seconds

ssh_cmd() { ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ec2-user@"$EC2_HOST" "$@"; }

parse_uptime_seconds() {
  # Input: docker ps status line e.g. 'Up 18 seconds (health: starting)'
  local status="$1"
  local raw
  # Try seconds
  raw=$(echo "$status" | sed -nE 's/.*Up ([0-9]+) second(s)? .*/\1/p')
  if [ -n "$raw" ]; then echo "$raw"; return 0; fi
  # Try minutes
  raw=$(echo "$status" | sed -nE 's/.*Up ([0-9]+) minute(s)? .*/\1/p')
  if [ -n "$raw" ]; then echo $((raw*60)); return 0; fi
  # Try hours
  raw=$(echo "$status" | sed -nE 's/.*Up ([0-9]+) hour(s)? .*/\1/p')
  if [ -n "$raw" ]; then echo $((raw*3600)); return 0; fi
  echo 0
}

poll_containers() {
  local env="$1"; local tries=0
  local be_name fe_name
  case "$env" in
    prod) be_name="bb-portfolio-backend-prod"; fe_name="bb-portfolio-frontend-prod";;
    dev)  be_name="bb-portfolio-backend-dev";  fe_name="bb-portfolio-frontend-dev";;
  esac
  echo "Polling container health for $env (max $ATTEMPTS attempts, $DELAY s delay)" >&2
  while [ $tries -lt $ATTEMPTS ]; do
    local be_status fe_status
    be_status=$(ssh_cmd "docker ps --filter name=$be_name --format '{{.Status}}'" || true)
    fe_status=$(ssh_cmd "docker ps --filter name=$fe_name --format '{{.Status}}'" || true)
    be_ready=false; fe_ready=false
    # Frontend readiness: simply Up
    if echo "$fe_status" | grep -qi '^Up '; then fe_ready=true; fi
    # Backend readiness: healthy OR grace allowance if still starting
    if echo "$be_status" | grep -qi 'healthy'; then
      be_ready=true
    else
      if echo "$be_status" | grep -qi 'health: starting'; then
        local uptime
        uptime=$(parse_uptime_seconds "$be_status")
        if [ "$uptime" -ge "$GRACE" ]; then
          echo "Grace satisfied ($uptime s >= $GRACE s) treating backend as ready despite health: starting" >&2
          be_ready=true
        fi
      fi
    fi
    if [[ "$be_ready" == true && "$fe_ready" == true ]]; then
      echo "Containers ready for $env (backend: $be_status, frontend: $fe_status)" >&2
      return 0
    fi
    tries=$((tries+1))
    echo "Attempt $tries/$ATTEMPTS ($env) not ready yet (be='$be_status' fe='$fe_status')" >&2
    sleep "$DELAY"
  done
  echo "WARN: Containers not healthy after $ATTEMPTS attempts ($env) (be='$be_status' fe='$fe_status')" >&2
  return 1
}

curl_with_retry() {
  local port="$1"; local path="$2"; local label="$3"; local attempt=0; local code=""
  while [ $attempt -lt "$CURL_ATTEMPTS" ]; do
    code=$(ssh_cmd "curl --max-time ${CURL_MAX_TIME} --connect-timeout ${CURL_CONNECT_TIMEOUT_SEC} -s -o /dev/null -w '%{http_code}' http://localhost:${port}${path} -L" || echo '000')
    if [[ "$code" == 2* || "$code" == 3* ]]; then
      echo "OK $label HTTP $code" >&2; return 0
    fi
    attempt=$((attempt+1))
    if [[ "$code" == "000" && $attempt -lt "$CURL_ATTEMPTS" ]]; then
      echo "Transient $label code 000 (attempt $attempt/$CURL_ATTEMPTS)" >&2; sleep "$CURL_DELAY"; continue
    fi
    echo "Attempt $attempt/$CURL_ATTEMPTS $label code=$code" >&2
    sleep "$CURL_DELAY"
  done
  echo "WARN: $label unhealthy after $CURL_ATTEMPTS attempts (last code=$code)" >&2
  return 1
}

if [ "$ENVIRONMENT" = "prod" ] || [ "$ENVIRONMENT" = "both" ]; then poll_containers prod || true; fi
if [ "$ENVIRONMENT" = "dev" ]; then
  poll_containers dev || true
elif [ "$ENVIRONMENT" = "both" ] && { [ "$START_DEV" = "true" ] || [ "$START_DEV" = true ]; }; then
  poll_containers dev || true
fi
if [ "$ENVIRONMENT" = "prod" ] || [ "$ENVIRONMENT" = "both" ]; then
  curl_with_retry 3000 / "frontend prod"
  curl_with_retry 3001 /api/health/ "backend prod health"
fi
if [ "$ENVIRONMENT" = "dev" ]; then
  curl_with_retry 4000 / "frontend dev"
  curl_with_retry 4001 /api/health/ "backend dev health"
elif [ "$ENVIRONMENT" = "both" ] && { [ "$START_DEV" = "true" ] || [ "$START_DEV" = true ]; }; then
  curl_with_retry 4000 / "frontend dev"
  curl_with_retry 4001 /api/health/ "backend dev health"
fi
