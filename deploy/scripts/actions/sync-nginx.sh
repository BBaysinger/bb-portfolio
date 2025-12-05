#!/usr/bin/env bash
set -euo pipefail
KEY_PATH="${1:?ssh key path arg required}" 
EC2_HOST="${EC2_HOST:?EC2_HOST env required}"

echo "== Uploading Nginx vhost config =="
scp -i "$KEY_PATH" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -C \
  deploy/nginx/bb-portfolio.conf ec2-user@"$EC2_HOST":/home/ec2-user/bb-portfolio/bb-portfolio.conf

echo "== Installing to /etc/nginx/conf.d and reloading =="
ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ec2-user@"$EC2_HOST" $'set -e
  sudo mkdir -p /etc/nginx/conf.d
  sudo mv -f /home/ec2-user/bb-portfolio/bb-portfolio.conf /etc/nginx/conf.d/bb-portfolio.conf
  sudo chown root:root /etc/nginx/conf.d/bb-portfolio.conf
  # Auto-append SSL blocks if missing and certs exist (idempotent)
  if ! grep -q "listen 443" /etc/nginx/conf.d/bb-portfolio.conf && [ -d /etc/letsencrypt/live/bbaysinger.com ]; then
    echo "Appending SSL blocks to nginx config (auto)";
    sudo tee -a /etc/nginx/conf.d/bb-portfolio.conf >/dev/null <<'CONF'
server {
  listen 443 ssl;
  http2 on;
  server_name bbaysinger.com www.bbaysinger.com;
  ssl_certificate     /etc/letsencrypt/live/bbaysinger.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/bbaysinger.com/privkey.pem;
  include /etc/letsencrypt/options-ssl-nginx.conf;
  location = /healthz { return 200 'ok'; add_header Content-Type text/plain; }
  # Redirect bare /admin to trailing slash for Next.js trailingSlash=true
  location = /admin { return 308 /admin/; }
  # Admin UI and assets → backend
  location ^~ /admin/ { proxy_pass http://127.0.0.1:3001; }
  location ^~ /admin/_next/ { proxy_pass http://127.0.0.1:3001; }
  location ~ ^/_next/static/(css|chunks)/app/\(payload\)/ { proxy_pass http://127.0.0.1:3001; }
  location ~ ^/_next/static/media/payload- { proxy_pass http://127.0.0.1:3001; }
  location /api/ { proxy_pass http://127.0.0.1:3001; }
  location / { proxy_pass http://127.0.0.1:3000/; }
}
server {
  listen 443 ssl;
  http2 on;
  server_name dev.bbaysinger.com;
  ssl_certificate     /etc/letsencrypt/live/bbaysinger.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/bbaysinger.com/privkey.pem;
  include /etc/letsencrypt/options-ssl-nginx.conf;
  location = /healthz { return 200 'ok'; add_header Content-Type text/plain; }
  # Redirect bare /admin to trailing slash for Next.js trailingSlash=true (dev)
  location = /admin { return 308 /admin/; }
  # Admin UI and assets → backend (dev)
  location ^~ /admin/ { proxy_pass http://127.0.0.1:4001; }
  location ^~ /admin/_next/ { proxy_pass http://127.0.0.1:4001; }
  location ~ ^/_next/static/(css|chunks)/app/\(payload\)/ { proxy_pass http://127.0.0.1:4001; }
  location ~ ^/_next/static/media/payload- { proxy_pass http://127.0.0.1:4001; }
  location /api/ { proxy_pass http://127.0.0.1:4001; }
  location / { proxy_pass http://127.0.0.1:4000/; }
}
CONF
  fi
  sudo nginx -t
  sudo systemctl reload nginx
  echo "Nginx active: $(systemctl is-active nginx)"
  echo "Listeners:"; sudo ss -ltnp | egrep ":80|:443" || true
  echo "HTTP /healthz:"; curl -s -I --max-time 4 http://127.0.0.1/healthz || true
'
