# Main Features List

Working list of notable features

## Frontend UX / Interaction

- Simulated depth magnetic “fluxel” (fluxing pixel) grid with pointer influence
- Fluxel grid projectile collision response
- Fluxel background animations authored in Photoshop and Adobe Animate, then exported as sprite sheets
- Parallax project carousel
- Layered parallax carousel engine (master/slave synchronization)
- Browser-native carousel swipe/gestures (horizontal scrolling)
- Carousel navigation persists to browser history (Back/Forward) + shortest-path bidirectional wrap
- Device mockup overlays with tilt + stabilization states
- Route-driven carousel navigation with deep linking
- Custom project graphics for each portfolio entry, developed through heavy AI-assisted iteration, Photoshop compositing/editing, and art direction
- Logo/info swapper animations tied to active slide
- Typewriter-style hero copy rotator (`TypewriterEffect`; shuffled paragraph typing, pause-aware)
- Scroll-aware nav link highlighting (active section)
- Project thumbnail highlighting via hover on mouse-primary desktop and scroll position on non-hover/coarse-pointer devices (multi-column rows; left→right on tablet+)
- Magnetic/sticky road sign
- Responsive road-sign panels using `border-image` framing with barricade/emergency blinker accents
- Embossed sub-sign with masked animated stripe layers
- Animated barber-pole accent and border effects
- Draggable + throwable “slinger” orb with simple physics (velocity, damping, wall collision callbacks, timed pointer gravity)
- Dynamically triggered hero onboarding hints/tooltips for orb interaction
- FPS counter/debug overlay with env and query-string toggles
- Layered-depth page slide-out nav
- Dynamic/animated hamburger button
- Transform-positioned footer + animated footer grid
- Custom sprite rendering with renderer strategies (CSS / Canvas / WebGL), swappable via `renderStrategy`
- Fullscreen animation sequencer with imperative triggering
- Query-string sprite/sequencer renderer overrides + DPR caps for live performance comparison
- In-view slide-in animation system (IntersectionObserver)
- FLIP-style transform animation for dynamic footer positioning (ResizeObserver + GSAP)
- Stable viewport height strategy for mobile browser chrome jitter, overscroll noise, and coarse-pointer route-return layout stability

## Fluid Responsive System

- Rem-based (LERP) fluid scaling property mixin
- Static (LERP) fluid scaling property mixin
- Clamped Linear Interpolation (lerp) fluid responsive type/spacing system (see fluid-responsive-system.md)

## Backend Application Features

### Rendering / Routing

- SSG/ISR (24h) portfolio projects list
- SSG/ISR (24h) dynamic project routes
- SSG/ISR (24h) CV route
- On-demand frontend revalidation endpoint for project/CV/hero/media updates
- SSG/ISR NDA project routes with short-code static params, sanitized placeholders, and auth-aware runtime upgrade (SSR → CSR hydration)
- Post-login redirect back to originally requested NDA content

### CMS / Data Modeling

- Payload CMS backend
- Type-safe Payload CMS with generated types
- Automatic slug generation and sortable index for projects
- Rich project metadata (brand, tags, role, year, awards, urls)
- Confidential/NDA project filtering
- NDA-aware content sanitization + server-driven field gating for anonymous users
- CMS-managed hero branding/title variants with active preset selection
- CMS-managed CV experience sections with drag/drop ordering, logo uploads, enabled bullet points, and separate independent R&D / contracting content
- Image collections for screenshots/thumbnails/brand logos
- Role-based access control for admin-only mutations

### Media / Storage Pipeline

- Sprite sheet image processing scripts (exporter work extracted to [BBaysinger/fluxel-animations](https://github.com/BBaysinger/fluxel-animations))
- Sharp-backed image processing and upload size limits
- Media seeding/import pipeline from external seed folders (`media:seed`)
- Image export pipeline to external seed folders/WebP outputs (`media:export`)
- PSD/WebP export script with optional opacity-to-matte flattening for transparent artwork variants
- Local filesystem storage for local profile
- S3-backed media storage with per-collection prefixes
- Instance-role support with optional static credentials
- Media migration/verification scripts (migrate-to-s3, update media urls, rebuild records)
- Static project file bundles stored in S3 (public + private) with app-routed streaming delivery (no presigned URLs)
  - Supports range requests, conditional 304s (ETag/Last-Modified), and public/private cache headers

### API / Security

- Strict env_profile-based config validation (fail-fast on missing)
- Locked-down CSRF/CORS allowlists per environment
- Username-or-email authentication flow
- Account lockout after repeated failed logins
- Admin-readable auth audit trail (login events with IP/user-agent/referrer metadata)
- Contact API via AWS SES with HTML/Text email and reply-to
- Contact API rate limiting
- CMS-backed public contact-info API with server-side obfuscation (email + optional phone)
- GraphQL API + GraphQL Playground
- `/.well-known/security.txt` endpoint
- Health-check endpoint(s) for uptime/deploy validation
- Private project asset route that requires auth and streams from S3 (supports 304 + private caching)
- Frontend security headers + CSP configured in Next.js (`headers()`), including `Permissions-Policy`

### Observability / Analytics

- AWS CloudWatch RUM integration (production-only + HTTPS-only guardrails)
- CloudWatch Agent for host metrics + log ingestion (nginx + system logs)
- Auto page-view tracking + route-change tracking (App Router)
- Custom event helpers for interactions (clicks, carousel, slinger toss, etc.)
- Minimal Google Analytics 4 integration (optional)

### Data Ops / Backups

- JSON dumps for seed data and repeatable imports
- Automated database backup exports (with dated folders)
- Private content-root workflow for CV experiences and project descriptions (YAML/HTML import/export with explicit order control)
- NDA media backfill scripts (Payload + Mongo variants)

## Platform / Deployment & Monorepo Tooling

### Infra / Deployment

- Deployment tooling (scripts + optional deployment runner)
- GitHub Secrets sync pipeline from JSON5 source files + required-env validation lists
- Terraform IaC: one-command provision/teardown of full stack
- Systemd-managed Docker services on EC2 with auto-restart
- Dual-registry image strategy (Docker Hub dev, ECR prod) with switch script
- Secure Docker builds via BuildKit secret mounts + minimal build args
- Generated env files on host via CI/CD (no secrets in repo)
- Reverse proxy options (Caddy or Nginx)
- Profile-driven Docker Compose stacks (local / dev / prod)
- Single-command redeploy scripts for dev/prod or both
- Hardened backend runtime (distroless container + Next.js standalone entrypoint)

### Developer Experience / Testing

- Monorepo with strict TypeScript on frontend and backend
- Unified ESLint configs for frontend/backend
- Playwright e2e and Vitest setup for backend
- Local dev proxy and hot-reload compose profile
- Detailed engineering standards, including AI assistant workflow guidance for commits, checks, approvals, and escalation of non-standard patterns
- Extensively commented `package.json5` companion manifests alongside canonical `package.json` files
- Hermetic project-data snapshot pipeline for build-time/static exports
- Guarded dependency update workflow (`update:deps`) with blocked majors, lockstep upgrade families, and manifest/lockfile refresh
- Production-like local perf testing with standalone server builds

## Spun-off Packages

- `json5-manifest-sync`: extracted package for syncing documented `package.json5` companion manifests from canonical `package.json` files

## README Priorities

- Layered Parallax Carousel (how master/slave sync works and why it’s unique)
- NDA-aware Content Model (sanitization logic and access control)
- Env-Profile Guardrails (fail-fast config + csrf/cors strategy)
- S3 Media Architecture (prefixes, instance role, migration scripts)
- Dev/Prod Image Strategy (BuildKit secrets, dual registries, systemd on EC2)
- Contact via SES (secure flow, HTML/Text fallback, reply-to behavior)
