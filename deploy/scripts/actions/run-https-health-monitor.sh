#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${BB_PORTFOLIO_HTTPS_HEALTH_ENV:-/etc/bb-portfolio/https-health.env}"
STATE_DIR="${BB_PORTFOLIO_HTTPS_HEALTH_STATE_DIR:-/var/lib/bb-portfolio/https-health}"
STATUS_FILE="$STATE_DIR/status"
LAST_FAILURE_FILE="$STATE_DIR/last-failure.log"
TMP_LOG="$(mktemp)"

trap 'rm -f "$TMP_LOG"' EXIT

mkdir -p "$STATE_DIR"

if [[ -f "$CONFIG_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$CONFIG_FILE"
  set +a
fi

HOST_LABEL="${HOST_LABEL:-$(hostname -f 2>/dev/null || hostname)}"
SSL_DOMAIN="${SSL_DOMAIN:?SSL_DOMAIN required}"

send_state_email() {
  local mode="$1"
  local body="$2"
  local subject=""

  if [[ -z "${AWS_REGION:-}" || -z "${SES_FROM_EMAIL:-}" || -z "${SES_TO_EMAIL:-}" ]]; then
    echo "Skipping HTTPS health email ($mode): AWS_REGION / SES_FROM_EMAIL / SES_TO_EMAIL not fully configured" >&2
    return 0
  fi

  case "$mode" in
    failure)
      subject="[bb-portfolio] HTTPS certificate health alert"
      ;;
    recovery)
      subject="[bb-portfolio] HTTPS certificate health recovered"
      ;;
    *)
      echo "Unknown email mode: $mode" >&2
      return 1
      ;;
  esac

  AWS_REGION="$AWS_REGION" SES_FROM_EMAIL="$SES_FROM_EMAIL" SES_TO_EMAIL="$SES_TO_EMAIL" \
    "$SCRIPT_DIR/send-alert-email.sh" "$subject" "$body"
}

previous_status="unknown"
if [[ -f "$STATUS_FILE" ]]; then
  previous_status="$(<"$STATUS_FILE")"
fi

if "$SCRIPT_DIR/check-https-health-local.sh" >"$TMP_LOG" 2>&1; then
  cat "$TMP_LOG"
  if [[ "$previous_status" == "failure" ]]; then
    recovery_body=$(
      cat <<EOF
The host-level HTTPS certificate health check has recovered.

Host: $HOST_LABEL
Domain: $SSL_DOMAIN

Current output:
$(cat "$TMP_LOG")
EOF
    )
    send_state_email recovery "$recovery_body" || true
  fi
  echo "success" >"$STATUS_FILE"
  rm -f "$LAST_FAILURE_FILE"
  exit 0
fi

cat "$TMP_LOG" >&2
cp "$TMP_LOG" "$LAST_FAILURE_FILE"
echo "failure" >"$STATUS_FILE"

if [[ "$previous_status" != "failure" ]]; then
  failure_body=$(
    cat <<EOF
The host-level HTTPS certificate health check failed.

Host: $HOST_LABEL
Domain: $SSL_DOMAIN

Failure output:
$(cat "$TMP_LOG")
EOF
  )
  send_state_email failure "$failure_body" || true
fi

exit 1
