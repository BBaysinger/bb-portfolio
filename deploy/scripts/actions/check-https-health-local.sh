#!/usr/bin/env bash
set -euo pipefail

CONFIG_FILE="${BB_PORTFOLIO_HTTPS_HEALTH_ENV:-/etc/bb-portfolio/https-health.env}"

if [[ -f "$CONFIG_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$CONFIG_FILE"
  set +a
fi

SSL_DOMAIN="${SSL_DOMAIN:?SSL_DOMAIN required}"
HTTPS_ALERT_DAYS="${HTTPS_ALERT_DAYS:-21}"
CERTBOT_DRY_RUN_ATTEMPTS="${CERTBOT_DRY_RUN_ATTEMPTS:-3}"

if [[ "$SSL_DOMAIN" =~ ^(www|dev)\. ]]; then
  echo "Resolved SSL domain must be the apex domain, got: $SSL_DOMAIN" >&2
  exit 1
fi

DEV_SSL_DOMAIN="dev.$SSL_DOMAIN"

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
  local https_probe_log
  local http_probe_log
  local status_code
  local redirect_code

  echo "Checking certificate and origin probes for $domain (cert: $cert_domain)"

  if ! sudo test -s "$cert_path"; then
    echo "Certificate file missing: $cert_path" >&2
    exit 1
  fi

  if ! sudo openssl x509 -checkend "$((HTTPS_ALERT_DAYS * 86400))" -noout -in "$cert_path" >/dev/null; then
    local end_date
    end_date="$(sudo openssl x509 -enddate -noout -in "$cert_path" | cut -d= -f2-)"
    echo "Certificate for $domain expires within ${HTTPS_ALERT_DAYS} days: $end_date" >&2
    exit 1
  fi

  https_probe_log="$(mktemp)"
  if ! status_code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 --resolve "$domain:443:127.0.0.1" "https://$domain/" 2>"$https_probe_log")"; then
    echo "HTTPS origin probe failed for $domain" >&2
    cat "$https_probe_log" >&2
    rm -f "$https_probe_log"
    exit 1
  fi
  rm -f "$https_probe_log"

  if [[ ! "$status_code" =~ ^(200|301|302|307|308)$ ]]; then
    echo "Unexpected HTTPS status for $domain: $status_code" >&2
    exit 1
  fi

  http_probe_log="$(mktemp)"
  if ! redirect_code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 --resolve "$domain:80:127.0.0.1" "http://$domain/" 2>"$http_probe_log")"; then
    echo "HTTP redirect probe failed for $domain" >&2
    cat "$http_probe_log" >&2
    rm -f "$http_probe_log"
    exit 1
  fi
  rm -f "$http_probe_log"

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
