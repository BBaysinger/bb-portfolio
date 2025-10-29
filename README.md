# Portfolio Website

This portfolio showcases a fully custom interactive environment—built entirely without any 3D or physics frameworks. Every animated and spatial element is hand-engineered in JavaScript, React, and CSS. The parallaxing carousel, kinetic orb, and sheet animator are all original systems, including a sprite sheet engine developed from scratch for CSS, Canvas, and WebGL rendering. The “Fluxel” grid—a field of independently animated React components—simulates 3D depth purely through math-driven shadow manipulation, turning flat 8-bit pixels into a living, responsive surface. There's more that can be done with it...

Deployments are orchestrated via a single script that provisions/updates AWS with Terraform (EC2, security group, Elastic IP, S3 media buckets, and ECR), optionally builds and pushes images (Docker Hub for dev, ECR for prod), syncs secrets to GitHub, and then triggers a “Redeploy” GitHub Actions workflow to generate .env files on the instance and restart the correct Docker Compose profiles (prod and/or dev). At runtime an Nginx reverse proxy on the host fronts four Node containers (frontend/backend for prod and dev), the app reads environment-scoped settings and uses per-environment S3 buckets (with instance role/credentials) for media.

[Visit the Live Site](https://bbinteractive.io)

### Frontend UX & Interaction

- Parallax Project Carousel (layered/synced, expandable, native swipe, deep linking)
- Simulated-Depth Magnetic “Fluxel” (fluxing pixel) Grid System
- Custom Physics Kinetic Orb
- Custom Sprite Sheet Renderer w/ CSS, canvas, and WebGL rendering options
- Fluid Responsive System
  - JavaScript Global CSS Scaling Variable insertion
  - rem-based fluid scaling property SASS mixin
  - static fluid scaling property SASS mixin
- Weighted Random Animation Sequencer using the sprite sheet renderer
- Page Slide-Out Mobile Navigation
- Transform-Positioned Footer
- Scroll-Aware Project List Highlighting
- Teletype Paragraph Animation Effect
- Magnetic/Sticky Animated DOM Elements
- Scroll-Aware Page Anchor Link Highlighting
- Device Mockup Overlays (tilt/stabilization states)
- Strict Mobile-First Methodology and Progressive Enhancement on every layer
- Logo/Info Swapper Animations tied to active slide

### CMS, Data Modeling & Rendering

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

### Storage & Media Pipeline

- S3-backed media storage with per-collection prefixes
- Instance-role support with optional static credentials
- Media migration/verification scripts
  - migrate media to S3, update media URLs, rebuild records
- Local filesystem storage for local profile

### API & Security

- Env-profile guardrails (fail-fast config validation)
- Locked-down CSRF/CORS allowlists per environment
- Role-based access control for admin-only mutations
- Health-check endpoint for uptime/deploy validation
- Contact API via AWS SES (see `docs/aws-ses-setup.md`)

### DevOps & Deployment

- Automated (re)deployment orchestrator script
  - Destroys and rebuilds/pushes the entire EC2 and containers
  - Builtin Safety checks
  - Avoids destroying items meant to persist
- Terraform IaC: one-command provision/teardown
- Systemd-managed Docker services on EC2 (auto-restart)
- Dual registry strategy (Docker Hub dev, ECR prod)
- Secure Docker builds (BuildKit secret mounts, minimal args)
- Generated env files on host via CI/CD (no secrets in repo)
- Github Secrets Synchronization from JSON5 via custom shell script
- Reverse proxy options: Caddy or Nginx (compose/configs provided)
- Compose profiles for local/dev/prod and proxy-only

### Developer Experience & Testing

- Monorepo with strict TypeScript (frontend and backend)
- Unified ESLint configurations
- Playwright E2E and Vitest setup (backend)
- Local dev proxy and hot-reload compose profile
- JSON5 Package Sync Script (`sync:json5`)
  - Serves to document packages via JSON5
  - Automated: `npm run sync:json5` (see scripts/sync-json5-packages.ts)

### Data Ops & Backups

- JSON dumps for seed data and repeatable imports
- Automated database backups with dated folders

### Image Processing

- Custom Sprite Sheet Animation Processing Scripts
  - In a separate repo: [github.com/BBaysinger/fluxel-animations](https://github.com/BBaysinger/fluxel-animations)

## Technologies Used

- Frontend: Next.js, React, TypeScript, SCSS Modules
- Backend: Payload CMS (Next.js runtime), TypeScript
- State: Redux Toolkit (frontend auth/session), React hooks
- Testing: Playwright, Vitest
- Tooling: ESLint, Prettier, Docker, Node.js
- Cloud/IaC: AWS (EC2, S3, ECR, IAM, SES), Terraform

## Roadmap

- Make the hero animation more game-like
  - Still exploring rendering capabilities to know just how much I can get out of it
  - But it will become more than just a fidget spinner
- Most of the notable features will become their own portable repos
- Filterable Project Tags/Categories
- Interactive tutorials for the kinetic orb (vs current arrow/tooltips) and carousel
- Walkthrough videos playable within the project carousel
- Project upkeep: framework/library upgrades across showcased projects
- Additional polish and performance passes as time allows
- Global light/dark mode preferences via Redux
- Fluxels should be implemented in WebGl and/or Pixi shaders
- Implement Testing Frameworks implemented (once experiments have matured)
- Capture and Store Data about user interactions
- Accessability should be improved with respect to ARIA, rem font scaling, etc...
- Remove Bootstrap (Not relying on it much anyhow)

Note: Earlier plans for “custom Express/Mongo backend” were superseded by the fully integrated Payload CMS backend present in this repo.

## Infrastructure & Deployment

This portfolio is deployed using **Infrastructure as Code** with Terraform and a Docker-based runtime on AWS, demonstrating professional DevOps practices.

### 🏗️ Architecture Overview

- Cloud Provider: Amazon Web Services (AWS)
- Infrastructure as Code: Terraform (automated provisioning/teardown)
- Compute: EC2 t3.medium (automated configuration via user_data)
- Reverse Proxy: Caddy or Nginx (configs and compose profiles included)
- Containerization: Docker with dual registry strategy (Docker Hub + ECR)
- Storage: S3 buckets for media assets with environment isolation
- Networking: Elastic IP (44.246.43.116), Security Groups, VPC integration
- Domain: Custom domain (bbinteractive.io) with DNS management

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

What happens during deployment:

1. AWS resources are created (EC2, Elastic IP, Security Groups, IAM roles, S3, ECR)
2. Automated configuration installs Docker and application services via user_data
3. Containers are started (dev from Docker Hub, prod from ECR)
4. Systemd services provide auto-restart and boot persistence
5. DNS A records point the domain to the Elastic IP

### 🔄 Container Management

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

- Zero manual configuration: Terraform + user_data configure hosts
- Auto-healing: systemd restarts containers on failure
- Environment isolation: S3 buckets and configs per env
- Security: IAM least-privilege, encrypted storage, security groups
- Scalability-ready: LB/ASG/CDN can be added when needed
- Cost-optimized: right-sized resources and lifecycle policies

### 📊 Infrastructure Validation

Demonstrates:

- IaC (Infrastructure as Code) with Terraform
- Container orchestration with Docker + systemd
- Cloud architecture design and automation
- Professional deployment workflows and documentation
- System reliability through auto-restart and health checks

### 📚 Documentation

For deep dives and implementation details:

- Architecture Decisions: [`/docs/architecture-decisions.md`](./docs/architecture-decisions.md)
- Fluid Responsive System: [`/docs/fluid-responsive-system.md`](./docs/fluid-responsive-system.md)
- Uploads & Migration: [`/docs/uploads-and-migration.md`](./docs/uploads-and-migration.md)
- SES Email Setup: [`/docs/aws-ses-setup.md`](./docs/aws-ses-setup.md)
- Ports & Services: [`/docs/ports.md`](./docs/ports.md)
- Infrastructure Guide: [`/infra/README.md`](./infra/README.md)
- Deployment Instructions: [`/deploy/DEPLOYMENT.md`](./deploy/DEPLOYMENT.md)

---

Updated EC2 IP: 44.246.43.116

Last updated: Tue Oct 21, 2025
