# Portfolio Website

[Visit the Live Site](https://bbinteractive.io)

## Features (categorized)

This section consolidates the feature list from `docs/main-features-list.md` and current implementation, grouped logically and deduplicated. Each item has its own heading for discoverability.

### Frontend UX & Interaction

- Parallax Project Carousel (layered, native swipe, deep linking)
- Device Mockup Overlays (tilt/stabilization states)
- Simulated-Depth Magnetic “Fluxel” Grid System
- Custom Sprite Rendering w/ CSS, canvas, and WebGL rendering options
- Magnetic/Sticky Road Sign
- Custom Physics Kinetic Orb
- Page Slide-Out Mobile Navigation
- Transform-Positioned Footer
- Logo/Info Swapper Animations tied to active slide
- Scroll-Aware Project List Highlighting
- Teletype Paragraph Animation Effect
- Fluid Responsive System
  - rem-based fluid scaling property mixin
  - static fluid scaling property mixin

### CMS, Data Modeling & Rendering

- Payload CMS Backend (type-safe with generated types)
- SSR portfolio projects list (Next.js)
- SSG dynamic routing projects view (Next.js)
- Automatic slug generation and sortable index
- NDA-aware content filtering/sanitization
- Rich project metadata (brand, tags, role, year, awards, urls)
- Image collections for screenshots, thumbnails, brand logos
- Image processing via Sharp (server-side resizing) with 2 MB upload limit
- Sprite sheet image processing scripts

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

- Automated (re)deployment orchestrator
- Terraform IaC: one-command provision/teardown
- Systemd-managed Docker services on EC2 (auto-restart)
- Dual registry strategy (Docker Hub dev, ECR prod)
- Secure Docker builds (BuildKit secret mounts, minimal args)
- Generated env files on host via CI/CD (no secrets in repo)
- Reverse proxy options: Caddy or Nginx (compose/configs provided)
- Compose profiles for local/dev/prod and proxy-only

### Developer Experience & Testing

- Monorepo with strict TypeScript (frontend and backend)
- Unified ESLint configurations
- Playwright E2E and Vitest setup (backend)
- Local dev proxy and hot-reload compose profile
- JSON5 Package Sync Script (`sync:json5`)
  - Synchronizes `package.json5` files with canonical `package.json` keys
  - Preserves all comments from `.json5` for matching keys, regardless of order
  - Removes comments for keys not present in `package.json`
  - Usage: `npm run sync:json5` (see scripts/sync-json5-packages.ts)

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

- Quick tutorials for the kinetic orb and carousel
- Walkthrough videos playable within the project carousel
- Project upkeep: framework/library upgrades across showcased projects
- Additional polish and performance passes as time allows
- Global light/dark mode preferences via Redux

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
- Networking: Elastic IP (54.70.138.1), Security Groups, VPC integration
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

- Development: Docker Hub images (`bhbaysinger/portfolio-*:dev`)
- Production: Amazon ECR images (`*.dkr.ecr.us-west-2.amazonaws.com/bb-portfolio-*:latest`)

Helper scripts (from `infra/portfolio-management.sh`):

```bash
# Switch between environments
./portfolio-management.sh switch dev   # Use Docker Hub images
./portfolio-management.sh switch prod  # Use ECR images
./portfolio-management.sh status       # Check container health
./portfolio-management.sh deploy       # Deploy from ECR
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

- IaC mastery with Terraform
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

Updated EC2 IP: 54.70.138.1

Last updated: Sun Oct 19, 2025
