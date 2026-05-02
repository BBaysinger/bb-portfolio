#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

source "$REPO_ROOT/scripts/lib/repo-env.sh"
bb_load_repo_env "$REPO_ROOT"

resolve_ssl_domain() {
  local domain
  domain="$(bb_resolve_ssl_domain)"
  if [[ -n "$domain" ]]; then
    echo "$domain"
    return 0
  fi
  echo ""
  return 1
}

KEY_PATH="${1:?ssh key path arg required}"
EC2_HOST="$(bb_ec2_host_or_die)"
SSL_DOMAIN_LOCAL="$(resolve_ssl_domain || true)"

if [[ -n "$SSL_DOMAIN_LOCAL" ]] && ! bb_is_apex_ssl_domain "$SSL_DOMAIN_LOCAL"; then
  echo "Refusing to sync nginx with non-canonical SSL domain: $SSL_DOMAIN_LOCAL" >&2
  exit 1
fi

echo "== Uploading Nginx vhost config =="
scp -i "$KEY_PATH" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -C \
  deploy/nginx/bb-portfolio.conf ec2-user@"$EC2_HOST":/home/ec2-user/bb-portfolio/bb-portfolio.conf

echo "== Uploading deploy maintenance page =="
scp -i "$KEY_PATH" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -C \
  deploy/nginx/__deploying.html ec2-user@"$EC2_HOST":/home/ec2-user/bb-portfolio/__deploying.html

echo "== Installing to /etc/nginx/conf.d and reloading =="
ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
  ec2-user@"$EC2_HOST" "SSL_DOMAIN='$SSL_DOMAIN_LOCAL' bash -s" <<'SSH'
set -e
sudo mkdir -p /etc/nginx/conf.d
sudo mkdir -p /var/www/html
sudo mv -f /home/ec2-user/bb-portfolio/bb-portfolio.conf /etc/nginx/conf.d/bb-portfolio.conf
sudo mv -f /home/ec2-user/bb-portfolio/__deploying.html /var/www/html/__deploying.html
sudo chown root:root /etc/nginx/conf.d/bb-portfolio.conf
sudo chown root:root /var/www/html/__deploying.html

if command -v certbot >/dev/null 2>&1 && systemctl list-unit-files | grep -q '^certbot-renew.timer'; then
  sudo systemctl enable --now certbot-renew.timer || echo "Failed to enable certbot-renew.timer"
fi

# Optional SSL config:
# - Keep SSL blocks in a separate include file.
# - SSL_DOMAIN must be explicitly provided by the deployment runner (CI/manual deploy flow).
# - Do NOT delete an existing SSL config automatically; doing so can drop :443.
SSL_DOMAIN="${SSL_DOMAIN:-}"
SSL_CONF=/etc/nginx/conf.d/bb-portfolio-ssl.conf
PROD_CERT_DOMAIN="$SSL_DOMAIN"
DEV_CERT_DOMAIN="dev.$SSL_DOMAIN"

if [ -z "$SSL_DOMAIN" ]; then
  echo "Skipping SSL nginx config: SSL_DOMAIN not provided. Keeping any existing SSL config as-is."
  sudo nginx -t
  sudo systemctl reload nginx
  echo "Nginx active: $(systemctl is-active nginx)"
  echo "Listeners:"; sudo ss -ltnp | egrep ":80|:443" || true
  echo "HTTP /healthz:"; curl -s -I --max-time 4 http://127.0.0.1/healthz || true
  exit 0
fi

if [ -n "$SSL_DOMAIN" ] \
  && sudo test -s "/etc/letsencrypt/live/$PROD_CERT_DOMAIN/fullchain.pem" \
  && sudo test -s "/etc/letsencrypt/live/$PROD_CERT_DOMAIN/privkey.pem" \
  && sudo test -s /etc/letsencrypt/options-ssl-nginx.conf; then
  echo "Installing SSL nginx config for $SSL_DOMAIN";
  sudo tee "$SSL_CONF" >/dev/null <<CONF
server {
  listen 443 ssl;
  http2 on;
  server_name $SSL_DOMAIN www.$SSL_DOMAIN;
  ssl_certificate     /etc/letsencrypt/live/$PROD_CERT_DOMAIN/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/$PROD_CERT_DOMAIN/privkey.pem;
  include /etc/letsencrypt/options-ssl-nginx.conf;

  # Route Next.js assets based on referer.
  # Payload admin is served by the backend, but it references assets at /_next/*.
  set \$next_upstream_prod_local http://127.0.0.1:3000;
  if (\$http_referer ~* /admin/) { set \$next_upstream_prod_local http://127.0.0.1:3001; }

  proxy_intercept_errors on;
  error_page 418 502 503 504 =503 /__deploying.html;

  location = /__deploying.html {
    internal;
    default_type text/html;
    add_header Cache-Control "no-store, max-age=0" always;
    add_header Retry-After "15" always;
    root /var/www/html;
    try_files /__deploying.html =503;
  }

  location = /healthz { return 200 'ok'; add_header Content-Type text/plain; }
  location = /admin {
    if (-f /var/run/bb-portfolio-maintenance-prod) { return 418; }
    return 308 /admin/;
  }
  location ^~ /admin/ {
    if (-f /var/run/bb-portfolio-maintenance-prod) { return 418; }
    proxy_pass http://127.0.0.1:3001;
  }

  # Let Payload-specific assets win even if referer is missing.
  location ~ ^/_next/static/(css|chunks)/app/\(payload\)/ {
    if (-f /var/run/bb-portfolio-maintenance-prod) { return 418; }
    proxy_pass http://127.0.0.1:3001;
  }
  location ~ ^/_next/static/media/payload- {
    if (-f /var/run/bb-portfolio-maintenance-prod) { return 418; }
    proxy_pass http://127.0.0.1:3001;
  }

  # Generic Next.js assets: frontend by default, backend for admin pages.
  # (No ^~ here so the regex rules above can still match.)
  location /_next/ {
    if (-f /var/run/bb-portfolio-maintenance-prod) { return 418; }
    proxy_pass \$next_upstream_prod_local;
  }

  location = /api/revalidate/projects {
    if (-f /var/run/bb-portfolio-maintenance-prod) { return 418; }
    proxy_pass http://127.0.0.1:3000;
  }
  location = /api/revalidate/projects/ {
    if (-f /var/run/bb-portfolio-maintenance-prod) { return 418; }
    proxy_pass http://127.0.0.1:3000;
  }

  location /api/ {
    if (-f /var/run/bb-portfolio-maintenance-prod) { return 418; }
    proxy_pass http://127.0.0.1:3001;
  }
  location / {
    if (-f /var/run/bb-portfolio-maintenance-prod) { return 418; }
    proxy_pass http://127.0.0.1:3000/;
  }
}
CONF

  if sudo test -s "/etc/letsencrypt/live/$DEV_CERT_DOMAIN/fullchain.pem" \
    && sudo test -s "/etc/letsencrypt/live/$DEV_CERT_DOMAIN/privkey.pem"; then
    sudo tee -a "$SSL_CONF" >/dev/null <<CONF
server {
  listen 443 ssl;
  http2 on;
  server_name dev.$SSL_DOMAIN;
  ssl_certificate     /etc/letsencrypt/live/$DEV_CERT_DOMAIN/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/$DEV_CERT_DOMAIN/privkey.pem;
  include /etc/letsencrypt/options-ssl-nginx.conf;

  set \$next_upstream_dev_local http://127.0.0.1:4000;
  if (\$http_referer ~* /admin/) { set \$next_upstream_dev_local http://127.0.0.1:4001; }

  proxy_intercept_errors on;
  error_page 418 502 503 504 =503 /__deploying.html;

  location = /__deploying.html {
    internal;
    default_type text/html;
    add_header Cache-Control "no-store, max-age=0" always;
    add_header Retry-After "15" always;
    root /var/www/html;
    try_files /__deploying.html =503;
  }

  location = /healthz { return 200 'ok'; add_header Content-Type text/plain; }
  location = /admin {
    if (-f /var/run/bb-portfolio-maintenance-dev) { return 418; }
    return 308 /admin/;
  }
  location ^~ /admin/ {
    if (-f /var/run/bb-portfolio-maintenance-dev) { return 418; }
    proxy_pass http://127.0.0.1:4001;
  }

  location ~ ^/_next/static/(css|chunks)/app/\(payload\)/ {
    if (-f /var/run/bb-portfolio-maintenance-dev) { return 418; }
    proxy_pass http://127.0.0.1:4001;
  }
  location ~ ^/_next/static/media/payload- {
    if (-f /var/run/bb-portfolio-maintenance-dev) { return 418; }
    proxy_pass http://127.0.0.1:4001;
  }
  location /_next/ {
    if (-f /var/run/bb-portfolio-maintenance-dev) { return 418; }
    proxy_pass \$next_upstream_dev_local;
  }

  location = /api/revalidate/projects {
    if (-f /var/run/bb-portfolio-maintenance-dev) { return 418; }
    proxy_pass http://127.0.0.1:4000;
  }
  location = /api/revalidate/projects/ {
    if (-f /var/run/bb-portfolio-maintenance-dev) { return 418; }
    proxy_pass http://127.0.0.1:4000;
  }

  location /api/ {
    if (-f /var/run/bb-portfolio-maintenance-dev) { return 418; }
    proxy_pass http://127.0.0.1:4001;
  }
  location / {
    if (-f /var/run/bb-portfolio-maintenance-dev) { return 418; }
    proxy_pass http://127.0.0.1:4000/;
  }
}
CONF
  else
    echo "Skipping dev SSL nginx config for $DEV_CERT_DOMAIN (cert files missing)."
  fi
else
  echo "Skipping SSL nginx config for $SSL_DOMAIN (cert files missing). Keeping any existing SSL config as-is."
fi
sudo nginx -t
sudo systemctl reload nginx
echo "Nginx active: $(systemctl is-active nginx)"
echo "Listeners:"; sudo ss -ltnp | egrep ":80|:443" || true
echo "HTTP /healthz:"; curl -s -I --max-time 4 http://127.0.0.1/healthz || true
SSH
