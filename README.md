# Interactive UI / Frontend Systems Portfolio

Highly interactive, renderer‑aware frontend systems (carousel, layered parallax, multi‑strategy sprite engine, kinetic physics, experimental pixel/fluxel grid) built with **React + TypeScript (Next.js App Router)**. Everything animated here is handcrafted—no external physics, 3D, or sprite sheet libs. DevOps/IaC pieces exist to prove production rigor, but the emphasis is the interaction architecture.

> Hiring reviewer? Start with the 30‑second tour below. The deployment/orchestration stack is intentionally secondary—supportive infrastructure, not the pitch.

## 🔎 30‑Second Tour (Frontend Focus)

| What to Look At                                | Why It Matters                                                              | Code Entry                                                                                      |
| ---------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Layered Parallax Project Carousel              | Infinite bi‑directional wrap, inertial sync, master/slave parallax layers   | `frontend/src/components/project-carousel-page/` (`Carousel.tsx`, `LayeredCarouselManager.tsx`) |
| Fluxel Grid (Canvas + experimental strategies) | Pluggable grid render, pointer + projectile influence, shadow system        | `frontend/src/components/home-page/header-main/fluxel-grid/`                                    |
| Sprite Sheet Player (CSS/Canvas/WebGL)         | Auto metadata parsing, per‑frame FPS arrays, strategy hot‑swap              | `frontend/src/components/common/sprite-rendering/`                                              |
| Kinetic Slinger Physics Box                    | Throwables with pointer gravity & orbital damping, idle detection hooks     | `frontend/src/components/home-page/header-main/SlingerBox.tsx`                                  |
| Fluid Responsive System (mixins + hook)        | Pixel‑precise CSS interpolation + viewport‑accurate JS scaler with CSS vars | `frontend/src/styles/_mixins.scss`, `frontend/src/hooks/useResponsiveScaler.ts`                 |
| Route‑Synced Carousel + Deep Linking           | Scroll inertia stabilization gates route updates                            | `ProjectView.tsx`, `LayeredCarouselManager.tsx`                                                 |
| Device Mockup Layer Coordination               | Independent layer scroll multipliers + content swapping                     | `ProjectCarouselView.*`                                                                         |

Live site reference moments:

1. Project carousel: throw a fast swipe—note parallax & stable index snapping after inertia.
2. Homepage hero: drag the orb → fluxel shadows & subtle projectile effects (if enabled).
3. Sprite sequences (lightning / energy bars): watch frame pacing consistency across strategies.

---

The deployment pipeline uses Terraform for infrastructure provisioning, Docker for containerization, and GitHub Actions for CI/CD. The system supports multiple environments (dev/prod) with separate container registries and S3 storage buckets.

[Visit the Live Site (primary)](http://bbaysinger.com).

---

## 🚩 Not merely a portfolio: headline features

This repo is an end‑to‑end system, not just a site. Beyond the UI work, it ships with batteries‑included DevOps and data tooling. Highlights:

- Multi‑environment infrastructure with Terraform (dev/prod), EC2 bootstrap, and Caddy/Nginx reverse proxy options
- A deployment orchestrator that coordinates image builds, GitHub Actions env generation, and safe restarts
- One‑command local dev modes: bare metal, Docker SSR, Docker SSG, and Caddy proxy for prod‑like URLs
- Dual registries (Docker Hub for dev, ECR for prod) with automated image cleanup and verification
- Secrets and environment sync pipeline driven by JSON5 source files and validation lists
- Media and project file pipelines to S3 with verify tools and server‑streamed delivery routes (no presigned URLs)
- Database migration, rename, and safety‑first destructive helpers with dry‑run support
- Scripted conveniences for day‑to‑day work: dependency upgrades, multi‑package installs, branch sync, and more

Jump to the complete list of conveniences: Deployment conveniences catalog.

## 🧠 Deployment Orchestrator & Infrastructure Automation (Support Layer)

This project features a **custom deployment orchestrator** designed to unify AWS provisioning, Docker-based container management, and CI/CD workflows into a single command-line experience. The orchestrator bridges the gap between Terraform infrastructure management, GitHub Actions automation, and runtime configuration on EC2.

### Core Capabilities

- **Orchestrated Deploys:** Automates end-to-end redeploys via GitHub Actions, regenerates `.env` files on EC2, and safely restarts containers.
- **Hybrid Workflow Integration:** Seamlessly coordinates between local CLI invocations, GitHub Actions dispatches, and direct SSH fallbacks.
- **Zero Secret Exposure:** All credentials and API keys are pulled from GitHub Secrets during deployment—never baked into images or committed to the repo.
- **Profile-Aware Deployments:** Supports `dev`, `prod`, or `both` profiles with independent registries, S3 buckets, and SES configs.
- **Fail-Safe Logic:** Prevents destructive operations on persistent AWS resources and validates infrastructure state before modification.

### Typical Flow

```bash
# Discover the current infra and deployment configuration
deploy/scripts/deployment-orchestrator.sh --discover-only

# Plan and preview deployment changes
deploy/scripts/deployment-orchestrator.sh --plan-only

# Redeploy production (GitHub Actions workflow + env regeneration)
deploy/scripts/deployment-orchestrator.sh --profiles prod --refresh-env

# Redeploy both environments without rebuilding images
deploy/scripts/deployment-orchestrator.sh --no-build --profiles both --refresh-env
```

### Behind the Scenes

1. **Terraform Initialization:** Provisions or updates AWS resources (EC2, IAM, S3, ECR, Route 53, SES).
2. **User Data Bootstrapping:** Installs Docker, Caddy/Nginx, and system services automatically on EC2.
3. **GitHub Workflow Dispatch:** Uses reusable workflows to regenerate environment files and trigger container restarts.
4. **Systemd Management:** Provides persistent auto-restart, health checks, and graceful recovery across deploys.
5. **Safe Rollback:** Detects failed redeploys and reverts to the previous stable configuration.

## 🧰 Deployment conveniences catalog

All root `npm` scripts are grouped below by intent. Most have dry‑run or detached variants; destructive operations are guarded or require explicit flags.

### Local development modes

- `dev` / `bareMetalDev` / `bareMetalDev:all` — Run backend + frontend (bare metal)
- `bareMetalDev:backend` / `bareMetalDev:frontend` — Single service bare metal
- `bareMetalDev:tabs` — macOS: separate Terminal tabs
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
- `docker:build-push` — Scripted build + push both dev images
- `ecr:build-push` — Build + push prod images to ECR

### Registry hygiene & verification

- `images:cleanup` / `images:cleanup:dry-run` — Prune old images (retain 3)
- `images:cleanup:ecr` / `images:cleanup:ecr:dry-run` — ECR only
- `images:cleanup:login` — Cleanup with AWS auth
- `images:verify` / `images:verify:login` — Show tag counts

### Secrets & environment sync

- `sync:secrets:dry` / `sync:secrets` — Sync GitHub secrets from JSON5 source
- `infra:sync-env` / `infra:sync-env:force` — Populate local `.env` from Terraform state
- `sync:packages` — Maintain package.json ↔ package.json5 parity
- `sync:branches` — Fast‑forward branch sync (returns to `dev`)

### Media pipeline

- `media:export` — Generate portfolio images externally
- `seed:media` — Import seed images for local dev
- `media:upload:dev|prod|both` — Upload media to S3 buckets
- `media:verify` — Validate media on S3
- `migrate:media:dev|prod|both` — Upload (alias)
- `migrate:media-urls:dev:dry|dev|prod:dry|prod` — Rewrite DB URLs to S3
- `migrate:all:dev:dry|dev|prod:dry|prod` — Combined upload + URL sync

### Project files (public & NDA)

- `projects:upload:public|nda|both` — Upload project bundles
- `projects:verify` — Validate project files on S3

### Database operations

- `db:rename:*` — Safe rename with backup (local/dev/prod) + dry runs
- `db:delete:*` — Backup then drop legacy DBs (local/dev/prod) + dry runs
- `db:migrate:*` — Replace target DB with another environment’s data; dry‑run variants

### Deployment & config

- `deploy:full` — Full orchestrated redeploy (images + both profiles + env refresh)
- `sync:nginx` — Push Nginx config to remote host

### Quality & DX

- `format` / `lint` / `precommit` / `prepush` — Code style, static analysis, type + tests
- `update:deps` / `install:all` — Upgrade & install across packages

Notes:

- Dry runs prevent unintended destructive actions.
- Secrets never enter the repo or images; all pulled at deploy time.
- Use proxy mode for production‑parity URLs and relative API paths.

---

## 🎨 Frontend UX & Interaction

Rather than a handful of flashy widgets, the UI layer is a set of small, renderer‑aware systems built for smoothness, frame accuracy, and portability. Key subsystems:

### Fluxel Grid System

An experimental, dynamic pixel grid ("fluxels") rendered via a pluggable strategy (current: Canvas; exploratory: SVG & shader/WebGL). Each fluxel cell stores lightweight `FluxelData` including color variation; the grid computes a pixel‑precise cell size at runtime (`FluxelCanvasGrid`) and exposes an imperative handle (`FluxelGridHandle`) for:

- Lookup by pixel (`getFluxelAt(x,y)`), grid dimension introspection, and size retrieval.
- Shadow rendering offloaded to a shared canvas (`FluxelShadowCanvasRenderer`) to avoid per‑cell DOM overhead.
- Projectile & positional effects triggered from external actors (e.g. the Slinger orb) and reset utilities for demo/game behaviors.
  The system is tuned for: minimal allocations, device‑pixel ratio scaling, and future migration to shader pipelines (see roadmap: WebGL/PixiJS).

### Layered Parallax Carousel

Custom infinite carousel with master/slave layering for synchronized parallax. Distinct traits:

- Large positive `BASE_OFFSET` hack enabling effective bi‑directional wrap without negative `scrollLeft`.
- Master carousel captures inertial gesture scroll; slave carousels mirror via computed offsets for multi‑depth visuals (phones vs laptops layer, etc.).
- Precise indexing decoupled from DOM scroll; stabilization events fire only after inertial motion settles (route updates wait for “stable” index).
- Programmatic navigation uses GSAP tweening today; architecture is prepared for a custom physics tween engine (lower GC pressure, unified gesture/mouse feel).
- Debug mode surfaces multipliers & positional math for tuning parallax ratios.

### Multi‑Strategy Sprite Sheet Player

`SpriteSheetPlayer` auto‑parses dimensions & frame counts from filenames (`_w{width}h{height}f{frames}`) and supports three render strategies: CSS background shifting, Canvas blitting, and WebGL textured quads. Features:

- Per‑frame FPS arrays (variable timing) or single FPS value.
- Manual frame injection (`frameControl`), random frame selection modes, loop limits & end callbacks.
- Strategy hot‑swap with resource disposal; Canvas currently preferred (balance of clarity & perf), WebGL exploratory for larger sheets (observed higher cost at large viewport sizes).
- Future enhancement: single‑visual sheet translation mode (pan vs frame index advances).

### Kinetic Slinger Physics Box

`SlingerBox` hosts draggable, throwable “slinger” orbs with simple velocity integration, wall collision callbacks, damped rebounds, and a timed gravity attraction toward pointer position (delayed briefly post‑throw). Implementation details:

- Velocity sampling via short movement history window (≤100ms) to approximate flick speed.
- Pointer gravity strength attenuated with a smoothstep curve inside a radius; tangential velocity selectively damped for subtle orbital motion.
- Idle detection after low‑speed threshold; emits `onIdle` for choreography (e.g. triggering Fluxel shadow fades).
- Future: deeper coupling with Fluxel grid (projectile launches, shader disturbances) and gamified achievements.

### Fluid Responsive System (SCSS mixins + React hook)

Two complementary pieces ensure predictable, accessible scaling across devices:

- SCSS mixins for CSS‑only fluidity
  - `staticRange(property, min, max, minVW, maxVW)`: pixel‑precise linear interpolation via media queries; ideal for layout dimensions, gaps, and visual components that should track viewport, not font size.
  - `remRange(property, min, max, minVW, maxVW)`: accessibility‑safe scaling with rems + CSS custom properties; aligns with user font preferences for text and UI elements.
  - `scaleRange(minScale, maxScale, minVW, maxVW, preserveTransform?)`: transform scaling with clamp() for perfectly smooth transitions; preserves existing transforms when needed.
  - Helpers: `breakpointUp()`, unit enforcement (`ensureUnit`, `stripUnit`), `to-rems`, `rnd`, SVG data‑URL builder.

- React hook for viewport‑accurate measurement
  - `useResponsiveScaler(aspectRatio=4/3, baseWidth=1280, mode='cover'|'contain', elementRef?, viewportMode='small'|'dynamic'|'large')`
  - Measures CSS viewport units (svw/svh, dvw/dvh, lvw/lvh) via hidden measurers for exact pixel parity with CSS; falls back to visualViewport with min/max tracking to emulate CSS small/large semantics.
  - Returns `{ width, height, offsetX, offsetY, scale }` and can write CSS vars to the provided element: `--responsive-scaler-*`.
  - Use cases: exact aspect‑locked surfaces (carousel stage, device frames, sprite canvases) with pixel‑correct centering and scale.

Together, these ensure consistent composition density, accurate aspect locks, and accessible text scaling without clamp() surprises.

Other UI details: scroll‑aware navigation, mobile slide‑out menu, dynamic device mockup overlays, animated footer grid, and controlled pointer‑magnet elements—all built without heavyweight external animation/physics libraries.

### 📝 CMS, Data Modeling & Rendering

- Payload CMS Backend (type-safe with generated types)
- SSR portfolio projects list (Next.js)
- SSG dynamic routing projects view (Next.js)
- Automatic slug generation and sortable index
- NDA route segmentation and content safety
  - Public route `/project/[projectId]` never includes NDA items in the active dataset (even when authenticated)
  - NDA-only route `/nda/[projectId]` requires authentication and is rendered dynamically per request
  - Authenticated requests to a public NDA slug redirect server-side to `/nda/[projectId]`; unauthenticated sees 404
  - Client carousel and prev/next links are route-aware (public → `/project/*`, NDA → `/nda/*`) without leaking NDA data
- Rich project metadata (brand, tags, role, year, awards, URLs)
- Image collections for screenshots, thumbnails, brand logos
- Image processing via Sharp (server-side resizing) with 2 MB upload limit

### 💾 Storage & Media Pipeline

- S3-backed media storage with per-collection prefixes
- Instance-role support with optional static credentials
- Media migration/verification scripts
  - migrate media to S3, update media URLs, rebuild records
- Local filesystem storage for local profile

#### Project files (S3 + app-routed delivery)

- Static project files live in two S3 buckets (separate from Payload media):
  - Public: `bb-portfolio-projects-public`
  - NDA-protected: `bb-portfolio-projects-nda`
- Delivery is handled by Next.js App Router with clean, canonical URLs:
  - Public files: `/projects/{folder}/...` → streams from public bucket
  - Private/NDA files: `/private/{folder}/...` → streams from NDA bucket; requires auth
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
  - ADR: Project Files on S3 and NDA Gated Delivery (in `docs/architecture-decisions.md`)
  - Guide: `docs/s3-bucket-migration.md`

### 🔒 API & Security

- Env-profile guardrails (fail-fast config validation)
- Locked-down CSRF/CORS allowlists per environment
- Role-based access control for admin-only mutations
- Health-check endpoint for uptime/deploy validation
- Contact API via AWS SES (see `docs/aws-ses-setup.md`)

### ⚡ DevOps & Deployment

- Orchestrated deploys script
  - Provisions/updates infra and restarts containers via GH workflow handoff
  - Optionally rebuilds/pushes images; no destroy by default (safety-first)
  - Built-in safety checks; avoids destroying items meant to persist
- Terraform IaC: one-command provision/teardown
- Systemd-managed Docker services on EC2 (auto-restart)
- Dual registry strategy (Docker Hub dev, ECR prod)
- Secure Docker builds (BuildKit secret mounts, minimal args)
- Generated env files on host via CI/CD (no secrets in repo; see "Secrets & Environment Management")
- GitHub Secrets synchronization from JSON5 via a TypeScript sync script
- Reverse proxy options: Caddy or Nginx (compose/configs provided)
- Compose profiles for local/dev/prod and proxy-only

#### 🧹 Image cleanup & retention

- Goal: keep registries lean by retaining only the most recent images
- Orchestrated cleanup for both Docker Hub and ECR
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
- See ADR: [Image Cleanup and Retention](./docs/architecture-decisions.md)
- Tip: If ECR is skipped due to missing auth, you can pass `-- --login --profile <your-profile>` to have the tool run `aws sso login` and perform an ECR Docker login automatically (default region `us-west-2`, override with `--region`).

#### 🔐 Secrets & Environment Management

- Source of truth for GitHub Actions secrets lives in JSON5 files at the repo root:
  - `.github-secrets.private.json5` (ignored by git; real values)
  - `.github-secrets.example.json5` (template with docs; safe to commit)
- Sync script: `scripts/sync-github-secrets.ts`
  - Reads JSON5, overlays matching keys from the sibling `.private` file onto the template schema (extras ignored)
  - Validates required env lists before syncing secrets:
    - `DEV_REQUIRED_ENVIRONMENT_VARIABLES`
    - `PROD_REQUIRED_ENVIRONMENT_VARIABLES`
    - Grammar: comma-separated groups; use `|` within a group for ANY-of
    - Example: `PROD_REQUIRED_ENVIRONMENT_VARIABLES=PROD_SES_FROM_EMAIL|PROD_SMTP_FROM_EMAIL,PROD_MONGODB_URI,PROD_AWS_REGION,PROD_PAYLOAD_SECRET`
  - Fails fast with an actionable message if any group lacks a key in the JSON5; override temporarily with `ALLOW_MISSING_REQUIRED_GROUPS=true` (not recommended)
  - Dry run does not modify GitHub; it only shows planned changes and validation summary

Common usage:

```bash
# Dry run (safe): validate required lists and show planned secret updates
npx ts-node ./scripts/sync-github-secrets.ts BBaysinger/bb-portfolio ./.github-secrets.private.json5 --dry-run

# Apply: sync repo secrets to match JSON5 (destructive for extras)
npx ts-node ./scripts/sync-github-secrets.ts BBaysinger/bb-portfolio ./.github-secrets.private.json5
```

Runtime .env generation (deploy):

- CI deploy workflows generate `.env.dev` and `.env.prod` on EC2 from GitHub Secrets
- These files include the profile-specific required lists so runtime env-guard checks pass:
  - `DEV_REQUIRED_ENVIRONMENT_VARIABLES`
  - `PROD_REQUIRED_ENVIRONMENT_VARIABLES`
- No secrets are stored in the repo; Docker images don’t bake secrets (BuildKit secret mounts are used during builds)

### 🛠️ Developer Experience & Testing

- Monorepo with strict TypeScript (frontend and backend)
- Unified ESLint configurations
- Playwright E2E and Vitest setup (backend)
- Local dev proxy and hot-reload compose profile
- **JSON5 Package Sync System** - Dual package.json approach
  - `package.json` - Standard JSON for tooling compatibility
  - `package.json5` - Enhanced version with comments and documentation
  - Bidirectional sync via `npm run sync:json5`
  - Preserves comments and formatting in JSON5 files

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
- Cloud/IaC: AWS (EC2, S3, ECR, IAM, SES, Route 53, ACM), Terraform

<!-- Roadmap moved toward the end for better flow -->

## Infrastructure & Deployment

High‑level AWS/IaC overview. For orchestrated deploy internals, command flows, and safety guarantees, see the earlier **Deployment Orchestrator & Infrastructure Automation** section plus the **Deployment conveniences catalog**.

### ⚙️ Architecture Overview

- Cloud Provider: Amazon Web Services (AWS)
- Infrastructure as Code: Terraform (automated provisioning/teardown)
- Compute: EC2 t3.medium (automated configuration via user_data)
- Reverse Proxy: Caddy or Nginx (configs and compose profiles included)
- Containerization: Docker with dual registry strategy (Docker Hub + ECR)
- Storage: S3 buckets for media assets with environment isolation
- Networking: Elastic IP (44.246.43.116), Security Groups, VPC integration
- Domain & DNS: Custom domains (bbaysinger.com primary) with Route 53 hosted zones
- TLS: AWS Certificate Manager (ACM) with DNS validation via Route 53

### 🚀 Deployment Process (Terraform Core)

Provision / destroy core infrastructure using Terraform:

```bash
cd infra/
terraform plan    # Preview changes
terraform apply   # Create/update AWS resources
terraform destroy # Full teardown (guarded)
```

Runtime & orchestration lifecycle (summary):

1. Terraform ensures EC2, IAM, S3, ECR, Route 53, SES, etc. exist & are current.
2. EC2 user_data bootstraps Docker + proxy services.
3. GitHub workflow (invoked by orchestrator) regenerates `.env.dev` / `.env.prod` from secrets → containers restart.
4. Systemd maintains uptime & restarts; image sources differ by profile (Docker Hub dev vs ECR prod).
5. Post‑deploy health checks validate backend/API and media routing.

Smoke check examples:

```bash
curl -fsSL http://localhost:3001/api/health/   # expect 200
curl -fsSL 'http://localhost:3000/api/projects/?limit=3&depth=0' | jq '.docs | length'
```

If env guards fail (missing required variables) re‑run orchestrator with `--refresh-env` (see section above) to regenerate host env files.

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
- Container orchestration with Docker and systemd
- Automated deployment workflows
- System reliability with auto-restart and health monitoring

### 📚 Documentation

For deep dives and implementation details:

- Engineering Standards: [`/docs/engineering-standards.md`](./docs/engineering-standards.md)
- Architecture Decisions: [`/docs/architecture-decisions.md`](./docs/architecture-decisions.md)
- S3 Project Buckets Guide: [`/docs/s3-bucket-migration.md`](./docs/s3-bucket-migration.md)
- Fluid Responsive System: [`/docs/fluid-responsive-system.md`](./docs/fluid-responsive-system.md)
- Uploads & Migration: [`/docs/uploads-and-migration.md`](./docs/uploads-and-migration.md)
- SES Email Setup: [`/docs/aws-ses-setup.md`](./docs/aws-ses-setup.md)
- Ports & Services: [`/docs/ports.md`](./docs/ports.md)
- Infrastructure Guide: [`/infra/README.md`](./infra/README.md)
- Deployment Instructions: [`/deploy/DEPLOYMENT.md`](./deploy/DEPLOYMENT.md)
- Deployment Orchestrator: [`/docs/deployment-orchestrator.md`](./docs/deployment-orchestrator.md)

## Roadmap

- Additional polish, accessibility, and performance passes as time allows
- Make the hero animation more game-like
  - Still exploring rendering capabilities to know just how much I can get out of it
  - But it will become more than just a fidget spinner
- Most of the notable features will become their own portable repos
- Filterable Project Tags/Categories
- Interactive tutorials for the kinetic orb (vs current arrow/tooltips) and carousel
- Walkthrough videos playable within the project carousel
- Project upkeep: framework/library upgrades across showcased projects
- Global light/dark mode preferences via Redux
- Fluxels should be implemented in WebGL and/or PixiJS shaders
- Implement testing frameworks (once experiments have matured)
- Capture and store data about user interactions
- Accessibility should be improved with respect to ARIA, rem font scaling, etc.
- Remove Bootstrap (Not relying on it much anyhow)
- Header animations will be in response to user interactions vs just a timer

Note: Earlier plans for “custom Express/Mongo backend” were superseded by the fully integrated Payload CMS backend present in this repo.

---

Updated EC2 IP: 44.246.43.116

Last major: Mon Nov 8, 2025
