# Interactive UI/Frontend Developer Portfolio Website

A modern portfolio website featuring custom interactive components built with React, TypeScript, Next.js, and Payload CMS. The site includes a parallax project carousel, animated sprite system, and responsive design components. All animations and visual effects are implemented using native web technologies without external 3D, physics, or sprite sheet animation libraries.

The deployment pipeline uses Terraform for infrastructure provisioning, Docker for containerization, and GitHub Actions for CI/CD. The system supports multiple environments (dev/prod) with separate container registries and S3 storage buckets.

[Visit the Live Site](https://bbinteractive.io)

### 🎨 Frontend UX & Interaction

- Parallax Project Carousel with swipe navigation and deep linking
- Animated grid system with simulated 3D depth effects
- Interactive kinetic orb with physics-based movement
- Sprite sheet renderer supporting CSS, Canvas, and WebGL
- Fluid responsive design system with CSS scaling variables
- Animation sequencer for sprite-based effects
- Mobile-optimized slide-out navigation
- Interactive footer and scroll-aware navigation highlighting
- Device mockup overlays with tilt effects
- Mobile-first responsive design approach

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
- Rich project metadata (brand, tags, role, year, awards, urls)
- Image collections for screenshots, thumbnails, brand logos
- Image processing via Sharp (server-side resizing) with 2 MB upload limit

### 💾 Storage & Media Pipeline

- S3-backed media storage with per-collection prefixes
- Instance-role support with optional static credentials
- Media migration/verification scripts
  - migrate media to S3, update media URLs, rebuild records
- Local filesystem storage for local profile

#### Project files (S3 + gated delivery)

- Separate from Payload media, static project files are stored in two dedicated S3 buckets:
  - Public: `bb-portfolio-projects-public`
  - NDA-protected: `bb-portfolio-projects-nda`
- Delivery is via application API routes:
  - Public files: `/api/projects/public/*` → public bucket
  - Private/NDA files: `/api/projects/private/*` → NDA bucket (requires authenticated session)
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

- Automated (re)deployment orchestrator script
  - Destroys and rebuilds/pushes the entire EC2 and containers
  - Builtin Safety checks
  - Avoids destroying items meant to persist
- Terraform IaC: one-command provision/teardown
- Systemd-managed Docker services on EC2 (auto-restart)
- Dual registry strategy (Docker Hub dev, ECR prod)
- Secure Docker builds (BuildKit secret mounts, minimal args)
- Generated env files on host via CI/CD (no secrets in repo)
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

This portfolio is deployed using Infrastructure as Code with Terraform and Docker on AWS.

### ⚙️ Architecture Overview

- Cloud Provider: Amazon Web Services (AWS)
- Infrastructure as Code: Terraform (automated provisioning/teardown)
- Compute: EC2 t3.medium (automated configuration via user_data)
- Reverse Proxy: Caddy or Nginx (configs and compose profiles included)
- Containerization: Docker with dual registry strategy (Docker Hub + ECR)
- Storage: S3 buckets for media assets with environment isolation
- Networking: Elastic IP (44.246.43.116), Security Groups, VPC integration
- Domain & DNS: Custom domain (bbinteractive.io) with Route 53 hosted zone
- TLS: AWS Certificate Manager (ACM) with DNS validation via Route 53

### 🚀 Deployment Process

Provision/destroy the infrastructure with Terraform:

```bash
# Deploy complete infrastructure
cd infra/
terraform plan    # Review changes
terraform apply   # Deploy infrastructure (creates many AWS resources)

# Destroy infrastructure
terraform destroy # Clean teardown of all resources
```

Orchestrated deploys (recommended):

```bash
# Read-only discovery / plan
deploy/scripts/deployment-orchestrator.sh --discover-only
deploy/scripts/deployment-orchestrator.sh --plan-only

# Redeploy prod (uses GitHub Actions, regenerates env files on EC2)
deploy/scripts/deployment-orchestrator.sh --profiles prod --refresh-env

# Redeploy both prod and dev, no image rebuilds
deploy/scripts/deployment-orchestrator.sh --no-build --profiles both --refresh-env
```

What the orchestrator does:

- Triggers the reusable Redeploy workflow to generate runtime `.env.*` files on EC2 from GitHub Secrets and restart containers
- Ensures backend env files include SECURITY_TXT_EXPIRES and the per-profile required lists so the env-guard passes
- Falls back to a safe SSH path if the workflow dispatch fails (mirrors env generation behavior)
- Never stores secrets in the repo or bakes them into Docker images

What happens during deployment:

1. AWS resources are created (EC2, Elastic IP, Security Groups, IAM roles, S3, ECR)
2. Automated configuration installs Docker and application services via user_data
3. Containers are started (dev from Docker Hub, prod from ECR)
4. Systemd services provide auto-restart and boot persistence
5. Route 53 A/ALIAS records point the domain to the Elastic IP (or load balancer in future scaling)

Post-deploy smoke checks (via SSH on EC2):

```bash
curl -fsSL http://localhost:3001/api/health/   # backend 200
curl -fsSL 'http://localhost:3000/api/projects/?limit=3&depth=0' | jq '.docs | length'
```

If backend logs show "Missing required environment variables", rerun a redeploy with `--refresh-env` to regenerate `.env.prod`/`.env.dev` on EC2.

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
- Fluxels should be implemented in WebGl and/or Pixi shaders
- Implement Testing Frameworks (once experiments have matured)
- Capture and Store Data about user interactions
- Accessability should be improved with respect to ARIA, rem font scaling, etc...
- Remove Bootstrap (Not relying on it much anyhow)
- Header animations will be in response to user interactions vs just a timer

Note: Earlier plans for “custom Express/Mongo backend” were superseded by the fully integrated Payload CMS backend present in this repo.

---

Updated EC2 IP: 44.246.43.116

Last updated: Tue Oct 29, 2025
