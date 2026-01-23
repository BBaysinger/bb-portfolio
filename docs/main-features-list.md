# Main Features List

Working list of notable features

## Frontend UX / Interaction

- Simulated depth magnetic “fluxel” grid
- Parallax project carousel
- Layered parallax carousel engine (master/slave synchronization)
- Device mockup overlays with tilt + stabilization states
- Route-driven carousel navigation with deep linking
- Logo/info swapper animations tied to active slide
- Scroll-aware highlighting project list
- Magnetic/sticky road sign
- Draggable + throwable “slinger” orb with simple physics (velocity, damping, wall collision callbacks)
- Page slide-out nav
- Transform-positioned footer
- Custom sprite rendering
- In-view slide-in animation system (IntersectionObserver)
- FLIP-style transform animation for dynamic footer positioning (ResizeObserver + GSAP)

## Rendering / Routing

- SSR/Next portfolio projects list
- SSG/Next dynamic routing projects view
- NDA routes with placeholders + auth-aware upgrade (SSR → CSR hydration)
- Static `/nda?p=slug` query-param entry route (client canonicalization)

## Fluid Responsive System

- Rem-based fluid scaling property mixin
- Static fluid scaling property mixin
- Clamped Linear Interpolation (lerp) fluid responsive type/spacing system (see fluid-responsive-system.md)

## CMS / Data Modeling

- Payload CMS backend
- Type-safe Payload CMS with generated types
- Automatic slug generation and sortable index for projects
- Rich project metadata (brand, tags, role, year, awards, urls)
- Confidential/NDA project filtering
- NDA-aware content sanitization for anonymous users
- Image collections for screenshots/thumbnails/brand logos
- Role-based access control for admin-only mutations

## Media / Storage Pipeline

- Sprite sheet image processing scripts
- Sharp-backed image processing and upload size limits
- Local filesystem storage for local profile
- S3-backed media storage with per-collection prefixes
- Instance-role support with optional static credentials
- Media migration/verification scripts (migrate-to-s3, update media urls, rebuild records)
- Static project file bundles stored in S3 (public + NDA) with app-routed streaming delivery (no presigned URLs)
  - Supports range requests, conditional 304s (ETag/Last-Modified), and public/private cache headers

## API / Security

- Strict env_profile-based config validation (fail-fast on missing)
- GitHub Secrets sync pipeline from JSON5 source files + required-env validation lists
- Locked-down CSRF/CORS allowlists per environment
- Contact API via AWS SES with HTML/Text email and reply-to
- Health-check endpoint(s) for uptime/deploy validation
- NDA project asset route that requires auth and streams from S3 (supports 304 + private caching)

## Observability / Analytics

- AWS CloudWatch RUM integration (production-only + HTTPS-only guardrails)
- CloudWatch Agent for host metrics + log ingestion (nginx + system logs)
- Auto page-view tracking + route-change tracking (App Router)
- Custom event helpers for interactions (clicks, carousel, slinger toss, etc.)
- Minimal Google Analytics 4 integration (optional)

## Infra / Deployment

- Deployment tooling (scripts + optional orchestrator)
- Terraform IaC: one-command provision/teardown of full stack
- Systemd-managed Docker services on EC2 with auto-restart
- Dual-registry image strategy (Docker Hub dev, ECR prod) with switch script
- Secure Docker builds via BuildKit secret mounts + minimal build args
- Generated env files on host via CI/CD (no secrets in repo)
- Reverse proxy options (Caddy or Nginx)
- Profile-driven Docker Compose stacks (local / dev / prod)
- Single-command redeploy scripts for dev/prod or both
- Hardened backend runtime (distroless container + Next.js standalone entrypoint)

## Developer Experience / Testing

- Monorepo with strict TypeScript on frontend and backend
- Unified ESLint configs for frontend/backend
- Playwright e2e and Vitest setup for backend
- Local dev proxy and hot-reload compose profile
- JSON5 package sync system (package.json ↔ package.json5 parity)

## Data Ops / Backups

- JSON dumps for seed data and repeatable imports
- Automated database backup exports (with dated folders)
- NDA media backfill scripts for legacy uploads (Payload + Mongo variants)

## README Priorities

- Layered Parallax Carousel (how master/slave sync works and why it’s unique)
- NDA-aware Content Model (sanitization logic and access control)
- Env-Profile Guardrails (fail-fast config + csrf/cors strategy)
- S3 Media Architecture (prefixes, instance role, migration scripts)
- Dev/Prod Image Strategy (BuildKit secrets, dual registries, systemd on EC2)
- Contact via SES (secure flow, HTML/Text fallback, reply-to behavior)
