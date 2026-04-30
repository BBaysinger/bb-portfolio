#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

source "$REPO_ROOT/scripts/lib/repo-env.sh"
bb_load_repo_env "$REPO_ROOT"

KEY_PATH="${1:?ssh key path arg required}"
EC2_HOST="$(bb_ec2_host_or_die)"
HTTPS_ALERT_DAYS="${HTTPS_ALERT_DAYS:-21}"
CERTBOT_DRY_RUN_ATTEMPTS="${CERTBOT_DRY_RUN_ATTEMPTS:-3}"
SSH_SERVER_ALIVE_INTERVAL="${SSH_SERVER_ALIVE_INTERVAL:-30}"
SSH_SERVER_ALIVE_COUNT_MAX="${SSH_SERVER_ALIVE_COUNT_MAX:-6}"

resolve_ssl_domain() {
  local domain
  domain="$(bb_resolve_ssl_domain)"
  if [[ -n "$domain" ]]; then
    echo "$domain"
    return 0
  fi
  echo "Unable to resolve SSL domain from SSL_DOMAIN, PUBLIC_SERVER_URL, PAYLOAD_PUBLIC_SERVER_URL, or FRONTEND_URL" >&2
  return 1
}

SSL_DOMAIN="$(resolve_ssl_domain)"
if ! bb_is_apex_ssl_domain "$SSL_DOMAIN"; then
  echo "Resolved SSL domain must be an apex domain, got: $SSL_DOMAIN" >&2
  exit 1
fi

DEV_SSL_DOMAIN="dev.$SSL_DOMAIN"

ssh -i "$KEY_PATH" \
  -o StrictHostKeyChecking=no \
  -o UserKnownHostsFile=/dev/null \
  -o TCPKeepAlive=yes \
  -o ServerAliveInterval="$SSH_SERVER_ALIVE_INTERVAL" \
  -o ServerAliveCountMax="$SSH_SERVER_ALIVE_COUNT_MAX" \
  ec2-user@"$EC2_HOST" \
  "SSL_DOMAIN='$SSL_DOMAIN' DEV_SSL_DOMAIN='$DEV_SSL_DOMAIN' HTTPS_ALERT_DAYS='$HTTPS_ALERT_DAYS' CERTBOT_DRY_RUN_ATTEMPTS='$CERTBOT_DRY_RUN_ATTEMPTS' bash -s" <<'SSH'
set -euo pipefail

SSL_DOMAIN="${SSL_DOMAIN:?SSL_DOMAIN required}"
DEV_SSL_DOMAIN="${DEV_SSL_DOMAIN:?DEV_SSL_DOMAIN required}"
HTTPS_ALERT_DAYS="${HTTPS_ALERT_DAYS:?HTTPS_ALERT_DAYS required}"
CERTBOT_DRY_RUN_ATTEMPTS="${CERTBOT_DRY_RUN_ATTEMPTS:?CERTBOT_DRY_RUN_ATTEMPTS required}"

if ! command -v certbot >/dev/null 2>&1; then
  echo "certbot is not installed on host" >&2
  exit 1
fi

timer_state="$(sudo systemctl is-enabled certbot-renew.timer || true)"
if [[ "$timer_state" != "enabled" ]]; then
  echo "certbot-renew.timer is not enabled (state: $timer_state)" >&2
  exit 1
fi

timer_active="$(sudo systemctl is-active certbot-renew.timer || true)"
if [[ "$timer_active" != "active" ]]; then
  echo "certbot-renew.timer is not active (state: $timer_active)" >&2
  exit 1
fi

check_https_domain() {
  local domain="$1"
  local cert_domain="$2"
  local cert_path="/etc/letsencrypt/live/$cert_domain/fullchain.pem"

  if ! sudo test -s "$cert_path"; then
    echo "Certificate file missing: $cert_path" >&2
    exit 1
  fi

  if ! sudo openssl x509 -checkend "$((HTTPS_ALERT_DAYS * 86400))" -noout -in "$cert_path" >/dev/null; then
    end_date="$(sudo openssl x509 -enddate -noout -in "$cert_path" | cut -d= -f2-)"
    echo "Certificate for $domain expires within ${HTTPS_ALERT_DAYS} days: $end_date" >&2
    exit 1
  fi

  status_code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 --resolve "$domain:443:127.0.0.1" "https://$domain/")"
  if [[ ! "$status_code" =~ ^(200|301|302|307|308)$ ]]; then
    echo "Unexpected HTTPS status for $domain: $status_code" >&2
    exit 1
  fi

  redirect_code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 --resolve "$domain:80:127.0.0.1" "http://$domain/")"
  if [[ ! "$redirect_code" =~ ^(301|302|307|308)$ ]]; then
    echo "Unexpected HTTP status for $domain (expected redirect to HTTPS): $redirect_code" >&2
    exit 1
  fi
}

check_https_domain "$SSL_DOMAIN" "$SSL_DOMAIN"
check_https_domain "www.$SSL_DOMAIN" "$SSL_DOMAIN"

if sudo test -s "/etc/letsencrypt/live/$DEV_SSL_DOMAIN/fullchain.pem"; then
  check_https_domain "$DEV_SSL_DOMAIN" "$DEV_SSL_DOMAIN"
fi

certbot_dry_run_attempt=1
while true; do
  if sudo certbot renew --dry-run >/tmp/certbot-dry-run.log 2>&1; then
    break
  fi

  if grep -q 'Another instance of Certbot is already running' /tmp/certbot-dry-run.log; then
    echo 'certbot renew --dry-run skipped because another certbot process is already running'
    break
  fi

  if [[ "$certbot_dry_run_attempt" -ge "$CERTBOT_DRY_RUN_ATTEMPTS" ]]; then
    cat /tmp/certbot-dry-run.log >&2
    exit 1
  fi

  echo "certbot renew --dry-run failed on attempt ${certbot_dry_run_attempt}/${CERTBOT_DRY_RUN_ATTEMPTS}; retrying" >&2
  certbot_dry_run_attempt="$((certbot_dry_run_attempt + 1))"
done

echo "HTTPS health check passed for $SSL_DOMAIN"
SSH
