# Interactive Portfolio System with CMS and Extensive Deployment Tooling

Custom UI systems, content modeling, media pipelines, and production deployment infrastructure for a long-running portfolio/cv project.

This repo contains the interactive frontend, the Payload-backed content layer behind it, and the tooling used to build, deploy, and operate the whole project.  
It is built with **React**, **TypeScript**, and the **Next.js App Router**, with a **Payload CMS backend**, **MongoDB**, and **Terraform-managed AWS infrastructure**.

Core interface systems include a **parallax-layered carousel**, a **multi-renderer sprite engine**, and an experimental **'Fluxel'** (fluxing pixel) grid that reacts to physics projectile collisions. Every motion and frame transition is built natively, without external 3D, physics, or sprite libraries.  
Around that UI layer is the rest of the supporting work: content modeling, media and project-file pipelines, auth-aware NDA delivery, CI/CD, secrets automation, and multi-environment deployment and operations.

The result is a production portfolio system that combines interactive frontend work, structured content workflows, deployment automation, and reusable architecture patterns.

> **Repository note:** This repo includes both the portfolio system and its deployment/CI/CD tooling. Reusable pieces are kept modular so they can be extracted into separate packages or repos over time. The current AWS setup is intentionally cost-constrained: `dev` and `prod` share a single EC2 host, with local and dev environments covering iteration before production release.

Live deployment: [bbaysinger.io](https://bbaysinger.io?r=gh_readme).

---

## 🚩 At a glance (what this repo includes)

This repo is an end‑to‑end system, not just a site.

Use this section for a quick mental model of the repo. The [30‑Second Tour](#thirty-second-tour) is the faster code-entry guide.

- **Interactive UI systems:** custom interaction/animation systems built directly on the browser platform (no external 3D/physics/sprite runtime)
- **Content + delivery system:** Payload CMS + media/static asset pipelines designed for both public and private/NDA-included content
- **Production ops:** Docker + Terraform + environment/secrets automation + reverse proxy options + observability (CloudWatch RUM, optional GA4)

<a id="feature-index"></a>

## 🧭 Feature Index (Frontend + Backend)

Suggested read order:

- [30‑Second Tour](#thirty-second-tour) (curated code entrypoints + why they matter)
- Full lists (reference index):
  - [Frontend features (full list)](#frontend-features)
  - [Backend / content system features (full list)](#backend-platform-features)

<a id="thirty-second-tour"></a>

### 🔎 30‑Second Tour (curated entrypoints)

This is a guided "start here" path, not a second feature list. It points to the main code entrypoints and explains why they matter.

| What to Look At                                                      | Why It Matters                                                                                                              | Code Entry                                                                                      |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Layered Parallax Project Carousel                                    | Native horizontal scrolling + inertia (gesture + accessibility friendly), bi‑directional wrap, master/slave parallax layers | `frontend/src/components/project-carousel-page/` (`Carousel.tsx`, `LayeredCarouselManager.tsx`) |
| Fluxel Grid (interactive fluxing pixels)                             | Pluggable grid render, pointer + projectile influence, shadow system                                                        | `frontend/src/components/home-page/header-main/fluxel-grid/`                                    |
| Sprite Sheet Player (CSS/Canvas/WebGL)                               | Auto metadata parsing, per‑frame FPS arrays, renderer strategy swappable via `renderStrategy`                               | `frontend/src/components/common/sprite-rendering/`                                              |
| Kinetic Orb Physics Box                                              | Throwables with pointer gravity & orbital damping, idle detection hooks                                                     | `frontend/src/components/home-page/header-main/SlingerBox.tsx`                                  |
| Clamped Linear Interpolation (LERP) Fluid Responsive System (mixins) | Pixel‑precise CSS interpolation utilities for fluid responsive layout                                                       | `frontend/src/styles/_mixins.scss`                                                              |
| Route‑Synced Carousel + Deep Linking                                 | Scroll inertia stabilization gates route updates                                                                            | `ProjectView.tsx`, `LayeredCarouselManager.tsx`                                                 |
| Device Mockup Layer Coordination                                     | Independent layer scroll multipliers + content swapping                                                                     | `ProjectCarouselView.*`                                                                         |

Live site reference moments:

1. Project carousel: swipe quickly—note parallax & stable index snapping after inertia.
2. Homepage hero: drag the orb → fluxel shadows & subtle projectile effects (if enabled).
3. Sprite sequences (lightning / energy bars): watch frame pacing consistency across strategies.

---

<a id="frontend-features"></a>

### 🎨 Frontend features (full list)

#### 🧲 Physics + custom rendering

- [Simulated depth magnetic “fluxel” grid with pointer influence](#frontend-fluxel-grid)
- [Fluxel grid projectile collision response](#frontend-fluxel-grid)
- [Fluxel background animations authored in Photoshop and Adobe Animate, then exported as sprite sheets](#frontend-fluxel-grid)
- [Draggable + throwable “slinger” orb with simple physics (velocity, damping, wall collision callbacks, timed pointer gravity)](#frontend-kinetic-orb-physics-box)

#### 🌀 Carousel + routing

- [Parallax project carousel (layered master/slave engine + synchronized parallax)](#frontend-layered-parallax-carousel)
- [Browser-native carousel swipe/gestures (horizontal scrolling)](#frontend-layered-parallax-carousel)
- [Carousel navigation persists to browser history (Back/Forward) + shortest-path bidirectional wrap](#frontend-route-synced-carousel)
- [Route-driven carousel navigation with deep linking](#frontend-route-synced-carousel)
- [Device mockup overlays with tilt + stabilization states](#frontend-device-mockup-overlays)

#### 🎞️ Sprite rendering

- [Custom sprite rendering with renderer strategies (CSS / Canvas / WebGL), swappable via `renderStrategy`](#frontend-sprite-sheet-player)
- [Fullscreen animation sequencer with imperative triggering](#frontend-sprite-sheet-player)
- [Query-string sprite/sequencer renderer overrides + DPR caps for live performance comparison](#frontend-sprite-sheet-player)

#### 🧩 Other UI systems

- [Custom project graphics for each portfolio entry, developed through concept iteration, Photoshop compositing/editing, and art direction](#frontend-other-ui-systems)
- [Logo/info swapper animations tied to active slide](#frontend-other-ui-systems)
- [Typewriter-style hero copy rotator (`TypewriterEffect`; shuffled paragraph typing, pause-aware)](#frontend-other-ui-systems)
- [Scroll-aware nav link highlighting (active section)](#frontend-other-ui-systems)
- [Project thumbnail highlighting via hover on mouse-primary desktop and scroll position on non-hover/coarse-pointer devices (multi-column rows; left→right on tablet+)](#frontend-other-ui-systems)
- [Magnetic/sticky road sign](#frontend-other-ui-systems)
- [Responsive road-sign panels using `border-image` framing with barricade/emergency blinker accents](#frontend-other-ui-systems)
- [Embossed sub-sign with masked animated stripe layers](#frontend-other-ui-systems)
- [Animated barber-pole accent and border effects](#frontend-other-ui-systems)
- [Dynamically triggered hero onboarding hints/tooltips for orb interaction](#frontend-other-ui-systems)
- [Layered-depth page slide-out nav](#frontend-other-ui-systems)
- [FPS counter/debug overlay with env and query-string toggles](#frontend-other-ui-systems)
- [Dynamic/animated hamburger button](#frontend-other-ui-systems)
- [Transform-positioned footer + animated footer grid](#frontend-footer-systems)
- [In-view slide-in animation system (IntersectionObserver)](#frontend-other-ui-systems)
- [FLIP-style transform animation for dynamic footer positioning (ResizeObserver + GSAP)](#frontend-footer-systems)
- [Stable viewport height strategy for mobile browser chrome jitter, overscroll noise, and coarse-pointer route-return layout stability](#frontend-other-ui-systems)

#### 📐 Fluid responsive system

- [Rem-based (LERP) fluid scaling property mixin](#frontend-fluid-responsive-system)
- [Static (LERP) fluid scaling property mixin](#frontend-fluid-responsive-system)
- [Clamped Linear Interpolation (LERP) fluid responsive type/spacing system](#frontend-fluid-responsive-system)

<a id="backend-platform-features"></a>

### 🧱 Backend / content system features (full list)

#### 🧭 Rendering / routing

- [SSG/ISR (24h) portfolio projects list](#backend-rendering-routing)
- [SSG/ISR (24h) dynamic project routes](#backend-rendering-routing)
- [SSG/ISR (24h) CV route](#backend-rendering-routing)
- [Dual snapshot-backed frontend build inputs carried through GitHub environment secrets and BuildKit secret mounts (project data + static CMS content)](#backend-rendering-routing)
- [Static-content snapshot pipeline for hermetic build-time branding, greeting, and CV content](#backend-rendering-routing)
- [Snapshot envelope validation guards for project-data and static-content CI/build inputs](#backend-rendering-routing)
- [Static Open Graph / Twitter social share image generated manually and served as a frontend asset](#backend-rendering-routing)
- [On-demand frontend revalidation endpoint for project/CV/hero/media updates](#backend-rendering-routing)
- [Targeted post-revalidation route warming so low-traffic recruiter/employer visits usually hit already-regenerated pages](#backend-rendering-routing)
- [SSG/ISR NDA project routes with short-code static params, sanitized placeholders, and auth-aware runtime upgrade (SSR → CSR hydration)](#backend-rendering-routing)
- [Post-login redirect back to originally requested NDA content](#backend-rendering-routing)

#### 📝 CMS / data modeling

- [Payload CMS backend](#backend-cms-data-modeling)
- [Type-safe Payload CMS with generated types](#backend-cms-data-modeling)
- [Automatic slug generation and sortable index for projects](#backend-cms-data-modeling)
- [Rich project metadata (brand, tags, role, year, awards, urls)](#backend-cms-data-modeling)
- [Confidential/NDA project filtering](#backend-cms-data-modeling)
- [NDA-aware content sanitization + server-driven field gating for anonymous users](#backend-cms-data-modeling)
- [CMS-managed hero branding/title variants with active preset selection](#backend-cms-data-modeling)
- [CMS-managed CV experience sections with drag/drop ordering, logo uploads, enabled bullet points, and separate independent R&D / contracting content](#backend-cms-data-modeling)
- [Image collections for screenshots/thumbnails/brand logos](#backend-cms-data-modeling)
- [Role-based access control for admin-only mutations](#backend-cms-data-modeling)

#### 🪣 Media / storage

- [Sprite sheet image processing scripts (exporter extracted to `BBaysinger/fluxel-animations`)](#backend-media-storage)
- [Sharp-backed image processing and upload size limits](#backend-media-storage)
- [Media hydration/import pipeline from external snapshot roots (`media:seed`)](#backend-media-storage)
- [Image export pipeline to external seed folders/WebP outputs (`media:export`)](#backend-media-storage)
- [PSD/WebP export script with optional opacity-to-matte flattening for transparent artwork variants](#backend-media-storage)
- [Local filesystem storage for local profile](#backend-media-storage)
- [S3-backed media storage with per-collection prefixes](#backend-media-storage)
- [Instance-role support with optional static credentials](#backend-media-storage)
- [Media migration/verification scripts (migrate-to-s3, update media urls, rebuild records)](#backend-media-storage)
- [Static project file bundles stored in S3 (public + private) with app-routed streaming delivery (no presigned URLs)](#backend-media-storage)

#### 🔐 API / security

- [Strict env_profile-based config validation (fail-fast on missing)](#backend-api-security)
- [Locked-down CSRF/CORS allowlists per environment](#backend-api-security)
- [Username-or-email authentication flow](#backend-api-security)
- [Account lockout after repeated failed logins](#backend-api-security)
- [Admin-readable auth audit trail (login events with IP/user-agent/referrer metadata)](#backend-api-security)
- [Contact API via AWS SES with HTML/Text email and reply-to](#backend-api-security)
- [Contact API rate limiting](#backend-api-security)
- [CMS-backed public contact-info API with server-side obfuscation (email + optional phone)](#backend-api-security)
- [GraphQL API + GraphQL Playground](#backend-api-security)
- [`/.well-known/security.txt` endpoint](#backend-api-security)
- [Health-check endpoint(s) for uptime/deploy validation](#backend-api-security)
- [Private project asset route that requires auth and streams from S3 (supports 304 + private caching)](#backend-api-security)
- [Frontend security headers + CSP configured in Next.js (`headers()`), including `Permissions-Policy`](#backend-api-security)

#### 📈 Observability / analytics

- [AWS CloudWatch RUM integration (production-only + HTTPS-only guardrails)](#backend-observability)
- [Version-aware CloudWatch RUM tagging using the synced frontend package version as the app version and session attribute context](#backend-observability)
- [CloudWatch Agent for host metrics + log ingestion (nginx + system logs)](#backend-observability)
- [Auto page-view tracking + route-change tracking (App Router)](#backend-observability)
- [Custom event helpers for interactions (clicks, carousel, slinger toss, etc.)](#backend-observability)
- [Minimal Google Analytics 4 integration (optional)](#backend-observability)

### 🧰 Platform / deployment & monorepo tooling

#### 🏗️ Infra / deployment

- [Deployment tooling (scripts + optional deployment runner)](#backend-infra-deployment)
- [GitHub Secrets sync pipeline from JSON5 source files + required-env validation lists](#backend-infra-deployment)
- [Terraform IaC: one-command provision/teardown of full stack](#backend-infra-deployment)
- [Systemd-managed Docker services on EC2 with auto-restart](#backend-infra-deployment)
- [Dual-registry image strategy (Docker Hub dev, ECR prod) with switch script](#backend-infra-deployment)
- [Secure Docker builds via BuildKit secret mounts + minimal build args](#backend-infra-deployment)
- [Generated env files on host via CI/CD (no secrets in repo)](#backend-infra-deployment)
- [Reverse proxy options (Caddy or Nginx)](#backend-infra-deployment)
- [Profile-driven Docker Compose stacks (local / dev / prod)](#backend-infra-deployment)
- [Single-command redeploy scripts for dev/prod or both](#backend-infra-deployment)
- [Reusable redeploy workflow with post-restart container readiness polling and HTTP health gates for dev/prod before deployment is treated as successful](#backend-infra-deployment)
- [Hardened backend runtime (distroless container + Next.js standalone entrypoint)](#backend-infra-deployment)
- [Deploy-enforced HTTPS renewal hardening plus host-level certificate health monitoring with systemd timers, journal visibility, and SES recovery/failure email notifications](#backend-infra-deployment)

#### 🧪 DX / testing

- [Monorepo with strict TypeScript on frontend and backend](#backend-dx-testing)
- [Unified ESLint configs for frontend/backend](#backend-dx-testing)
- [`shfmt`-based shell formatting integrated into repo formatting/precommit workflows, with explicit exclusions for non-Bash scripts](#backend-dx-testing)
- [Playwright e2e and Vitest setup for backend](#backend-dx-testing)
- [Local dev proxy and hot-reload compose profile](#backend-dx-testing)
- [`release:promote` automation with staged promotion flow: synchronize `dev`/`main`, deploy current `dev`, wait for successful CI/CD, bump and propagate the canonical root patch version, deploy `main`, then fast-forward `dev` back to the released `main` commit while CI skips the redundant final dev rerun when both branches match (plus a legacy deploy-all override)](#backend-dx-testing)
- [Extensively commented `package.json5` companion manifests alongside canonical `package.json` files](#backend-dx-testing)
- [Hermetic project-data snapshot pipeline for build-time/static exports](#backend-dx-testing)
- [Guarded dependency update workflow (`update:deps`) with blocked majors, lockstep upgrade families, and manifest/lockfile refresh](#backend-dx-testing)
- [Production-like local perf testing with standalone server builds](#backend-dx-testing)

#### 📦 Spun-off packages

- [json5-manifest-sync package (extracted from this project)](#spun-off-packages)

#### 💾 Data ops / backups

- [JSON dumps for seed data and repeatable imports](#backend-data-ops)
- [Automated database backup exports (with dated folders)](#backend-data-ops)
- [Private content-root workflow for selected Payload-managed content using version-friendly YAML exports/imports](#backend-data-ops)
- [NDA media backfill scripts (Payload + Mongo variants)](#backend-data-ops)

Shorter read: [Flat features list](./docs/flat-features-list.md).

[Visit the Live Site](https://bbaysinger.io?r=gh_readme) (deployment-dependent; see `deploy/DEPLOYMENT.md`).

Next up:

- Frontend deep dives: start at [Frontend UX & Interaction](#frontend-ux-interaction)
- Backend/content-system deep dives: continue to [Backend / Content Systems](#backend-platform-systems)
- Convenience scripts: [Deployment conveniences catalog](#-deployment-conveniences-catalog)
- Optional single deployment entrypoint: [docs/deployment-runner.md](./docs/deployment-runner.md)

---

<a id="backend-platform-systems"></a>

## 🧱 Backend / Content Systems

This section backs the backend/content-system links in the [Feature Index](#feature-index). It stays intentionally “flat” (bullet-first) so it’s easy to skim.

<a id="backend-rendering-routing"></a>

### 🧭 Rendering / Routing

- SSG/ISR (24h) portfolio projects list
- SSG/ISR (24h) dynamic project routes (`/project/[projectId]`, `/nda-included/[projectId]`)
- SSG/ISR (24h) query entry routes (`/project`, `/nda-included`)
- SSG/ISR (24h) CV route (`/cv`)
- Static Open Graph / Twitter social share image generated manually and served as a frontend asset
- On-demand revalidation endpoint (`/api/revalidate/projects`) triggered by CMS updates for projects and CV
- Targeted post-revalidation route warming so low-traffic recruiter/employer visits usually hit already-regenerated pages
- SSG/ISR NDA project routes with short-code static params, sanitized placeholders, and auth-aware runtime upgrade (SSR → CSR hydration)
- Post-login redirect back to originally requested NDA content

<a id="backend-cms-data-modeling"></a>

### 📝 CMS / Data Modeling

- Payload CMS backend
- Type-safe Payload CMS with generated types
- Automatic slug generation and sortable index for projects
- Rich project metadata (brand, tags, role, year, awards, urls)
- Confidential/NDA project filtering
- NDA-aware content sanitization for anonymous users
- CMS-managed hero branding/title variants with active preset selection
- CMS-managed CV experience sections with drag/drop ordering, logo uploads, enabled bullet points, and separate independent R&D / contracting content
- Image collections for screenshots/thumbnails/brand logos
- Role-based access control for admin-only mutations

<a id="backend-media-storage"></a>

### 🪣 Media / Storage Pipeline

- Sprite sheet image processing scripts (exporter work extracted to [BBaysinger/fluxel-animations](https://github.com/BBaysinger/fluxel-animations))
- Sharp-backed image processing and upload size limits
- Media hydration/import pipeline from external snapshot roots (`media:seed`)
- Image export pipeline to external seed folders/WebP outputs (`media:export`)
- PSD/WebP export script with optional opacity-to-matte flattening for transparent artwork variants
- Local filesystem storage for local profile
- S3-backed media storage with per-collection prefixes
- Instance-role support with optional static credentials
- Media migration/verification scripts (migrate-to-s3, update media urls, rebuild records)
- Static project file bundles stored in S3 (public + private) with app-routed streaming delivery (no presigned URLs)
  - Supports range requests, conditional 304s (ETag/Last-Modified), and public/private cache headers

<a id="backend-api-security"></a>

### 🔐 API / Security

- Strict env_profile-based config validation (fail-fast on missing)
- Locked-down CSRF/CORS allowlists per environment
- Username-or-email authentication flow
- Account lockout after repeated failed logins
- Admin-readable auth audit trail (login events with IP/user-agent/referrer metadata)
- Contact API via AWS SES with HTML/Text email and reply-to
- Contact API rate limiting
- CMS-backed public contact-info API with server-side obfuscation (email + optional phone)
- GraphQL API + GraphQL Playground
- `/.well-known/security.txt` endpoint (pulls obfuscated contact email via backend proxy)
- Health-check endpoint(s) for uptime/deploy validation
- Private project asset route that requires auth and streams from S3 (supports 304 + private caching)
- Frontend security headers + CSP configured in Next.js (`headers()`), including `Permissions-Policy`

<a id="backend-observability"></a>

### 📈 Observability / Analytics

- AWS CloudWatch RUM integration (production-only + HTTPS-only guardrails)
- Version-aware CloudWatch RUM tagging using the synced frontend package version as the app version and session attribute context
- CloudWatch Agent for host metrics + log ingestion (nginx + system logs)
- Auto page-view tracking + route-change tracking (App Router)
- Custom event helpers for interactions (clicks, carousel, slinger toss, etc.)
- Minimal Google Analytics 4 integration (optional)

<a id="backend-infra-deployment"></a>

### 🏗️ Infra / Deployment

- Deployment tooling (scripts + optional deployment runner)
- GitHub Secrets sync pipeline from JSON5 source files + required-env validation lists
- Dual snapshot-backed frontend build inputs carried through GitHub environment secrets + BuildKit secret mounts (project data + static CMS content)
- Static-content snapshot pipeline for hermetic build-time branding, greeting, and CV content
- Snapshot envelope validation guards for project-data and static-content CI/build inputs
- Terraform IaC: one-command provision/teardown of full stack
- Systemd-managed Docker services on EC2 with auto-restart
- Dual-registry image strategy (Docker Hub dev, ECR prod) with switch script
- Secure Docker builds via BuildKit secret mounts + minimal build args
- Generated env files on host via CI/CD (no secrets in repo)
- Reverse proxy options (Caddy or Nginx)
- Profile-driven Docker Compose stacks (local / dev / prod)
- Single-command redeploy scripts for dev/prod or both
- Reusable redeploy workflow with post-restart container readiness polling and HTTP health gates for dev/prod before deployment is treated as successful
- Hardened backend runtime (distroless container + Next.js standalone entrypoint)
- Deploy-enforced HTTPS renewal hardening plus host-level certificate health monitoring with systemd timers, journal visibility, and SES recovery/failure email notifications

<a id="backend-dx-testing"></a>

### 🧪 Developer Experience / Testing

- Monorepo with strict TypeScript on frontend and backend
- Unified ESLint configs for frontend/backend
- `shfmt`-based shell formatting integrated into repo formatting/precommit workflows, with explicit exclusions for non-Bash scripts
- Playwright e2e and Vitest setup for backend
- Local dev proxy and hot-reload compose profile
- `release:promote` automation with staged promotion flow: synchronize `dev`/`main`, deploy current `dev`, wait for successful CI/CD, bump and propagate the canonical root patch version, deploy `main`, then fast-forward `dev` back to the released `main` commit while CI skips the redundant final dev rerun when both branches match (plus a legacy deploy-all override)
- Hermetic project-data snapshot pipeline for build-time/static exports
- Build-safe SSG policy that relaxes project route enumeration separately from authoritative static-content requirements, avoiding silent fallback content during prerender
- Guarded dependency update workflow (`update:deps`) with blocked majors, lockstep upgrade families, and manifest/lockfile refresh
- Production-like local perf testing with standalone server builds
- Extensively commented `package.json5` companion manifests alongside canonical `package.json` files

<a id="spun-off-packages"></a>

### 📦 Spun-off Packages

- `json5-manifest-sync` - Extracted package for syncing documented `package.json5` companion manifests from canonical `package.json` files

<a id="backend-data-ops"></a>

### 💾 Data Ops / Backups

- JSON dumps for seed data and repeatable imports
- Automated database backup exports (with dated folders)
- Private content-root workflow for selected Payload-managed content using version-friendly YAML exports/imports
  - Current authored-data scope: CV experiences, project descriptions, and hero/greeting branding content
  - Project descriptions and greeting paragraphs are stored as app-wrapped paragraph arrays with markdown-like inline syntax (`**bold**`, `*emphasis*`, `[label](url)`, optional `{target=...}`), which keeps diffs much cleaner than embedded HTML blobs
  - CV ordering remains explicit through `cv-experiences/order.yaml`, so inclusion and order are controlled intentionally rather than by broad file discovery
- NDA media backfill scripts (Payload + Mongo variants)

## 🧰 Deployment conveniences catalog

All root `npm` scripts are grouped below by intent. Most have dry‑run or detached variants; destructive operations are guarded. For full details and edge‑case flags see [`deploy/DEPLOYMENT.md`](./deploy/DEPLOYMENT.md).

### Local development modes

- `dev` / `dev:all` — Run backend + frontend on your machine
- `dev:backend` / `dev:frontend` — Single service on your machine
- `dev:tabs` — macOS: separate Terminal tabs
- `docker:build` — Build dev images (compose local profile)
- `docker:up` / `docker:up:detached` — Start SSR dev stack
- `docker:up:no-strict` / `docker:up:no-strict:detached` — SSR stack w/o React Strict Mode
- `docker:down` / `docker:logs` — Stop / tail stack

### Production‑style local (SSG)

- `docker:ssg:build` — Build SSG profile images
- `docker:ssg:up` / `docker:ssg:up:detached` — Run SSG profile
- `docker:ssg:up:no-strict` / `docker:ssg:up:no-strict:detached` — SSG without Strict Mode
- `docker:ssg:down` / `docker:ssg:logs` — Stop / tail SSG profile

### Reverse proxy & single URL

- `caddy:up` / `caddy:up:no-strict` — Proxy + dev stack at http://localhost:8080
- `caddy:down` / `caddy:down:force` — Stop / force remove containers
- `caddy:logs` / `caddy:restart` — Tail / recreate proxy
- `caddy:config:validate` / `caddy:config:reload` / `caddy:config:apply` — Safe config workflow
- `caddy:status` — Table of running containers
- `frontend:purge` — Remove `.next` inside running container
- `frontend:rebuild:ssg` — Rebuild SSG images
- `frontend:restart` — Restart only frontend container

### Image build & publishing

- `docker:build:backend` / `docker:build:frontend` — Build dev images
- `docker:push:backend` / `docker:push:frontend` — Push to Docker Hub
- `images:publish:dev` — Scripted build + push both dev images
- `ecr:build:push` — Build + push prod images to ECR

Note: The dev image build scripts use Docker BuildKit secrets (not `--build-arg`) for build-time config. For local builds, you must have the required env vars present in your shell; the scripts will fail fast if anything is missing.

Note: By default, the deployment runner builds and pushes both frontend and backend images (prod → ECR, dev → Docker Hub) to ensure consistency. Add `--no-build` to skip rebuilding and pull the latest tags instead.

### Registry hygiene & verification

- `images:cleanup` / `images:cleanup:dry-run` — Prune old images (retain 3)
- `images:cleanup:ecr` / `images:cleanup:ecr:dry-run` — ECR only
- `images:cleanup:login` — Cleanup with AWS auth
- `images:verify` / `images:verify:login` — Show tag counts

### Secrets & environment sync

- `sync:secrets:dry` / `sync:secrets` — Sync GitHub secrets from JSON5 source
- `infra:sync-env` / `infra:sync-env:force` — Populate local `.env` from Terraform state
- `sync:json5` — Regenerate commented `package.json5` from canonical `package.json`
- `release:promote` — Sync `dev`/`main`, deploy `dev`, then bump/promote to `main`; use `--deploy-all` for the legacy deploy-both flow

### Media pipeline (patterns)

| Pattern                          | Example                      | Purpose                                             |
| -------------------------------- | ---------------------------- | --------------------------------------------------- |
| `media:upload`                   | `media:upload -- --env prod` | Canonical upload entrypoint with explicit flags     |
| `media:upload:<env>`             | `media:upload:prod`          | Upload processed media assets to the profile bucket |
| `media:verify`                   | `media:verify`               | Validate expected objects exist (counts, prefixes)  |
| `migrate:media-urls:<env>[:dry]` | `migrate:media-urls:dev:dry` | Rewrite DB media URLs to S3 public paths            |
| `migrate:all:<env>[:dry]`        | `migrate:all:prod`           | Upload then rewrite URLs in one step                |
| `media:seed` / `media:export`    | `media:seed`                 | Local import / external generation helpers          |

Envs: `dev`, `prod`, `both`. Use `:dry` to preview URL rewrites.

`media:seed` defaults to sibling `../cms-media-seedings`. Set `CMS_SNAPSHOT_ROOT` when your canonical versioned CMS state lives somewhere else, such as `../cms-snapshots/<target>`. Keep `PORTFOLIO_CONTENT_DIR` reserved for authored content imports/exports.
In this repo, "seeding" means hydrating local `backend/media` from the external snapshot root. Local `backend/media` is runtime state for local dev; the snapshot root is the versionable filesystem representation of CMS state.

For operator-facing content syncs, distinguish the two workflows clearly:

- `content:migrate` performs a full CMS database migration between environments and stages/applies the supported media collections as part of the same run.
- `content:migrate:local-to-dev:refresh-snapshots` runs local -> dev migration, regenerates both frontend snapshot secret payloads from the dev environment, then syncs only repo + dev GitHub secrets.
- `content:migrate:local-to-prod:refresh-snapshots` runs local -> prod migration, regenerates both frontend snapshot secret payloads from the prod environment, then syncs only repo + prod GitHub secrets.
- `content:apply-authored:*:content-dir` is the preferred root command family when you mean authored-content apply/import from `PORTFOLIO_CONTENT_DIR`.
- `content:pull:*` and `content:import:*` remain authored-content workflows rooted at `PORTFOLIO_CONTENT_DIR`; they do not define what `content:migrate` will carry.
- For `content:migrate -- --source local`, local `backend/media` is authoritative. If the resolved snapshot root exists and overlapping files diverge, migrate stops so snapshot-root assets and local runtime media can be reconciled intentionally.
- `pull-local` may export into the canonical configured `PORTFOLIO_CONTENT_DIR`. `pull-dev` and `pull-prod` require an explicit `PORTFOLIO_CONTENT_DIR` override and refuse to overwrite that canonical local snapshot directory.
- The snapshot-refresh wrappers infer the target backend base from local GitHub secret manifests when possible. Override with `TARGET_BACKEND_BASE=https://...` if the default target URL is not reachable from your machine.
- See [docs/private-content-workflow.md](docs/private-content-workflow.md) for the full content workflow runbook and safety rules.

Example `.env.local`:

```env
PORTFOLIO_CONTENT_DIR=../cms-content-variants/example-cms-content-variant
```

Safety note: uploads that target `prod` or `both` now require an explicit confirmation token in interactive runs. For non-interactive automation, pass `--yes` intentionally.

### Project files (public & NDA) patterns

| Pattern                   | Example                           | Purpose                                                 |
| ------------------------- | --------------------------------- | ------------------------------------------------------- |
| `projects:upload`         | `projects:upload -- --env public` | Canonical project upload entrypoint with explicit flags |
| `projects:upload:<scope>` | `projects:upload:public`          | Upload project site bundles (public or nda)             |
| `projects:verify`         | `projects:verify`                 | Check existence & basic integrity of uploaded bundles   |

Scopes: `public`, `nda`, `both`.

### Database operations (families)

| Family                            | Example                  | Notes                                             |
| --------------------------------- | ------------------------ | ------------------------------------------------- |
| `db:migrate:<source>-to-<target>` | `db:migrate:prod-to-dev` | Convenience scripts that target prod were removed |

Related operator workflow:

- `content:migrate -- --source <env> --target <env>` uses the database migration path for CMS data and pairs it with staged media sync plus route revalidation.
- Use the explicit `db:migrate:*` commands for direct database-only operations; use `content:migrate` when the site state needs CMS data, media, and revalidation to move together.

Envs: `local`, `dev`, `prod`.

### Deployment & config

- `deploy` — Full deployment-runner redeploy (builds images, deploys both profiles, refreshes env files)
- Nginx config sync is automated during deployment automation and service restarts; no manual step required

Note: `deploy` runs the deployment runner script: `bash deploy/scripts/deployment-runner.sh --profiles both --refresh-env`

### Quality & DX

- `format` / `format:shell` / `lint` / `precommit` — Code style, shell formatting, static analysis, and type checks
- `test` / `prepush` — Root frontend Vitest run, or the full pre-push path (`precommit` + root test command)
- `update:deps` / `update:deps:dry` / `update:deps:raw` — Guarded dependency refresh, dry-run preview, or raw unrestricted `ncu`
- `install:all` — Install root, backend, and frontend dependencies in parallel

Dependency maintenance:

- Start with `npm run update:deps:dry` to review routine upgrades across root, backend, and frontend without changing manifests.
- Use `npm run update:deps` for normal dependency refreshes. It applies the repo guardrails, installs per package root, refreshes lockfiles, and finishes by syncing `package.json5` comments.
- Reserve `npm run update:deps:raw` for intentional investigation only; it bypasses the repo guardrails and can propose version combinations this repo does not support.
- Run dependency refreshes on a regular cadence, such as weekly or before a release cut, instead of batching many months of changes together.
- After applying updates, run the normal validation path for this repo before merging: `npm run precommit` and any behavior checks needed for the changed area.

Notes:

- Dry runs prevent unintended destructive actions (`:dry` suffix or dedicated script variant).
- `update:deps` leaves `sync:json5` as the last successful step, including when no allowed dependency updates are found.
- Secrets never enter the repo or images; all injected at deploy time via deployment-runner env regeneration.
- Use proxy mode for production‑parity hostnames and relative API paths.

---

<a id="frontend-ux-interaction"></a>

## 🎨 Frontend UX & Interaction

Rather than a handful of flashy widgets, the UI layer is a set of small, renderer‑aware systems built for smoothness, frame accuracy, and portability. Key subsystems:

<a id="frontend-fluxel-grid"></a>

### Fluxel Grid System

An experimental, dynamic pixel grid ("fluxels") rendered via a pluggable strategy (current: Canvas; exploratory: SVG & shader/WebGL). Each fluxel cell stores lightweight `FluxelData` including color variation; the grid computes a pixel‑precise cell size at runtime (`FluxelCanvasGrid`) and exposes an imperative handle (`FluxelGridHandle`) for:

The background animation assets used with the fluxel system were authored in Photoshop and Adobe Animate, then exported into sprite-sheet form for runtime playback.

- Lookup by pixel (`getFluxelAt(x,y)`), grid dimension introspection, and size retrieval.
- Shadow rendering offloaded to a shared canvas (`FluxelShadowCanvasRenderer`) to avoid per‑cell DOM overhead.
  The system is tuned for: minimal allocations, device‑pixel ratio scaling, and future migration to shader pipelines (see roadmap: WebGL/PixiJS).

<a id="frontend-layered-parallax-carousel"></a>

### Layered Parallax Carousel

Custom infinite carousel with master/slave layering for synchronized parallax. Distinct traits:

- Uses browser-native horizontal scrolling as the primary gesture surface (trackpad/scroll-wheel/touch swipe), so momentum/inertia comes “for free” and integrates naturally with the platform.

  Accessibility upside: because it stays a real scroll surface (not a fully custom pointer-gesture layer), it tends to work better with standard browser input behaviors and OS-level scroll settings.

<a id="frontend-route-synced-carousel"></a>
Route-synced navigation + deep linking is first-class: route updates are gated until the carousel index is “stable” after inertia.

- Large positive `BASE_OFFSET` hack enabling effective bi‑directional wrap without negative `scrollLeft`.
- Carousel navigation persists to browser history via client `pushState` segment updates, with explicit external route-change handling so Back/Forward restores the active project.
- On programmatic navigation (e.g., clicking a thumbnail or using next/prev), the carousel takes the shortest route by scrolling either direction across the wrap boundary.
- Master carousel captures inertial gesture scroll; slave carousels mirror via computed offsets for multi‑depth visuals (phones vs laptops layer, etc.).
- Precise indexing decoupled from DOM scroll; stabilization events fire only after inertial motion settles.
- Programmatic navigation uses GSAP tweening today; architecture is prepared for a custom physics tween engine (lower GC pressure, unified gesture/mouse feel).
- Debug mode surfaces multipliers & positional math for tuning parallax ratios.

<a id="frontend-device-mockup-overlays"></a>

### Device Mockup Overlays

Layered device mockups (phone/laptop/etc.) coordinate with carousel state, supporting tilt effects and “stabilization” modes so the UI can settle cleanly after inertial motion.

<a id="frontend-sprite-sheet-player"></a>

### Multi‑Strategy Sprite Sheet Player

`SpriteSheetPlayer` auto‑parses dimensions & frame counts from filenames (`_w{width}h{height}f{frames}`) and supports three render strategies: CSS background shifting, Canvas blitting, and WebGL textured quads (selectable via the `renderStrategy` prop). Features:

- Per‑frame FPS arrays (variable timing) or single FPS value.
- Manual frame injection (`frameControl`), random frame selection modes, loop limits & end callbacks.
- Strategy hot‑swap with resource disposal (change `renderStrategy` without remounting); CSS is currently the preferred default for the fullscreen sequencer, Canvas remains a useful comparison path, and WebGL is still exploratory for large viewport tests.
- Global and scoped query-string controls make renderer A/B testing possible without code edits:
  - global: `spriteRenderStrategy=css|canvas|webgl`, `spriteMaxDpr=<positive number>`
  - sequencer-only: `sequencerRenderStrategy=css|canvas|webgl`, `sequencerMaxDpr=<positive number>`
- Recent refactor: autoplay frame advancement now runs imperatively inside the renderer loop rather than using a React state update for every frame.
- Future enhancement: single‑visual sheet translation mode (pan vs frame index advances).

Future packaging direction is noted in [frontend/src/components/common/sprite-rendering/README.md](./frontend/src/components/common/sprite-rendering/README.md).

<a id="frontend-kinetic-orb-physics-box"></a>

### Kinetic Orb Physics Box

`SlingerBox` hosts draggable, throwable “slinger” orbs with simple velocity integration, wall collision callbacks, damped rebounds, and a timed gravity attraction toward pointer position (delayed briefly post‑throw). Implementation details:

- Velocity sampling via short movement history window (≤100ms) to approximate flick speed.
- Pointer gravity strength attenuated with a smoothstep curve inside a radius; tangential velocity selectively damped for subtle orbital motion.
- Idle detection after low‑speed threshold; emits `onIdle` for choreography (e.g. triggering Fluxel shadow fades).
- Future: deeper coupling with Fluxel grid (projectile launches, shader disturbances) and gamified achievements.

<a id="frontend-fluid-responsive-system"></a>

### Clamped Linear Interpolation (LERP) Fluid Responsive System (SCSS mixins)

These mixins ensure predictable, accessible scaling across devices:

- `lerpRange(property, min, max, minVW, maxVW)`: pixel‑precise linear interpolation via media queries; ideal for layout dimensions, gaps, and visual components that should track viewport, not font size.
- `remRange(property, min, max, minVW, maxVW)`: accessibility‑safe scaling with rems + CSS custom properties; aligns with user font preferences for text and UI elements.
- `scaleRange(minScale, maxScale, minVW, maxVW, preserveTransform?)`: transform scaling with clamp() for perfectly smooth transitions; preserves existing transforms when needed.
- Helpers: `breakpointUp()`, unit enforcement (`ensureUnit`, `stripUnit`), `to-rems`, `rnd`, SVG data‑URL builder.

#### Usage examples

SCSS (layout scaling vs accessible text):

```scss
.cardGrid {
  // Pixel-precise gap from 16px → 48px between 360px and 1440px viewport
  @include lerpRange(gap, 16px, 48px, 360, 1440);
  // Title font size fluid from 18px → 24px respecting user font scaling
  @include remRange(font-size, 18px, 24px, 360, 1440);
}

.heroLogo {
  // Smooth transform scaling without MQ jumps
  @include scaleRange(0.9, 1.15, 360, 1280, translateX(-50%) translateY(-50%));
}
```

<a id="frontend-other-ui-systems"></a>

### Other UI interaction systems

- Custom project graphics for each portfolio entry, developed through concept iteration, Photoshop compositing/editing, and art direction
- Scroll-aware nav link highlighting (active section)
- Project thumbnail highlighting via hover on mouse-primary desktop and scroll position on non-hover/coarse-pointer devices (multi-column rows; left→right on tablet+)
- Layered-depth page slide-out nav
- Dynamic/animated hamburger button
- Pointer-magnet / sticky UI elements (e.g. “road sign”)
- Responsive road-sign panels using `border-image` framing with barricade/emergency blinker accents
- Embossed sub-sign with masked animated stripe layers
- Animated barber-pole accent and border effects
- Dynamically triggered hero onboarding hints/tooltips for orb interaction
- FPS counter/debug overlay with env and query-string toggles
- Active-slide logo/info swapper animations
- Stable viewport height strategy for mobile browser chrome jitter, overscroll noise, and coarse-pointer route-return layout stability

<a id="frontend-footer-systems"></a>

### Footer & layout systems

- Transform-positioned footer + animated footer grid
- FLIP-style transform animation for dynamic footer positioning (ResizeObserver + GSAP)

See also: [Flat features list](./docs/flat-features-list.md).

## 🔒 Secrets & Environment Management

- Secrets follow the same convention as `.env`/`.env.prod`:
  - Shared base: `.github-secrets.example.json5` ➜ `.github-secrets.private.json5`
- Dev: `.github-secrets.example.dev.json5` ➜ `.github-secrets.private.dev.json5`
- Stage (future): `.github-secrets.example.stage.json5` ➜ `.github-secrets.private.stage.json5`
- Prod: `.github-secrets.example.prod.json5` ➜ `.github-secrets.private.prod.json5`
- `sync:secrets:dry` / `sync:secrets` — Sync GitHub secrets from local JSON5 files
- `scripts/merge-github-secrets.ts` is optional. `sync:secrets` can read `.github-secrets.private.json5` plus any `.github-secrets.private.<env>.json5` files directly, or you can run `npm run secrets:bundle` to merge them into `.github-secrets.private.json5` first.
- For Docker Hub auth, prefer `DOCKER_HUB_ACCESS_TOKEN` in the shared secrets manifest. `DOCKER_HUB_PASSWORD` is retained only as a backward-compatible fallback for older scripts/workflows.
- Sync script: `scripts/sync-github-secrets.ts`
  - Auto-syncs repo secrets followed by every detected GitHub **Environment** manifest (e.g., `.github-secrets.private.dev.json5`).
  - `--omit-env <name>` (repeatable) skips specific environments; pass `all` to push repo-level secrets only.
  - Validates `REQUIRED_ENVIRONMENT_VARIABLES_FRONTEND` and `REQUIRED_ENVIRONMENT_VARIABLES_BACKEND` (comma groups, `|` = ANY-of within a group) before writing.
  - Dry run previews deletions/additions without touching GitHub.

Common usage:

```bash
# Merge per-environment secret files into the secrets bundle
npm run secrets:bundle

# Shared/base secrets (Docker Hub creds, ACME email, shared buckets)
npm run sync:secrets:base:dry
npm run sync:secrets:base

# Dev / Prod GitHub Environments
npm run sync:secrets:dev:dry
npm run sync:secrets:dev
npm run sync:secrets:prod:dry
npm run sync:secrets:prod

# Everything (repo + all envs) in one shot
npm run sync:secrets

# Optional future stage environment (skips dev/prod automatically)
npm run sync:secrets:stage
```

### Update `PROJECT_DATA_SNAPSHOT_JSON` (quick runbook)

Use this when you want frontend image builds to consume a fresh hermetic snapshot.

```bash
# 1) Generate normalized snapshot from backend
BACKEND_INTERNAL_URL=http://localhost:8081 npm run snapshot:projects

# 2) Compact + size-check for GitHub secret payload
npm run snapshot:projects:secret:write

# 3) Push to GitHub Environment secret (example: prod)
gh secret set PROJECT_DATA_SNAPSHOT_JSON --env prod --repo BBaysinger/bb-portfolio < frontend/.cache/project-data-snapshot.secret.json
```

Notes:

- Replace `--env prod` with `--env dev` for the dev environment.
- If the payload exceeds the default budget, set `PROJECT_DATA_SNAPSHOT_SECRET_MAX_BYTES` before step 2.

### Update `STATIC_CONTENT_SNAPSHOT_JSON` (quick runbook)

Use this when you want frontend image builds to consume hermetic branding, greeting, and CV content.

```bash
# 1) Generate + compact + size-check for GitHub secret payload
npm run snapshot:static-content:secret:write

# 2) Push to GitHub Environment secret (example: prod)
gh secret set STATIC_CONTENT_SNAPSHOT_JSON --env prod --repo BBaysinger/bb-portfolio < frontend/.cache/static-content-snapshot.secret.json
```

Notes:

- Replace `--env prod` with `--env dev` for the dev environment.
- `snapshot:static-content:secret:write` now generates `frontend/.cache/static-content-snapshot.json` automatically before compacting it.
- If the payload exceeds the default budget, set `STATIC_CONTENT_SNAPSHOT_SECRET_MAX_BYTES` before step 2.

- Rich project metadata (brand, tags, role, year, awards, URLs)
- Image collections for screenshots, thumbnails, brand logos
- Image processing via Sharp (server-side resizing) with 2 MB upload limit

### 💾 Storage & Media Pipeline

- Sprite sheet image processing scripts (source assets processed externally; see Image Processing section below)
- S3-backed media storage with per-collection prefixes
- Instance-role support with optional static credentials
- Media migration/verification scripts
  - migrate media to S3, update media URLs, rebuild records
- Local filesystem storage for local profile

#### Project files (S3 + app-routed delivery)

- Static project files live in two S3 buckets (separate from Payload media):
  - Public: `bb-portfolio-projects-public`
  - Private: `bb-portfolio-projects-nda`
- Delivery is handled by Next.js App Router with clean, canonical URLs:
  - Public files: `/projects/{folder}/...` → streams from public bucket
  - Private files: `/private/{folder}/...` → streams from private bucket; requires auth
- Key behavior (boilerplate-friendly):
  - No presigned URLs are exposed; the server streams content directly from S3
  - Directory and extensionless paths resolve to `index.html`
  - Range requests supported (for large assets)
  - Conditional requests supported (ETag/Last-Modified → 304)
  - Public caching: `Cache-Control: public, max-age=300, must-revalidate`
  - Private caching: `Cache-Control: private, max-age=0, must-revalidate`
  - Security header: `X-Content-Type-Options: nosniff`
- Unauthorized style for `/private/*`:
  - Returns `401 Unauthorized` when not logged in (conventional, explicit)
  - If you need to conceal existence (e.g., stricter NDA), flip to `404 Not Found` in the route
- Upload/verify helpers:
  - `npm run projects:upload:public | :nda | :both`
  - `npm run projects:verify`
- See also:
  - Guide: `docs/s3-bucket-migration.md`

### 🔒 API & Security

- Env-profile guardrails (fail-fast config validation)
- Locked-down CSRF/CORS allowlists per environment
- Role-based access control for admin-only mutations
- Health-check endpoint for uptime/deploy validation
- Contact API via AWS SES (HTML/Text email + Reply-To; see `docs/aws-ses-setup.md`)

### ⚡ DevOps & Deployment

- Deployment runner script
  - Provisions/updates infra and restarts containers via GH workflow handoff
  - Optionally rebuilds/pushes images; no destroy by default
  - Built-in safety checks; avoids destroying items meant to persist
  - Health checks for frontend/backend endpoints before declaring success
- Terraform IaC: one-command provision/teardown
- Systemd-managed Docker services on EC2 (auto-restart)
- Dual registry strategy (Docker Hub dev, ECR prod)
- Secure Docker builds (BuildKit secret mounts, minimal args)
- Generated env files on host via CI/CD (no secrets in repo; see "Secrets & Environment Management")
- GitHub Secrets synchronization from JSON5 via a TypeScript sync script
- Reverse proxy options: Caddy or Nginx (compose/configs provided)
- Compose profiles for local/dev/prod and proxy-only

#### Hardened Backend Runtime (Distroless)

- Backend runs on `gcr.io/distroless/nodejs22-debian12` (no shell or package manager; non-root by default).
- Backend production builds use webpack only (`next build --webpack`); Turbopack must not be used for backend production builds (Payload CMS requirement).
- Next standalone output is copied to `/app`, and the server starts via a tiny CommonJS bootstrap that requires `'/app/app/server.js'`.
- Health checks target `/api/health/` (note trailing slash due to `trailingSlash: true`).
- BuildKit secrets are used during builds; runtime configuration comes from Compose/env files — no secrets are baked into images.

See `deploy/DEPLOYMENT.md` for the current deployment/runtime model and `docs/engineering-standards.md` for ongoing implementation guardrails.

#### 🧹 Image cleanup & retention

- Goal: keep registries lean by retaining only the most recent images
- Automated cleanup for both Docker Hub and ECR
- Defaults keep last 3 images and remove older (ECR also removes untagged)

Common tasks:

```bash
# Preview (no deletions)
npm run images:cleanup:dry-run

# Apply (keeps last 3; prunes older and untagged where applicable)
npm run images:cleanup

# Verify counts (Docker Hub tag totals + ECR tagged counts)
npm run images:verify
```

Notes:

- ECR supports deleting untagged images; Docker Hub ignores that flag
- ECR-only variants: `npm run images:cleanup:ecr[:dry-run]`
- See also: [deploy/DEPLOYMENT.md](./deploy/DEPLOYMENT.md)
- Tip: If ECR is skipped due to missing auth, you can pass `-- --login --profile <your-profile>` to have the tool run `aws sso login` and perform an ECR Docker login automatically (default region `us-west-2`, override with `--region`).

Runtime .env generation (deploy):

- CI deploy workflows generate `.env.dev` and `.env.prod` on EC2 from GitHub Secrets
- These files include `REQUIRED_ENVIRONMENT_VARIABLES_FRONTEND` and `REQUIRED_ENVIRONMENT_VARIABLES_BACKEND` so runtime env-guard checks pass across profiles.
- No secrets are stored in the repo; Docker images don’t bake secrets (BuildKit secret mounts are used during builds)

### 🛠️ Developer Experience & Testing

- Monorepo with strict TypeScript (frontend and backend)
- Unified ESLint configurations
- Playwright E2E and Vitest setup (backend)
- Local dev proxy and hot-reload compose profile

### 📦 Spun-off Packages

- **json5-manifest-sync** - Extracted package for syncing documented `package.json5` companion manifests from canonical `package.json` files
  - `package.json` remains the real manifest consumed by npm/tooling
  - `package.json5` serves as the documented companion manifest
  - Preserves mapped comments and stable JSON5 formatting
  - Repo: `github.com/BBaysinger/json5-manifest-sync`

### 📝 Documented Package Manifests

- Extensively commented `package.json5` companion manifests live alongside canonical `package.json` files for human-readable package/service documentation

### 💿 Data Ops & Backups

- JSON dumps for seed data and repeatable imports
- Automated database backups with dated folders

### 🖼️ Image Processing

- Custom Sprite Sheet Processing Scripts
  - In a separate repo: [github.com/BBaysinger/fluxel-animations](https://github.com/BBaysinger/fluxel-animations)

## Technologies Used

- Frontend: Next.js, React, TypeScript, SCSS Modules
- Backend: Payload CMS (Next.js runtime), TypeScript
- State: Redux Toolkit (frontend auth/session), React hooks
- Testing: Playwright, Vitest
- Tooling: ESLint, Prettier, Docker, Node.js
- Cloud/IaC: AWS (EC2, S3, ECR, IAM, SES, Route 53, CloudWatch, WorkMail), Terraform

<!-- Roadmap moved toward the end for better flow -->

## Infrastructure & Deployment

High-level AWS/IaC overview only.

Canonical day-to-day deployment commands live earlier in [Deployment conveniences catalog](./README.md#-deployment-conveniences-catalog). The deployment runner details and common invocations live in [docs/deployment-runner.md](./docs/deployment-runner.md).

### 🧠 Deployment Runner

The deployment runner provides a guarded single entrypoint for Terraform discovery/apply, image build/push, env regeneration, and profile restarts when shipping changes.

- Script: `deploy/scripts/deployment-runner.sh`
- Use it for coordinated deployment runs; use targeted commands when the stack is already healthy and only needs focused debugging or container restarts.
- For common commands, flags, and operator notes, use [docs/deployment-runner.md](./docs/deployment-runner.md) rather than duplicating that runbook here.

### ⚙️ Architecture Overview

- Cloud Provider: Amazon Web Services (AWS)
- Infrastructure as Code: Terraform (automated provisioning/teardown)
- Compute: EC2 t3.medium (automated configuration via user_data)
- Reverse Proxy: Caddy or Nginx (configs and compose profiles included)
- Containerization: Docker with dual registry strategy (Docker Hub + ECR)
- Storage: S3 buckets for media assets with environment isolation
- Networking: Elastic IP (set `EC2_INSTANCE_IP` in repo-root `.env`), Security Groups, VPC integration
- Domain & DNS: Route 53-managed custom domains, with `bbaysinger.io` as the current public primary host
- TLS: Host-level Nginx + Certbot certificate issuance and renewal checks, with deployment scripts enforcing HTTPS on the EC2 host

### 👤 Single-Developer Operating Assumptions

This repo is optimized for single-operator ownership: fast iteration, clear deployment control, cost-aware infrastructure, and explicit operational guardrails. That scope simplifies cost and workflow while making the main tradeoffs visible:

- `dev` and `prod` currently run on the same EC2 host to keep infrastructure spend down. Local and dev environments cover iteration before production release, while the shared host makes the isolation tradeoff explicit.
- A separate staging environment is intentionally omitted for now. In practice, `local` handles most iteration, `dev` is the integration sandbox, and `prod` is the public-facing release target.
- `release:promote` is built for a single operator driving `dev` and `main`. It protects against overlapping local runs and is intentionally scoped for single-operator branch promotion rather than multi-developer release arbitration or PR approval workflows.
- Deployment automation assumes the same operator owns branch sync, environment generation, infra changes, and runtime verification. That keeps the pipeline fast and explicit within the current project scope.
- Public URL and revalidation settings need to reflect the real canonical HTTPS hostnames. A small env drift there can break otherwise-correct content deploys or ISR invalidation.
- Some content workflows intentionally favor operator clarity over indirection. For example, authored project-description files stay slug-named for readability, so slug changes are allowed only when the source files are renamed in step and mismatches fail fast.
- The docs are maintained as active runbooks and guardrails, not as a long-lived architecture decision log. Operational truth should live in maintained docs such as `deploy/DEPLOYMENT.md`, `docs/deployment-runner.md`, and `docs/engineering-standards.md`.

If this repo moves to a team-maintained product, the first things to revisit are environment isolation, release ownership, approval gates, and stronger coordination around branch promotion.

### 📈 Monitoring & CloudWatch

Runtime visibility and basic security counters are provided through two complementary paths:

1. **CloudWatch Agent (host metrics + log ingestion)**
   - Config file: `scripts/monitoring/cloudwatch-agent-config.json`

- Installed automatically by the deployment runner (`ensure_cloudwatch_agent`) when absent.
- Collected metrics namespace: `BB-Portfolio/Host` (CPU idle/user/system, mem used %, disk used %, network bytes in/out).
- Log groups created on demand:
  - `/bb-portfolio/nginx/access`
  - `/bb-portfolio/nginx/error`
  - `/bb-portfolio/system/secure` (auth / sshd)
  - `/bb-portfolio/fail2ban`
- Each stream is suffixed with the instance id for isolation.

2. **Custom security & performance counters (PutMetricData)**
   - Script: `scripts/monitoring/publish-cloudwatch-metrics.sh` (counts upstream timeouts, rate limit triggers, SSH auth failures, fail2ban bans).
   - Intended schedule: systemd timer or cron every 5 minutes (example unit can be added later).
   - Namespace: `BB-Portfolio` (distinct from agent host metrics).

**IAM:** Policy `bb-portfolio-cloudwatch-agent` (added via Terraform) grants `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents`, and `cloudwatch:PutMetricData` to the EC2 instance role. No static AWS keys required.

**Manual install (fallback):**

```bash
ssh -i ~/.ssh/bb-portfolio-site-key.pem ec2-user@<EIP>
sudo yum install -y amazon-cloudwatch-agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config -m ec2 \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json -s
```

Or re-run the deployment runner: `deploy/scripts/deployment-runner.sh --profiles prod` (auto ensures agent + config).

**Query examples (Logs Insights):**

```sql
fields @timestamp, @message
| filter @log like /nginx\/access/ and status >= 500
| sort @timestamp desc
| limit 25
```

Top referrers:

```sql
fields http_referer as ref
| filter @log like /nginx\/access/ and ref != '-'
| stats count() as hits by ref
| sort hits desc
| limit 20
```

**Next steps (optional):** Add CloudWatch Dashboards / Alarms for timeouts & SSH failures, integrate Real User Monitoring (CloudWatch RUM) for frontend UX metrics.

RUM referrers (optional):

- Primary source of truth for inbound referrers is still nginx access logs (`http_referer`).
- This repo records a lightweight RUM referrer payload (origin/host only) on the first page load per session.
  - It is sent both as a custom event and as session attributes (`bb_referrerHost`, `bb_referrerOrigin`) so you can query it even if the log schema doesn't surface custom event names.
- Query in Logs Insights (log group: `/aws/vendedlogs/RUMService`):

```sql
-- Schema-safe: search the raw message for the session attribute keys
fields @timestamp, @message
| filter @message like /bb_referrerHost/
| sort @timestamp desc
| limit 50

-- If the fields are indexed in your account/region, you can also try:
-- fields @timestamp, metadata.sessionAttributes.bb_referrerOrigin, metadata.sessionAttributes.bb_referrerHost
-- | filter metadata.sessionAttributes.bb_referrerHost != ""
-- | stats count() as hits by metadata.sessionAttributes.bb_referrerOrigin, metadata.sessionAttributes.bb_referrerHost
-- | sort hits desc
-- | limit 50
```

### 🚀 Deployment Process (Terraform Core)

Provision / destroy core infrastructure using Terraform:

```bash
cd infra/
terraform plan    # Preview changes
terraform apply   # Create/update AWS resources
terraform destroy # Full teardown (guarded)
```

Runtime and deployment lifecycle (summary):

1. Terraform ensures EC2, IAM, S3, ECR, Route 53, SES, etc. exist & are current.
2. EC2 user_data bootstraps Docker + proxy services.
3. GitHub workflow (invoked by the deployment runner) regenerates `.env.dev` / `.env.prod` from secrets → containers restart.
4. Systemd maintains uptime & restarts; image sources differ by profile (Docker Hub dev vs ECR prod).
5. Post‑deploy health checks validate backend/API and media routing.

Smoke check examples:

```bash
curl -fsSL http://localhost:3001/api/health/   # expect 200
curl -fsSL 'http://localhost:3000/api/projects/?limit=3&depth=0' | jq '.docs | length'
```

If env guards fail (missing required variables) re‑run the deployment runner with `--refresh-env` (see section above) to regenerate host env files.

### 🐳 Container Management

Dual registry strategy:

- Development: Docker Hub images (`bhbaysinger/bb-portfolio-*:dev`)
- Production: Amazon ECR images (`*.dkr.ecr.us-west-2.amazonaws.com/bb-portfolio-*:latest`)

Helper scripts (from `infra/bb-portfolio-management.sh`):

```bash
# Switch between environments
./bb-portfolio-management.sh switch dev   # Use Docker Hub images
./bb-portfolio-management.sh switch prod  # Use ECR images
./bb-portfolio-management.sh status       # Check container health
./bb-portfolio-management.sh deploy       # Deploy from ECR
```

### 🛡️ Production Features

- Automated configuration via Terraform and user_data scripts
- Container auto-restart through systemd services
- Environment isolation with separate S3 buckets and configurations
- Security through IAM roles, encrypted storage, and security groups
- Prepared for scaling with load balancers and auto-scaling groups
- Cost optimization through appropriate resource sizing

### 📊 Infrastructure Components

- Infrastructure as Code with Terraform
- Deployment automation and service lifecycle management with Docker and systemd
- Automated deployment workflows
- System reliability with auto-restart and health monitoring

### 📚 Documentation

For deep dives and implementation details:

- Engineering Standards: [`/docs/engineering-standards.md`](./docs/engineering-standards.md)
- S3 Project Buckets Guide: [`/docs/s3-bucket-migration.md`](./docs/s3-bucket-migration.md)
- Clamped Linear Interpolation (LERP) Fluid Responsive System: [`/docs/fluid-responsive-system.md`](./docs/fluid-responsive-system.md)
- Uploads & Migration: [`/docs/uploads-and-migration.md`](./docs/uploads-and-migration.md)
- SES Email Setup: [`/docs/aws-ses-setup.md`](./docs/aws-ses-setup.md)
- Ports & Services: [`/docs/ports.md`](./docs/ports.md)
- Infrastructure Guide: [`/infra/README.md`](./infra/README.md)
- Deployment Instructions: [`/deploy/DEPLOYMENT.md`](./deploy/DEPLOYMENT.md)
- Deployment Runner: [`/docs/deployment-runner.md`](./docs/deployment-runner.md)

## Roadmap

- Continue polish, accessibility, and performance passes across key UI flows
- Expand the hero interaction system with richer state, motion, and user-triggered behavior
- Continue performance exploration for Canvas/WebGL/PixiJS rendering paths
- Extract mature interaction systems into portable packages or standalone repos
- Add filterable project tags/categories
- Add interactive tutorials for the kinetic orb and carousel
- Add global light/dark mode preferences via Redux
- Continue Fluxel optimization work through WebGL and/or PixiJS shader exploration
- Expand automated test coverage around stable interaction, routing, and content workflows
- Capture and store structured data about user interactions
- Continue accessibility improvements around ARIA semantics, keyboard behavior, and rem-based scaling
- Remove remaining Bootstrap dependency if it no longer carries meaningful layout/UI value
- Move header animations further toward user-triggered behavior rather than timer-driven playback
