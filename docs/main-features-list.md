# Main Features List

Working list of notable features and technical systems

## Frontend UX / Interaction Systems

- Simulated depth magnetic “fluxel” (fluxing pixel) grid with pointer influence
- Fluxel grid projectile collision response
- Fluxel background animations authored in Photoshop and Adobe Animate, then exported as sprite sheets
- Parallax project carousel with layered screenshots composited into physical device mockups
- Layered parallax carousel engine with master/slave synchronization — to become standalone NPM package
- Browser-native carousel swipe/gesture support via horizontal scrolling
- Carousel navigation persisted to browser history with Back/Forward support and shortest-path bidirectional wrap
- Route-driven carousel navigation with deep linking
- Device mockup overlays with tilt and stabilization states
- Custom sprite rendering with renderer strategies (CSS / Canvas / WebGL), swappable via `renderStrategy` - To become standalone NPM package.
- Fullscreen animation sequencer with imperative triggering
- Query-string sprite/sequencer renderer overrides with DPR caps for live performance comparison
- Logo/info swapper animations tied to active slide
- Typewriter-style hero copy rotator (`TypewriterEffect`) with shuffled paragraph typing and pause-aware sequencing
- Scroll-aware nav link highlighting by active section
- Project thumbnail highlighting via hover on mouse-primary desktop and scroll position on coarse-pointer/non-hover devices
- Magnetic/sticky road sign interaction
- Responsive road-sign panels using `border-image` framing with barricade/emergency blinker accents
- Embossed sub-sign with masked animated stripe layers
- Animated barber-pole accent and border effects
- Draggable and throwable “slinger” orb with simple physics (velocity, damping, wall collision callbacks, timed pointer gravity)
- Dynamically triggered onboarding hints/tooltips for orb interaction
- FPS counter/debug overlay with env and query-string toggles
- Layered page slide-out nav
- Dynamic/animated hamburger button
- Transform-positioned footer with animated footer grid
- In-view slide-in animation system using IntersectionObserver
- FLIP-style transform animation for dynamic footer positioning using ResizeObserver + GSAP
- Stable viewport-height handling for mobile browser chrome jitter, overscroll noise, and coarse-pointer route-return layout stability

## Visual Design / Art Direction / Graphics

- Custom project graphics for each portfolio entry, developed through heavy AI-assisted iteration, Photoshop compositing/editing, and art direction
- Fluxel background animations authored in Photoshop and Adobe Animate, then exported as sprite sheets
- Visual direction for portfolio-specific branding, thumbnail treatment, and presentation framing
- Designed and refined motion-heavy UI treatments intended to feel polished, tactile, and visually distinctive rather than template-derived
- Combined AI generation, manual compositing, and iterative design correction to produce custom artwork aligned to each project’s tone and content

## Fluid Responsive System

- Rem-based fluid scaling property mixin using linear interpolation
- Static fluid scaling property mixin using linear interpolation
- Clamped linear interpolation responsive type/spacing system (see `fluid-responsive-system.md`)

## Backend Application Features

### Rendering / Routing

- SSG/ISR (24h) portfolio projects list
- SSG/ISR (24h) dynamic project routes
- SSG/ISR (24h) CV route
- Generated Open Graph / Twitter social share images rendered from a dedicated portfolio preview route with browser capture
- On-demand frontend revalidation endpoint for project/CV/hero/media updates
- Targeted post-revalidation route warming so low-traffic recruiter/employer visits usually hit already-regenerated pages
- SSG/ISR NDA project routes with short-code static params, sanitized placeholders, and auth-aware runtime upgrade (SSR to CSR hydration)
- Post-login redirect back to originally requested NDA content

### CMS / Data Modeling

- Payload CMS backend
- Type-safe Payload CMS with generated types
- Automatic slug generation and sortable index for projects
- Rich project metadata model (brand, tags, role, year, awards, URLs)
- Confidential/NDA project filtering
- NDA-aware content sanitization and server-driven field gating for anonymous users
- CMS-managed hero branding/title variants with active preset selection
- CMS-managed CV experience sections with drag/drop ordering, logo uploads, enabled bullet points, and separate independent R&D / contracting content
- Image collections for screenshots, thumbnails, and brand logos
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
- Media migration/verification scripts (`migrate-to-s3`, update media URLs, rebuild records)
- Revived and redeployed a large set of legacy projects via S3-hosted project bundles (public + private)
  - Supports range requests, conditional 304s (ETag/Last-Modified), and public/private cache headers

### API / Security

- Strict `env_profile`-based config validation with fail-fast behavior on missing requirements
- Locked-down CSRF/CORS allowlists per environment
- Username-or-email authentication flow
- Account lockout after repeated failed logins
- Admin-readable auth audit trail with login events, IP, user-agent, and referrer metadata
- Contact API via AWS SES with HTML/text email and reply-to support
- Contact API rate limiting
- CMS-backed public contact-info API with server-side obfuscation (email and optional phone)
- GraphQL API with GraphQL Playground
- `/.well-known/security.txt` endpoint
- Health-check endpoint(s) for uptime/deploy validation
- Private project asset route requiring auth and streaming from S3 with 304/private caching support
- Frontend security headers and CSP configured in Next.js `headers()`, including `Permissions-Policy`

### Observability / Analytics

- AWS CloudWatch RUM integration with production-only and HTTPS-only guardrails
- CloudWatch Agent for host metrics and log ingestion (nginx + system logs)
- Auto page-view tracking and route-change tracking in the App Router
- Custom event helpers for interactions (clicks, carousel, slinger toss, etc.)
- Minimal Google Analytics 4 integration (optional)

### Data Ops / Backups

- JSON dumps for seed data and repeatable imports
- Automated database backup exports with dated folders
- Private content-root workflow for CV experiences and project descriptions (YAML/HTML import/export with explicit order control)
- NDA media backfill scripts (Payload + Mongo variants)

## Platform / Deployment / Monorepo Tooling

### Infrastructure / Deployment

- Deployment tooling (scripts + optional deployment runner)
- GitHub Secrets sync pipeline from JSON5 source files with required-env validation lists
- Terraform IaC for one-command provision/teardown of the full stack
- Systemd-managed Docker services on EC2 with auto-restart
- Dual-registry image strategy (Docker Hub dev, ECR prod) with switch script
- Secure Docker builds via BuildKit secret mounts and minimal build args
- Generated env files on host via CI/CD (no secrets in repo)
- Reverse proxy options (Caddy or Nginx)
- Profile-driven Docker Compose stacks (local / dev / prod)
- Single-command redeploy scripts for dev/prod or both
- Hardened backend runtime with distroless container and Next.js standalone entrypoint

### Developer Experience / Testing

- Monorepo with strict TypeScript on frontend and backend
- Unified ESLint configs for frontend/backend
- Playwright end-to-end and Vitest setup for backend
- Local dev proxy and hot-reload compose profile
- `sync:branches` automation that synchronizes `dev`/`main`, bumps the canonical root patch version, propagates it to frontend/backend manifests and lockfiles, syncs JSON5 mirrors, and fast-forwards both branches
- Detailed engineering standards, including AI assistant workflow guidance for commits, checks, approvals, and escalation of non-standard patterns
- Extensively commented `package.json5` companion manifests alongside canonical `package.json` files
- Hermetic project-data snapshot pipeline for build-time/static exports
- Guarded dependency update workflow (`update:deps`) with blocked majors, lockstep upgrade families, and manifest/lockfile refresh
- Production-like local performance testing with standalone server builds

## Spun-off Packages

- `json5-manifest-sync`: extracted package for syncing documented `package.json5` companion manifests from canonical `package.json` files

## README Priorities

- Layered Parallax Carousel (how master/slave sync works and why it’s unique)
- NDA-aware Content Model (sanitization logic and access control)
- Env-Profile Guardrails (fail-fast config + CSRF/CORS strategy)
- S3 Media Architecture (prefixes, instance role, migration scripts)
- Dev/Prod Image Strategy (BuildKit secrets, dual registries, systemd on EC2)
- Contact via SES (secure flow, HTML/text fallback, reply-to behavior)
