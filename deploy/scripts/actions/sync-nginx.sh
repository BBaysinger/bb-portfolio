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
  # Optional SSL config:
  # - Keep SSL blocks in a separate include file.
  # - Only create it when SSL_DOMAIN is provided AND real cert files exist.
  # - Otherwise remove it, so nginx -t never fails due to missing certs.
  SSL_DOMAIN="${SSL_DOMAIN:-}"
  SSL_CONF=/etc/nginx/conf.d/bb-portfolio-ssl.conf
  if [ -n "$SSL_DOMAIN" ] \
    && [ -s "/etc/letsencrypt/live/$SSL_DOMAIN/fullchain.pem" ] \
    && [ -s "/etc/letsencrypt/live/$SSL_DOMAIN/privkey.pem" ] \
    && [ -s /etc/letsencrypt/options-ssl-nginx.conf ]; then
    echo "Installing SSL nginx config for $SSL_DOMAIN";
    sudo tee "$SSL_CONF" >/dev/null <<CONF
server {
  listen 443 ssl;
  http2 on;
  server_name $SSL_DOMAIN www.$SSL_DOMAIN;
  ssl_certificate     /etc/letsencrypt/live/$SSL_DOMAIN/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/$SSL_DOMAIN/privkey.pem;
  include /etc/letsencrypt/options-ssl-nginx.conf;
  location = /healthz { return 200 'ok'; add_header Content-Type text/plain; }
  location = /admin { return 308 /admin/; }
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
  server_name dev.$SSL_DOMAIN;
  ssl_certificate     /etc/letsencrypt/live/$SSL_DOMAIN/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/$SSL_DOMAIN/privkey.pem;
  include /etc/letsencrypt/options-ssl-nginx.conf;
  location = /healthz { return 200 'ok'; add_header Content-Type text/plain; }
  location = /admin { return 308 /admin/; }
  location ^~ /admin/ { proxy_pass http://127.0.0.1:4001; }
  location ^~ /admin/_next/ { proxy_pass http://127.0.0.1:4001; }
  location ~ ^/_next/static/(css|chunks)/app/\(payload\)/ { proxy_pass http://127.0.0.1:4001; }
  location ~ ^/_next/static/media/payload- { proxy_pass http://127.0.0.1:4001; }
  location /api/ { proxy_pass http://127.0.0.1:4001; }
  location / { proxy_pass http://127.0.0.1:4000/; }
}
CONF
  else
    sudo rm -f "$SSL_CONF"
  fi
  sudo nginx -t
  sudo systemctl reload nginx
  echo "Nginx active: $(systemctl is-active nginx)"
  echo "Listeners:"; sudo ss -ltnp | egrep ":80|:443" || true
  echo "HTTP /healthz:"; curl -s -I --max-time 4 http://127.0.0.1/healthz || true
'
