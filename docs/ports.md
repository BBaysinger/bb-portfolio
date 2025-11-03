# Ports and Routing Map

This document summarizes how ports are mapped across environments and how requests flow from the public edge to containers.

## EC2 (Production)

- Public ingress (Security Group): 80 (HTTP), 443 (HTTPS), 3000, 3001
- Host Nginx on :80 routes:
  - `/` → localhost:3000 → bb-portfolio-frontend-prod (3000:3000)
  - `/api/*`, `/admin*` → localhost:3001 → bb-portfolio-backend-prod (3001:3000)
- Internal container DNS: `bb-portfolio-frontend-prod:3000`, `bb-portfolio-backend-prod:3000`

## EC2 (Development)

- Public ingress (Security Group): 80 (HTTP), 443 (HTTPS), 4000, 4001
- Host Nginx on :80 routes:
  - `/` → localhost:4000 → bb-portfolio-frontend-dev (4000:3000)
  - `/api/*`, `/admin*` → localhost:4001 → bb-portfolio-backend-dev (4001:3000)
- Internal container DNS: `bb-portfolio-frontend-dev:3000`, `bb-portfolio-backend-dev:3000`
- Note: bb-portfolio-backend-dev must LISTEN on container port 3000 (enforced via `PORT=3000`)

## Local (compose: deploy/compose/docker-compose.yml)

- Profile: `local`
  - bb-portfolio-frontend-local: 8080 → 3000 (DNS: `bb-portfolio-frontend-local:3000`)
  - bb-portfolio-backend-local: 8081 → 3001 (DNS: `bb-portfolio-backend-local:3001`)
- Profile: `local-ssg`
  - bb-portfolio-frontend-local-ssg-generate: 8080 → 3000 (targets `bb-portfolio-backend-local-ssg-generate:3001`)
  - bb-portfolio-backend-local-ssg-generate: 8081 → 3001 (PORT=3001)

## Local with Optional Proxy (profile=proxy)

- Enable with: `COMPOSE_PROFILES=local,proxy docker compose up`
- Caddy: 8080 → 80, 8443 → 443
- Proxies to `bb-portfolio-frontend-local:3000` and `bb-portfolio-backend-local:3001`

## SSR internal targets

- Production SSR: `http://bb-portfolio-backend-prod:3000`
- Development SSR: `http://bb-portfolio-backend-dev:3000`

## Notes

- Consider restricting SG to 80/443 only in production, leaving 3000/3001 open temporarily for diagnostics as needed.
- The files `docker-compose.local.yml` and `docker-compose.caddy.yml` reference `Dockerfile.local` for app services; ensure those files exist or use the primary compose (`docker-compose.yml`) `local` profile.
