# Ports and Routing Map

This document summarizes how ports are mapped across environments and how requests flow from the public edge to containers.

## EC2 (Production)

- Public ingress (Security Group): 80 (HTTP), 443 (HTTPS), 3000, 3001
- Host Nginx on :80 routes:
  - `/` → localhost:3000 → frontend-prod (3000:3000)
  - `/api/*`, `/admin*` → localhost:3001 → backend-prod (3001:3000)
- Internal container DNS: `frontend-prod:3000`, `backend-prod:3000`

## EC2 (Development)

- Public ingress (Security Group): 80 (HTTP), 443 (HTTPS), 4000, 4001
- Host Nginx on :80 routes:
  - `/` → localhost:4000 → frontend-dev (4000:3000)
  - `/api/*`, `/admin*` → localhost:4001 → backend-dev (4001:3000)
- Internal container DNS: `frontend-dev:3000`, `backend-dev:3000`
- Note: backend-dev must LISTEN on container port 3000 (enforced via `PORT=3000`)

## Local (compose: deploy/compose/docker-compose.yml)

- Profile: `local`
  - frontend-local: 8080 → 3000 (DNS: `frontend-local:3000`)
  - backend-local: 8081 → 3001 (DNS: `backend-local:3001`)
- Profile: `local-ssg`
  - frontend-local-ssg-generate: 8080 → 3000 (targets `backend-local-ssg-generate:3001`)
  - backend-local-ssg-generate: 8081 → 3001 (PORT=3001)

## Local with Optional Proxy (profile=proxy)

- Enable with: `COMPOSE_PROFILES=local,proxy docker compose up`
- Caddy: 8080 → 80, 8443 → 443
- Proxies to `frontend-local:3000` and `backend-local:3001`

## SSR internal targets

- Production SSR: `http://backend-prod:3000`
- Development SSR: `http://backend-dev:3000`

## Notes

- Consider restricting SG to 80/443 only in production, leaving 3000/3001 open temporarily for diagnostics as needed.
- The files `docker-compose.local.yml` and `docker-compose.caddy.yml` reference `Dockerfile.local` for app services; ensure those files exist or use the primary compose (`docker-compose.yml`) `local` profile.
