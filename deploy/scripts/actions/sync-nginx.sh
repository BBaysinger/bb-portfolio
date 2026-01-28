#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

source "$REPO_ROOT/scripts/lib/repo-env.sh"
bb_load_repo_env "$REPO_ROOT"

resolve_ssl_domain() {
  local domain="${SSL_DOMAIN:-}"
  if [[ -n "$domain" ]]; then
    echo "${domain#www.}"; return 0
  fi

  # Prefer the canonical origin (Payload admin/API), then fall back to frontend origins.
  # Note: FRONTEND_URL is commonly comma-separated (CORS/CSRF allowlist), so only
  # the first origin is parseable as a URL.
  local origin="${PUBLIC_SERVER_URL:-${PAYLOAD_PUBLIC_SERVER_URL:-${FRONTEND_URL:-}}}"
  if [[ -n "$origin" ]]; then
    origin="${origin%%,*}"
    domain=$(node -e "try{process.stdout.write(new URL(process.argv[1]).hostname.replace(/^www\\./,''));}catch(e){process.stdout.write('');}" "$origin")
    if [[ -n "$domain" ]]; then
      echo "$domain"; return 0
    fi
  fi

  echo ""; return 1
}

KEY_PATH="${1:?ssh key path arg required}" 
EC2_HOST="$(bb_ec2_host_or_die)"
SSL_DOMAIN_LOCAL="$(resolve_ssl_domain || true)"

echo "== Uploading Nginx vhost config =="
scp -i "$KEY_PATH" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -C \
  deploy/nginx/bb-portfolio.conf ec2-user@"$EC2_HOST":/home/ec2-user/bb-portfolio/bb-portfolio.conf

echo "== Installing to /etc/nginx/conf.d and reloading =="
ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
  ec2-user@"$EC2_HOST" "SSL_DOMAIN='$SSL_DOMAIN_LOCAL' bash -s" <<'SSH'
set -e
sudo mkdir -p /etc/nginx/conf.d
sudo mv -f /home/ec2-user/bb-portfolio/bb-portfolio.conf /etc/nginx/conf.d/bb-portfolio.conf
sudo chown root:root /etc/nginx/conf.d/bb-portfolio.conf

# Optional SSL config:
# - Keep SSL blocks in a separate include file.
# - SSL_DOMAIN must be explicitly provided by the deploy runner (CI/Orchestrator).
# - Do NOT delete an existing SSL config automatically; doing so can drop :443.
SSL_DOMAIN="${SSL_DOMAIN:-}"
SSL_CONF=/etc/nginx/conf.d/bb-portfolio-ssl.conf

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
  && sudo test -s "/etc/letsencrypt/live/$SSL_DOMAIN/fullchain.pem" \
  && sudo test -s "/etc/letsencrypt/live/$SSL_DOMAIN/privkey.pem" \
  && sudo test -s /etc/letsencrypt/options-ssl-nginx.conf; then
  echo "Installing SSL nginx config for $SSL_DOMAIN";
  sudo tee "$SSL_CONF" >/dev/null <<CONF
server {
  listen 443 ssl;
  http2 on;
  server_name $SSL_DOMAIN www.$SSL_DOMAIN;
  ssl_certificate     /etc/letsencrypt/live/$SSL_DOMAIN/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/$SSL_DOMAIN/privkey.pem;
  include /etc/letsencrypt/options-ssl-nginx.conf;

  # Route Next.js assets based on referer.
  # Payload admin is served by the backend, but it references assets at /_next/*.
  set $next_upstream_prod_local http://127.0.0.1:3000;
  if ($http_referer ~* /admin/) { set $next_upstream_prod_local http://127.0.0.1:3001; }

  location = /healthz { return 200 'ok'; add_header Content-Type text/plain; }
  location = /admin { return 308 /admin/; }
  location ^~ /admin/ { proxy_pass http://127.0.0.1:3001; }

  # Let Payload-specific assets win even if referer is missing.
  location ~ ^/_next/static/(css|chunks)/app/\(payload\)/ { proxy_pass http://127.0.0.1:3001; }
  location ~ ^/_next/static/media/payload- { proxy_pass http://127.0.0.1:3001; }

  # Generic Next.js assets: frontend by default, backend for admin pages.
  # (No ^~ here so the regex rules above can still match.)
  location /_next/ { proxy_pass $next_upstream_prod_local; }

  location /api/ { proxy_pass http://127.0.0.1:3001; }
  location / { proxy_pass http://127.0.0.1:3000/; }
}
server {
  listen 443 ssl;
  http2 on;
  server_name dev.$SSL_DOMAIN;
  ssl_certificate     /etc/letsencrypt/live/$SSL_DOMAIN/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/$SSL_DOMAIN/privkey.pem;
  include /etc/letsencrypt/options-ssl-nginx.conf;

  set $next_upstream_dev_local http://127.0.0.1:4000;
  if ($http_referer ~* /admin/) { set $next_upstream_dev_local http://127.0.0.1:4001; }

  location = /healthz { return 200 'ok'; add_header Content-Type text/plain; }
  location = /admin { return 308 /admin/; }
  location ^~ /admin/ { proxy_pass http://127.0.0.1:4001; }

  location ~ ^/_next/static/(css|chunks)/app/\(payload\)/ { proxy_pass http://127.0.0.1:4001; }
  location ~ ^/_next/static/media/payload- { proxy_pass http://127.0.0.1:4001; }
  location /_next/ { proxy_pass $next_upstream_dev_local; }

  location /api/ { proxy_pass http://127.0.0.1:4001; }
  location / { proxy_pass http://127.0.0.1:4000/; }
}
CONF
else
  echo "Skipping SSL nginx config for $SSL_DOMAIN (cert files missing). Keeping any existing SSL config as-is."
fi
sudo nginx -t
sudo systemctl reload nginx
echo "Nginx active: $(systemctl is-active nginx)"
echo "Listeners:"; sudo ss -ltnp | egrep ":80|:443" || true
echo "HTTP /healthz:"; curl -s -I --max-time 4 http://127.0.0.1/healthz || true
SSH
