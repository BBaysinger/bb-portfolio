# Architecture Decisions Log

> See also: [Engineering Standards](./engineering-standards.md) for the conventions and guardrails referenced by these decisions.

This file records major technical decisions for the portfolio project.  
Each entry includes the date, decision, reasoning, alternatives, and current status.  
New decisions should be appended chronologically.

## 2025-12-28 – Turbopack Re-Enabled for Frontend Development

- **Decision:**
  - Frontend: Use the default `next dev` bundler behavior (Turbopack-enabled in Next 16.x) for local development.
  - Frontend production builds remain webpack (`next build --webpack`).
  - Backend production builds remain webpack (`next build --webpack`) due to Payload CMS.

- **Reasoning:**
  - Development performance benefits from Turbopack.
  - Production constraints remain unchanged (webpack required for backend/Payload; frontend builds kept deterministic).

- **Operational notes:**
  - If you need to reproduce a webpack-only dev issue, run the frontend dev server with `next dev --webpack`.

- **Status:** ✅ Active

## 2025-11-27 – Backend Runtime Hardening (Distroless) + Next 16 Standalone Entrypoint

- **Decision:**
  - Run the backend on a hardened, non-root distroless image: `gcr.io/distroless/nodejs22-debian12`.
  - Build the backend with Next.js 16 using webpack only (`next build --webpack`) and run the emitted standalone server directly via a tiny bootstrap (`bootstrap.cjs`).
  - Avoid Turbopack entirely in production (Payload CMS does not support it).
  - Use the exact entrypoint from the standalone output after copy: `require('/app/app/server.js')`.
  - Keep healthcheck path consistent with trailing slashes: `/api/health/`.

- **Reasoning:**
  - Reduce critical/high vulnerability findings (CHV warnings) by eliminating package managers/shells and shrinking the attack surface.
  - Distroless images materially lower CVE noise in scanners and align with least-privilege principles.
  - Next 16 + Payload CMS requires webpack for production; programmatic `next()` at runtime risks invoking Turbopack or runtime compilation paths.
  - Directly starting the built server from the standalone bundle is deterministic and works in shell-less environments.

- **Implementation:**
  - Dockerfile (backend):
    - Builder stage (node:22-alpine) performs `npm ci`, `next build --webpack`, and prunes dev deps.
    - Generates `bootstrap.cjs` via `printf` (no heredoc parse issues) and copies runtime assets:
      - Copy `.next/standalone` → `/app` (so the server lives at `/app/app/server.js`).
      - Copy `.next/static` and `.next/server` for completeness.
      - Copy `public/`.
    - Runtime stage: `FROM gcr.io/distroless/nodejs22-debian12` with `CMD ["./bootstrap.cjs"]` (Node is the entrypoint in distroless).
  - Bootstrap behavior:
    - Minimal CommonJS file that does `require('/app/app/server.js')` and exits with an explicit error if unavailable.
  - Next config (backend `next.config.mjs`):
    - `output: 'standalone'`, `trailingSlash: true`, `assetPrefix: '/admin'`.
  - Health checks (Compose):
    - HTTP probe on `http://localhost:3000/api/health/` (note the trailing slash to avoid 308 redirects).
  - Secrets and envs:
    - Build secrets mounted via BuildKit (never baked into layers).
    - Runtime envs provided by Compose/orchestrator; no `.env` files are copied into images.

- **Alternatives considered:**
  - `node:22-slim` hardened with OS patching: still higher CVE surface and retains a shell/package manager.
  - Programmatic `next()` HTTP server: can trigger Turbopack/runtime compilation in production, conflicts with Payload.
  - Rely on `.next/standalone/server.js` at root: Next 16 App Router outputs server at `.next/standalone/app/server.js` (copied to `/app/app/server.js`), so hardcoding root `server.js` is brittle.
  - Alpine-based runtime: not available for distroless; debugging ergonomics are worse without added benefits over Debian-based distroless for Node 22.

- **Operational notes:**
  - Distroless has no shell; debugging inside the runtime container is limited. Use the builder image for inspection:
    - `docker run --rm -it bb-backend-builder:dev sh -lc "node ./bootstrap.cjs"` to verify the built server starts.
  - Trailing slash: use `/api/health/` to avoid 308s due to `trailingSlash: true`.
  - Ensure required runtime envs (MongoDB URI, Payload secret, etc.) are present; the app enforces required-env groups at startup.

- **Status:** ✅ Active

## 2025-11-25 – Next.js Bundler Strategy: Webpack for Frontend; Webpack for Backend Prod

- **Decision:**
  - Frontend (at the time): Use webpack in development and production (`next dev --webpack`, `next build --webpack`).
  - Backend: Use webpack for production builds (`next build --webpack`); dev remains default (`next dev`) which may use Turbopack depending on Next.js version.
- **Reasoning:**
  - AWS RUM instrumentation depends on webpack’s mature plugin/loader ecosystem and predictable asset pipeline; Turbopack caused instrumentation issues in dev.
  - Payload CMS explicitly does not support Turbopack for production; Next 16 requires `next build --webpack` to build successfully.
  - Webpack provides deterministic builds and well-supported tooling (source maps, bundle analysis) aiding performance and RUM diagnostics.
- **Implementation:**
  - Frontend dev was forced to webpack via `next dev --webpack`.
  - `backend/package.json`: `build` updated to `next build --webpack` to satisfy Payload on Next 16.
  - Local proxy (`caddy:up`) verified: frontend runs Next 16.x.x (webpack) on port 3000; backend container healthy.
- **Alternatives considered:**
  - Adopt Turbopack across dev/prod with custom config: deferred until Payload supports it in production and AWS RUM integration is validated.
  - Hybrid approach with per-route bundling: unnecessary complexity for current stack.
- **Status:** ⚠️ Superseded
  - Superseded by: **2025-12-28 – Turbopack Re-Enabled for Frontend Development**.

## 2025-11-07 – Production HTTPS Enablement (Certbot) and Domain Hygiene

- **Decision:** Enable HTTPS on EC2 using Certbot (nginx plugin) and wire ACME contact email via orchestrator. Clean up domain list used for certificate issuance (remove invalid/non-existent hosts).
- **Reasoning:** Provide TLS for bbaysinger.com with automated issuance/renewal; avoid broken SANs caused by stale domains (e.g., `www.dev.bbaysinger.com`).
- **Implementation:**
  - Certbot installed on EC2; certificates issued for apex + www where applicable.
  - Orchestrator and docs updated to include ACME email and the authoritative list of domains.
  - Redirects validated and renewal scheduled.
- **Alternatives considered:** ACM/ALB or CloudFront-managed certs (heavier AWS footprint); Caddy-only termination (local use retained, production standardized on nginx).
- **Status:** ✅ Active

---

## 2025-11-07 – Single-Host per Environment and Canonicalization

- **Decision:** Each environment is served from exactly one host on `bbaysinger.com` (no concurrent multi-domain serving). Logout/auth logic is simplified accordingly; future enforcement via nginx canonical redirect (e.g., `www → apex`) and HSTS.
- **Reasoning:** Multi-domain cookies were the root cause of “logout didn’t actually log me out” behavior. A single canonical host eliminates cross-domain cookie seams and simplifies session handling.
- **Implementation:**
  - Backend logout route emits a single Set-Cookie expiration per auth cookie (Path=/, HttpOnly, SameSite=Lax, Secure in prod, Expires + Max-Age=0).
  - Frontend logout proxy now forwards backend Set-Cookie; manual multi-domain fallbacks removed.
  - Plan: add nginx 301 canonical host redirects and enable HSTS once traffic is fully stable.
- **Alternatives considered:** Keep multi-variant cookie expiration for apex + host (kept temporarily during transition; now removed for clarity and lowest risk).
- **Status:** ✅ Active

---

## 2025-11-07 – Auth State and Logout Hardening

- **Decision:** Make authentication state deterministic and cache-proof on both client and server.
- **Reasoning:** UI showed “Logout” when logged out; admin/NDA content occasionally remained visible post-logout due to stale checks and cookies not being cleared in all scopes.
- **Implementation:**
  - `/frontend/src/app/api/users/me` returns 401 unless the user object includes a clear identity (id/email). Added explicit `Cache-Control: no-store`/`Pragma`/`Expires`.
  - Redux only sets logged-in when identity is present. AppShell triggers auth re-check on window focus/visibility and runs a periodic lightweight validation.
  - Logout: server route in the backend issues proper cookie clearing; frontend proxy forwards Set-Cookie and disables caching. Router refresh invoked post-logout.
- **Alternatives considered:** Heuristics that infer auth from ambiguous backend responses (rejected); client-only polling for all privileged visibility (too brittle).
- **Status:** ✅ Active

---

## 2025-11-07 – Server-Driven NDA Gating (Flicker-Free)

- **Decision:** Enforce NDA visibility on the server and remove client-side re-fetch heuristics that caused flicker or stale exposure.
- **Reasoning:** Client re-init after login/logout could briefly show incorrect NDA states; SSR is the source of truth and can honor HttpOnly cookies.
- **Implementation:**
  - ProjectData server fetches forced `no-store` to avoid leaking NDA content from cached responses.
  - SSR uses backend base URL; forwards `Cookie` and `Authorization` JWT when present.
  - Login uses `router.replace('/')` + `router.refresh()`; logout triggers `router.refresh()` to re-evaluate gated content.
- **Alternatives considered:** Continue mixed client/server gating (led to flicker and complex race handling).
- **Status:** ✅ Active (supersedes prior temporary client heuristics)

---

## 2025-11-07 – Local Dev Reliability (Caddy + Disk Guard)

- **Decision:** Relax local container disk guard thresholds and limit checks to `/tmp` for dev images to prevent crash loops that blocked Caddy on port 8080.
- **Reasoning:** Containers were restart-looping (exit 70) due to aggressive disk usage checks; this prevented `caddy:up` from serving locally.
- **Implementation:** Adjusted compose env to raise warn/fail thresholds and scope checks to `/tmp` for the local profile.
- **Alternatives considered:** Disable disk guard entirely (too risky); increase host disk space (unnecessary for local).
- **Status:** ✅ Active

---

## 2025-11-07 – CI/CD Redeploy Workflow: docker compose v2 Migration

- **Decision:** Migrate redeploy workflows to `docker compose v2`, set `COMPOSE_PROJECT_NAME`, and replace brittle container removal with per-profile `down --remove-orphans` before `up`.
- **Reasoning:** Stabilizes CI/CD redeploys, avoids hard-coded container names, and aligns with modern Docker tooling.
- **Implementation:** Updated workflows; added diagnostics and ensured profiles are isolated.
- **Alternatives considered:** Keep deprecated `docker-compose` CLI; manual container removal (fragile).
- **Status:** ✅ Active

---

## 📌 Template for new entries

**Date:** YYYY-MM-DD – _Topic_

- **Decision:** …
- **Reasoning:** …
- **Alternatives considered:** …
- **Status:** Active / Superseded

---

## 2025-11-02 – GitHub Secrets Sync Strategy & Env-Guard Enforcement

**Decision:** Manage GitHub Actions secrets from JSON5 with a TypeScript sync tool that validates required environment variable lists before syncing. Generate runtime `.env` files on EC2 during deploy, including the split required lists to satisfy startup guards.

**Components:**

- JSON5 secrets files at repo root:
  - `.github-secrets.example.json5` (shared/base schema; committed)
  - `.github-secrets.private.json5` (shared/base real values; gitignored)
  - `.github-secrets.private.<env>.json5` (per-environment overrides; gitignored)
- Sync tool: `scripts/sync-github-secrets.ts`
  - Overlays matching keys from the `.private` file onto the template schema (extras in private are ignored to keep the schema authoritative)
  - Validates `REQUIRED_ENVIRONMENT_VARIABLES_FRONTEND` and `REQUIRED_ENVIRONMENT_VARIABLES_BACKEND` prior to any writes (comma-separated groups; use `|` within a group to indicate ANY-of)
  - Fails fast with a clear error if any group lacks at least one key present in the JSON5. Escape hatch: `ALLOW_MISSING_REQUIRED_GROUPS=true` (warns, does not fail) for exceptional cases.
- Deploy workflows (`.github/workflows/redeploy*.yml`)
  - Generate backend/frontend `.env.dev` and `.env.prod` files on EC2 from GitHub Secrets
  - Include the split required lists so the runtime env-guard never boots without a definition

**Reasoning:**

- Centralize secrets management with a human-readable, commented format (JSON5)
- Eliminate repo-stored secrets while keeping a documented template under version control
- Prevent “works on my machine” and prod boot issues by enforcing required-lists integrity before syncing
- Ensure deploys are reproducible and safe: runtime envs are generated on the host, not committed; images never bake secrets

**Alternatives considered:**

- Manual GH Secrets management (error-prone; no validation)
- Store `.env` files in repo or AMI (security risk; not portable)
- CI-only validation (too late; we want to stop bad inputs before secrets are mutated)

**Status:** ✅ Active

---

## 2025-09-14 – Database

**Decision:** Use **MongoDB Atlas (cloud-managed MongoDB)**

**Reasoning:**

- Avoid operational overhead of running a database on EC2
- Free/low-tier Atlas is sufficient for project scale
- Provides automatic backups and scaling without extra configuration

**Alternatives considered:**

- **Postgres in Docker on EC2**: Would require persistence management (EBS volumes), more setup, higher memory use
- **Self-hosted Mongo in Docker**: More maintenance, less reliable

**Status:** ✅ Active

---

## 2025-11-02 – Project Files on S3 and NDA Gated Delivery

**Decision:** Store static project files in dedicated S3 buckets and deliver them via API routes that enforce access level (public vs NDA), separate from Payload CMS media.

**Architecture:**

- Four-bucket model (see “S3 Bucket Structure Guide” for full details):
  - Media (managed by Payload uploads): `bb-portfolio-media-dev`, `bb-portfolio-media-prod`
  - Project files (static): `bb-portfolio-projects-public`, `bb-portfolio-projects-nda`
- Access control boundary is at the application layer:
  - Public files served under `/api/projects/public/*` → maps to public bucket
  - NDA files served under `/api/projects/private/*` → maps to NDA bucket and requires authenticated session
  - Next.js page routes remain separate: public project pages under `/project/*`, NDA pages under `/nda/*` (noindex, dynamic), avoiding path collisions with the API
- Environment variables (shared schema across profiles):
  - Media: `S3_BUCKET`, `AWS_REGION` (values differ per profile via the secrets overlay)
  - Projects: `PUBLIC_PROJECTS_BUCKET`, `NDA_PROJECTS_BUCKET`

**Reasoning:**

- Clean separation of concerns (CMS media vs static project artifacts)
- Simpler IAM and clearer security posture for NDA artifacts
- Stable URLs and promotion flows independent of Payload media storage

**Implementation references:**

- Scripts: `npm run projects:upload:*`, `npm run projects:verify`
- CI/Deploy: GitHub workflow passes `PUBLIC_PROJECTS_BUCKET`/`NDA_PROJECTS_BUCKET`
- Documentation: `docs/s3-bucket-migration.md` and `docs/uploads-and-migration.md`

**Status:** ✅ Active

---

**Decision:** Manage infrastructure with Terraform + scripted host configuration so environments can be provisioned and recreated predictably.

**Scope:**

- **Terraform IaC**: AWS infrastructure defined as code.
- **EC2 host**: t3.medium configured via `user_data` and host scripts.
- **Elastic IP**: Stable IP for DNS (44.246.43.116).
- **Container runtime**: Docker Compose profiles (dev/prod) managed by systemd.
- **Registries**: Docker Hub for dev images; ECR for prod images.
- **Storage**: Environment-specific S3 buckets (CORS/encryption as required).

**Automation:**

- Provision: `terraform apply`
- Teardown: `terraform destroy`
- Containers restart on failure and start on boot (systemd)
- Management scripts support switching profiles/image sources

**Ops notes:**

- DNS points to the Elastic IP; HTTPS is terminated on-host via Nginx + certbot (see deployment docs).
- Monitoring/alerts can be added incrementally as needed.

**Technical snippet:**

```bash
# Container management (via SSH)
./bb-portfolio-management.sh status
./bb-portfolio-management.sh switch prod
```

**Alternatives considered:**

- **Platform-as-a-Service (Heroku, Vercel)**: Faster setup, less control/infra learning.
- **Manual EC2 setup**: More manual steps and harder to reproduce.
- **Container services (ECS/EKS)**: Higher complexity/cost than needed here.
- **Static hosting (S3/CloudFront)**: Frontend-only; doesn't cover the backend/CMS pieces.

**Status:** ✅ Active

---

## 2025-10-06 – Dual Registry Strategy: Docker Hub + ECR

**Decision:** Implement **dual container registry strategy** using Docker Hub for development and ECR for production.

**Configuration:**

- **Development environment**: Images built and pushed to Docker Hub (`bhbaysinger/bb-portfolio-*:dev`)
- **Production environment**: Images built and pushed to Amazon ECR (`*.dkr.ecr.us-west-2.amazonaws.com/bb-portfolio-*:latest`)
- **CI/CD workflow**: Different registry authentication per environment
- **Cost optimization**: Free Docker Hub public repositories for dev, ECR for production reliability

**Reasoning:**

- **Cost**: Docker Hub free tier works well for dev.
- **Separation**: Keeps dev experiments isolated from prod deployments.
- **AWS integration**: ECR fits the prod path and IAM auth.

**Alternatives considered:**

- **ECR for all environments**: More consistent but higher costs and less registry experience
- **Docker Hub for all environments**: Lower cost but less professional/enterprise experience
- **Single environment setup**: Simpler but misses learning opportunities and cost optimization

**Status:** ✅ Active

---

## 2025-10-06 – CI/CD Health Check Optimization

**Decision:** Implement **environment-aware health check system** with intelligent CI/CD detection.

**Behavior:**

- **CI/CD environments**: Skip health checks entirely with clear messaging (`🏗️ CI/CD environment detected - skipping backend health check`)
- **Local/Runtime environments**: Full health check optimization with bounded retries
- **Build scripts**: Graceful fallback to on-demand generation when backend unavailable

**Technical implementation:**

- Detection via environment variables: `CI`, `GITHUB_ACTIONS`, `BUILD_ID`
- Immediate failure in CI/CD with descriptive error message
- 15 attempts @ 3-second intervals for runtime environments
- Fallback handling in build scripts for graceful degradation

**Reasoning:**

- **Performance**: Eliminates 45+ second timeouts during CI/CD builds
- **Clarity**: Clear messaging prevents debugging confusion ("backend not reachable during image builds")
- **Optimization**: Maintains SSG benefits when backend is available at runtime
- **Reliability**: Ensures CI/CD never hangs waiting for unreachable services
- **User experience**: Faster deployments with better feedback

**Alternatives considered:**

- **Always attempt health checks**: Causes slow CI/CD builds and confusion
- **Never attempt health checks**: Misses static generation optimization opportunities
- **Fixed timeout approach**: Less intelligent and still causes CI/CD delays

**Status:** ✅ Active

---

## 2025-10-06 – Docker Hub Authentication & Secret Management

**Decision:** Integrate **Docker Hub access tokens** into existing automated secret management system.

**Implementation:**

- Added `DOCKER_HUB_USERNAME` and `DOCKER_HUB_ACCESS_TOKEN` to `.github-secrets.private.json5`
- Used the existing `npm run sync:secrets` workflow for GitHub Actions integration
- Used Docker Hub personal access tokens instead of passwords for enhanced security
- Updated CI/CD workflows to authenticate with Docker Hub during dev builds

**Reasoning:**

- **Security**: Access tokens are more secure and revokable than passwords
- **Consistency**: Integrates with established secret management patterns
- **Automation**: Maintains "infrastructure as code" approach to credential management
- **Auditability**: All secrets managed in single configuration file with sync tracking

**Alternatives considered:**

- **Manual GitHub secrets**: More work and breaks established automation patterns
- **Password authentication**: Less secure and not following best practices
- **Environment-specific credentials**: More complex and harder to manage

**Status:** ✅ Active

---

## 2025-11-02 – Image Cleanup and Retention (Docker Hub + ECR)

**Decision:** Adopt an automated image cleanup strategy to retain only the most recent N images per repository and prune the rest.

**Scope:** Applies to both registries used in this project:

- Docker Hub (dev images)
- Amazon ECR (prod images)

**Implementation:**

- Unified orchestrator script: `scripts/image-cleanup.sh` (runs both providers)
- Provider-specific scripts:
  - `scripts/image-cleanup-dockerhub.sh`
  - `scripts/image-cleanup-ecr.sh`
- Verification helper: `scripts/images-verify.sh`
- NPM shortcuts (retain last 3 by default):
  - `npm run images:cleanup:dry-run` – preview deletes, no changes
  - `npm run images:cleanup` – delete older images, keep 3
  - `npm run images:verify` – show Docker Hub tag totals and ECR tagged counts
  - ECR-only variants available: `images:cleanup:ecr[:dry-run]`

**Notes:**

- ECR: `--include-untagged` deletes dangling images; supported and enabled by default in our npm scripts
- Docker Hub: `--include-untagged` is ignored (Docker Hub doesn’t expose untagged images in the same way)
- Default repositories are pre-wired; override via `--repositories` if needed
- Publish step includes a Docker Hub privacy guard; if your plan doesn’t allow private repos, set `DOCKERHUB_ENFORCE_PRIVATE=true` to fail the publish instead of silently pushing public

**Reasoning:**

- Cost and clutter control for registries
- Faster listing and pulls by keeping only the latest artifacts
- Aligns with portfolio scale needs while remaining production-friendly

**Alternatives considered:**

- Manual cleanup in registries (error-prone, easy to forget)
- Registry lifecycle policies only (good for ECR, but we wanted consistent CLI-based control across both providers)

**Status:** ✅ Active

---

## 2025-11-02 – Dockerfile Strategy Hardening & Public Backend URL Removal

**Decision:** Standardize on environment-agnostic Docker images and remove the public backend URL (`NEXT_PUBLIC_BACKEND_URL`) from the codebase and environment configuration. Browser traffic uses a single-origin proxy (`/api`), and server-side calls use internal service DNS or `BACKEND_INTERNAL_URL`.

**Implementation:**

- Dockerfiles
  - Multi-stage builds (builder → runner/runtime) for both frontend and backend.
  - Strict separation of secret handling using Docker BuildKit `--secret` mounts—no secrets are baked into layers or image history.
  - Only non-sensitive configuration is passed via `--build-arg` (e.g., `ENV_PROFILE`, dev-only non-secret flags). Sensitive settings (Mongo, Payload secret, AWS creds, SES emails) are provided at build time via secret mounts for the backend and never persisted in layers.
  - Health checks standardized to app endpoints (HTTP `/api/health`) in compose/deploy tooling.

- Request routing
  - Browser: always uses relative `/api/*` routed by the reverse proxy to the backend service (no public backend URL is needed or exposed).
  - Server-side (SSR/route handlers/build tasks): uses internal service DNS or `BACKEND_INTERNAL_URL` (e.g., `http://bb-portfolio-backend-local:3001` in local/compose), avoiding cross-origin browser paths.

- Environment variables
  - Removed: `NEXT_PUBLIC_BACKEND_URL` (NPBU) from all code paths and `.env*` files.
  - Kept: `BACKEND_INTERNAL_URL` (or profile-specific variants) for server-side use only.

**Reasoning:**

- Security: avoids leaking server addresses to the browser and prevents misconfiguration.
- Simplicity: single-origin app with `/api` proxy removes CORS/CSRF complexity for browser clients.
- Portability: images do not embed secrets and are agnostic to environment; runtime supplies configuration.
- Reliability: internal DNS for server-to-server calls works consistently across local/dev/prod and compose profiles.

**Alternatives considered:**

- Keep `NEXT_PUBLIC_BACKEND_URL` for browser use—rejected due to security risk and duplicative configuration.
- Pass secrets as `--build-arg`—rejected because secrets could leak into layers and image history.

**Status:** ✅ Active

---

## 2025-09-20 – Infrastructure Automation Strategy

---

## 2025-09-14 – Hosting Strategy

**Decision:** Deploy **frontend + backend via Docker Compose on a single EC2 instance**.
**Reasoning:**

- Cheapest always-on option (~$7–15/mo).
- Keeps frontend + backend isolated but still running on the same box.
- Compose already works locally, so deployment pipeline is straightforward.
- Professional-looking: shows containerization, CI/CD, and environment separation.

**Alternatives considered:**

- **ECS Fargate**: More modern/serverless, but ~$30–40/mo always-on (too expensive for year-round personal site).
- **App Runner**: Simpler and handles HTTPS/scaling automatically, but ~$15–20/mo idle cost is higher than EC2.
- **Separate EC2 for frontend and backend**: Cleaner isolation, but doubles costs.
- **S3 + CloudFront for frontend**: Cheaper if site were purely static, but not feasible since we need SSR + API routes.

**Status:** ✅ Active

---

## 2025-09-14 – CI/CD

**Decision:** Use **GitHub Actions** to deploy on push.

- **dev branch** → deploy to `dev` environment on EC2.
- **main branch** → deploy to `prod` environment on EC2.

**Reasoning:**

- Demonstrates real-world CI/CD workflow.
- Easy integration with GitHub repo.
- Keeps deployment automated and repeatable.

**Alternatives considered:**

- Manual SSH + docker-compose up (too manual, not professional).
- Other CI/CD services (CircleCI, GitLab CI): possible, but GitHub Actions is simpler and free.
  **Status:** ✅ Active

---

## 2025-09-14 – Dev Environment Hosting

**Decision:** Host dev and prod environments on the same EC2 instance with different subdomains.

- `dev.bbaysinger.com` → dev containers
- `bbaysinger.com` → prod containers

**Reasoning:**

- Avoids cost of a second EC2 instance (~$7–8/mo)
- Still provides a live dev environment accessible at a separate subdomain
- Keeps deployment consistent with production (same stack)
- Avoids confusion of juggling multiple `.pem` files
- Clearer mental model for deployment pipeline (prod + dev both on one host)

**Alternatives considered:**

- **Separate EC2 instance for dev**: Cleaner isolation, but doubles costs
- **Ephemeral dev envs (Fly.io, Railway, etc.)**: Cheaper, but less consistent with prod
- **Local-only dev**: Fine for personal use, but doesn't provide a shareable dev URL

**Status:** ✅ Active

## 2025-09-16 – Base OS Migration

**Decision:** Use **Debian 12** as the base OS for EC2 instances instead of Ubuntu.

**Reasoning:**

- More stable and lightweight than Ubuntu, with fewer default packages and less bloat
- Security updates are more conservative, reducing risk of sudden package breakage
- Long support cycles make it easier to "set and forget" for a low-maintenance portfolio server
- Strong ecosystem and compatibility with Docker + CI/CD workflows
- Clean baseline that demonstrates deliberate OS choice and knowledge of trade-offs

**Alternatives considered:**

- **Ubuntu 22.04 LTS**: Familiar, widely documented, but slightly heavier and more prone to frequent package churn.
- **Amazon Linux 2023**: Tight AWS integration and security patches, but smaller community and not as general-purpose.
- **Alpine Linux**: Extremely lightweight, but would require extra effort for tooling/packages, and debugging can be harder.

**Status:** ✅ Active

## 2025-09-18 – Dev Deployment Strategy

**Decision:** Keep dev environment rebuilds manual on EC2, with prod automated via CI/CD.

**Reasoning:**

- Keeps CI/CD simple: only `main` triggers full rebuilds and ECR pushes
- Reflects professional separation: prod is automated/stable, dev is flexible/manual

**Alternatives considered:**

- Auto-deploy dev like prod (more complexity/waste for half-finished commits)

**Status:** ✅ Active

---

## 2025-09-18 – Multi-Environment Docker Strategy

**Decision:** Use Docker Compose profiles for environment separation with distinct deployment strategies.

**Reasoning:**

- Single `docker-compose.yml` reduces drift across environments
- Local: volume mounts + hot reload
- Dev (EC2): build on host for remote testing
- Prod: pre-built ECR images for reliable deployments
- Profiles prevent accidental cross-environment interference

**Alternatives considered:** Separate files per env; ad-hoc flags

**Status:** ✅ Active

---

## 2025-11-15 – Blue-Green EIP Handover and Promotion Workflow

- **Decision:** Implement blue-green deployment pattern with automated EIP handover, health checks, and safety confirmations for zero-downtime promotions.

- **Components:**
  - **Candidate/Active instances**: Terraform provisions optional secondary instance (`bb_portfolio_blue`) with separate security group and EIP.
  - **Health check script** (`scripts/eip-handover.sh`):
    - Pre-promotion validation: AWS instance status (2/2 checks), frontend HTTP 200 on :3000, backend HTTP 200 on :3001/api/health
    - Configurable retries (`--max-retries`, `--interval`) with exponential backoff support
    - Promotion defaults to enabled with confirmation prompt (override via `--auto-promote` for CI/CD)
    - `--health-only` flag skips promotion, runs health checks only
    - Post-swap validation with optional rollback (`--rollback-on-fail`)
    - Optional snapshot before swap (`--snapshot-before`)
  - **Security group swapping**: Promoted candidate receives production SG; demoted active receives candidate SG
  - **Role tagging**: Automatic EC2 tag updates (Role=active/previous/candidate)
  - **Orchestrator integration**: `--target candidate` + `--promote` flags trigger full deployment with promotion
  - **GitHub Actions workflow** (`.github/workflows/promote.yml`):
    - Manual trigger with configurable health check parameters
    - Optional immediate previous instance destruction or retention policy pruning
    - Snapshot support and dry-run mode

- **Workflow:**
  1. Deploy to candidate: `deploy/scripts/deployment-orchestrator.sh --target candidate --profiles prod`
  2. Validate candidate health (automatic or manual via `--health-only`)
  3. Promote with confirmation: `scripts/eip-handover.sh --region us-west-2` (prompts "yes/no")
  4. Automated CI/CD: Use `--auto-promote` (implies promote and skips prompt)
  5. Post-promotion: Previous active instance can be retained, pruned via policy, or immediately destroyed

- **Safety features:**
  - Default confirmation prompt prevents accidental promotions
  - Pre-swap health gate prevents promoting unhealthy candidates
  - Post-swap validation with automatic rollback option
  - Dry-run mode shows actions without executing
  - Separate security groups isolate candidate from production traffic during validation

- **Reasoning:**
  - Zero-downtime deployments: Validate candidate fully before promotion
  - Risk mitigation: Rollback capability if post-swap health fails
  - Operator safety: Confirmation prompt prevents mistakes; CI/CD can bypass with explicit flag
  - Audit trail: EC2 tags track promotion history and timestamps
  - Cost optimization: Retention policy allows keeping N previous instances for quick rollback

- **Testing status:** ⚠️ Functional but requires additional validation
  - Core handover mechanics verified in initial testing
  - Edge cases and failure scenarios need more testing
  - Rollback logic validated in happy path; stress testing pending
  - Security group swapping verified manually; automation needs production validation
  - Recommendation: Monitor promotions closely until further testing establishes reliability

- **Alternatives considered:**
  - Rolling updates on single instance: No pre-validation; higher risk of downtime
  - DNS-based blue-green: Slower cutover; cache/TTL complications
  - Load balancer with weighted routing: More complex; higher AWS costs
  - Manual promotion via AWS Console: No automation; error-prone

- **Status:** ✅ Active (requires further testing for production confidence)

---

## 2025-10-19 – Deployment Orchestrator (Terraform + GitHub Actions + SSH Fallback)

- **Decision:** Adopt a single orchestrator script `deploy/scripts/deployment-orchestrator.sh` as the source of truth for provisioning/updating EC2 infrastructure, optionally building/publishing images, and triggering container (re)starts via GitHub Actions with an SSH fallback.

- **Context / Architecture:**
  - Orchestrator responsibilities:
    - Runs Terraform (init/plan/apply) to create/update the EC2 instance and supporting resources.
    - Automatically builds and pushes images to registries (always executed to ensure consistency):
      - Production → Amazon ECR (with AWS_PROFILE=bb-portfolio-user)
      - Development → Docker Hub
    - Dispatches the reusable "Redeploy" GitHub Actions workflow to generate runtime `.env.*` files on EC2 from GitHub Secrets and to (re)start containers.
    - Provides a safe SSH-based fallback to upload env files and restart Docker Compose profiles directly on the instance if workflow dispatch is unavailable.
    - Supports blue-green deployments via `--target candidate` and `--promote` flags
  - Runtime on EC2:
    - Nginx on the host forwards traffic to Docker Compose services.
    - Four Debian-based Node containers (node:22-slim) managed by Compose profiles:
      - prod: bb-portfolio-frontend-prod (3000), bb-portfolio-backend-prod (3001)
      - dev: bb-portfolio-frontend-dev (4000), bb-portfolio-backend-dev (4001)
    - Typical DNS routing:
  - bbaysinger.com → prod (3000/3001)
  - dev.bbaysinger.com → dev (4000/4001)

- **Why this approach:**
  - Consistency: One entry point for infra + images + deploy, reducing drift and tribal knowledge.
  - Security: Runtime env files are generated on EC2 from GitHub Secrets; no secrets leave GitHub/EC2.
  - Resilience: SSH fallback ensures deploys aren’t blocked by GitHub workflow hiccups.
  - First-time friendly: If no EC2 exists, Terraform apply bootstraps a new instance automatically.
  - Zero/minimal downtime: Profiles allow prod/dev independence; targeted restarts minimize disruption; blue-green promotion enables validation before cutover.

- **Operation & Flags (highly used):**
  - `--profiles prod|dev|both` choose which environment(s) to deploy.
  - Images are always rebuilt and pushed automatically (both frontend and backend) to ensure consistency.
  - `--reuse-blue` skip blue instance recreation (faster but may have stale state; default is to recreate).
  - `--skip-infra` skips Terraform entirely and only (re)starts containers/workflows (deprecated `--pull-latest-tags-only`/`--containers-only` aliases retained temporarily).
  - `--refresh-env` ask the workflow to regenerate `.env.dev/.env.prod` on EC2.
  - `--promote` trigger EIP handover after successful candidate deployment.
  - `--auto-promote` skip handover confirmation prompt (for CI/CD automation).

- **Testing status:** ⚠️ Core functionality validated; edge-case testing pending
  - Basic deployment flows tested and working
  - Blue-green mechanics verified in initial scenarios
  - Recommendation: Monitor deployments and validate thoroughly before relying on automation for critical updates

- **Alternatives considered:**
  - Pure GitHub Actions (no local orchestrator): Less flexible locally, harder to provide rich fallback.
  - Pure SSH scripting: Centralizes secrets on the developer machine; brittle compared to GH Secrets.
  - ECS/EKS or App Runner: Heavier operational surface area and cost for a bb-portfolio-scale app.

- **Related improvements:**
  - `infra/bb-portfolio-management.sh` auto ECR login for prod flows and compose v1/v2 fallback on the host, to avoid image pull auth issues.
  - `scripts/eip-handover.sh` handles promotion workflow with health checks and rollback support.
  - WebSocket upgrade map now automatically created by orchestrator for nginx compatibility.

- **Status:** ✅ Active (requires additional testing for full production confidence)

---

## 2025-09-18 – CI/CD Timeout Strategy

**Decision:** Use **extended timeouts** to handle Docker installation and ECR operations reliably.

- **Workflow timeout**: 15 minutes (up from default 6 hours, but practically limited)
- **SSH command timeout**: 12 minutes (up from default 10 minutes)
- **Individual step timeouts**: 15 minutes for deployment operations

**Reasoning:**

- EC2 instances may need fresh Docker/AWS CLI installation on first deploy.
- ECR image pulls can be slow depending on network conditions and image size.
- Container startup with health checks requires additional time for stability.
- Better to have reliable deployments than fast but flaky ones.
- Prevents infrastructure setup failures from appearing as application bugs.

**Alternatives considered:**

- **Pre-baked AMIs with Docker**: Reduces deployment time but adds AMI management overhead.
- **Shorter timeouts with retries**: More complex logic and potential for cascading failures.
- **Background installation**: Complex orchestration and harder to debug failures.

**Status:** ✅ Active

---

## 2025-09-18 – ECR Image Strategy

**Decision:** Use **latest tag with commit SHA tracking** for production images.

- Images tagged as `latest` in ECR for simplicity
- GitHub Actions tracks deployments with commit SHA in logs
- Production environment always pulls latest during deployment

**Reasoning:**

- Simplifies Docker Compose configuration (no dynamic tag injection needed).
- Reduces complexity in CI/CD pipeline scripts.
- Latest tag strategy is acceptable for single-environment deployments.
- Git commit history provides sufficient deployment tracking for portfolio scale.
- Easier rollbacks via git revert + redeploy than ECR tag management.

**Alternatives considered:**

- **Commit SHA tags**: More precise but requires dynamic tag injection in docker-compose.yml.
- **Semantic version tags**: Overkill for portfolio project, requires release management.
- **Date-based tags**: Less meaningful for tracking changes and rollbacks.

**Status:** ✅ Active

---

## 2025-09-18 – Infrastructure Debugging Strategy

**Decision:** Add detailed logging and status checks in CI/CD deployments.

- Container logs capture (last 50 lines) for immediate visibility
- System resource checks (disk space, memory) before deployment
- Container status verification with `docker ps` and `docker compose ps`
- Progressive deployment validation with sleep delays for startup

**Reasoning:**

- EC2 deployments are harder to debug than local environments.
- Early visibility into failures reduces deployment iteration time.
- Resource constraints (disk/memory) are common EC2 failure modes.
- Container startup timing varies significantly between environments.
- Detailed logging helps diagnose issues without SSH access.

**Alternatives considered:**

- **Minimal logging**: Faster deployments but harder to debug failures.
- **External monitoring tools**: Overkill for portfolio scale and adds complexity.
- **Manual verification**: Not scalable and breaks automation benefits.

**Status:** ✅ Active

---

## 2025-09-20 – Infrastructure as Code with Terraform

**Decision:** Adopt **Terraform** for AWS infrastructure management instead of manual AWS Console configuration.

**Reasoning:**

- **Version control**: Infrastructure changes are tracked in git alongside application code.
- **Reproducibility**: Entire infrastructure can be recreated consistently across environments.
- **Documentation**: Terraform files serve as living documentation of infrastructure state.
- **Professional practices**: Demonstrates modern DevOps workflow and Infrastructure as Code principles.
- **Collaboration**: Team members can review infrastructure changes via pull requests.
- **Disaster recovery**: Complete infrastructure rebuild possible from code repository.

**Alternatives considered:**

- **AWS CDK**: More programmatic but adds complexity for simple infrastructure needs.
- **CloudFormation**: AWS-native but verbose YAML/JSON syntax is harder to maintain.
- **Manual AWS Console**: Quick for prototyping but not scalable, no version control, prone to drift.
- **Pulumi**: Modern IaC but adds another language/toolchain for a simple portfolio project.

**Status:** ✅ Active

---

## 2025-09-20 – EC2 Instance Type Upgrade

**Decision:** Upgrade from **t3.micro** to **t3.small** for the production EC2 instance.

**Reasoning:**

- **Performance requirements**: Running both frontend and backend containers simultaneously requires more resources.
- **Memory constraints**: t3.micro (1GB RAM) was insufficient for Docker Compose with multiple services.
- **Build performance**: Larger instance handles Docker builds and deployments more reliably.
- **Cost vs. stability**: t3.small (~$15/month vs ~$8/month) provides better reliability for minimal cost increase.
- **Headroom**: Additional resources prevent resource exhaustion during deployments and traffic spikes.

**Alternatives considered:**

- **t3.micro**: Too limited for multi-container deployment, frequent resource exhaustion.
- **t3.medium**: Overkill for portfolio project scale, doubles cost compared to t3.small.
- **Spot instances**: Cheaper but unreliable for always-on portfolio site.
- **Container optimization**: Would require significant architecture changes to reduce resource needs.

**Status:** ✅ Active

---

## 2025-09-18 – Dev Deployment Hanging Issue Resolution

**Decision:** Implement aggressive timeout protection and resource cleanup for dev environment Docker builds on EC2.

**Problem:** Dev deployments were hanging indefinitely during Docker build process, causing GitHub Actions to timeout after 10+ minutes with no progress.

**Solution implemented:**

- Hard timeout on Docker builds (15 minutes with `timeout 900`)
- Full resource cleanup before builds (containers, images, networks, volumes)
- Enable parallel builds and Docker BuildKit for faster builds
- Extended GitHub Actions timeouts (job: 25min, SSH: 18min, build: 15min)
- System resource monitoring (disk/memory) for debugging

**Important note:** During troubleshooting, ECR was mistakenly added to the dev workflow as a potential solution, but this was incorrect since ECR is production-only. The ECR addition was removed and dev deployment returned to building directly on EC2 as originally intended.

**Reasoning:**

- EC2 resource constraints (disk/memory) can cause builds to hang
- Corrupted Docker cache can cause infinite loops during builds
- Proper timeouts prevent indefinite hanging and provide faster feedback
- Resource cleanup prevents conflicts between deployment attempts

**Alternatives considered:**

- **ECR for dev deployments**: Rejected - ECR is production-only, adds unnecessary complexity
- **Separate EC2 for dev builds**: Too expensive for portfolio project
- **Local builds only**: Loses the benefit of testing deployment pipeline

**Status:** ✅ Active

---

## 2025-09-20 – EBS Volume Disk Space Resolution ✅ RESOLVED

**Problem:** Production deployments failing with "no space left on device" during Docker image extraction.

**Root Cause:** Original 8GB EBS volume was insufficient for:

- ECR image pulls (~464MB+ per image)
- Docker build cache accumulation (816MB found during cleanup)
- Multiple container environments (dev + prod)
- Node.js dependencies and application assets

**Solution Implemented:**

- **EBS volume expansion**: 8GB → 20GB via Terraform `root_block_device` configuration
- **Immediate cleanup**: Removed 2.5GB of Docker build cache with `docker system prune`
- **Instance replacement**: Terraform recreated instance with encrypted 20GB volume
- **Disk utilization improvement**: 86% usage → 10% usage (18GB available)

**Validation:**

- Production deployment completed successfully on September 20, 2025
- Both containers running healthy: `bb-portfolio-backend-prod`, `bb-portfolio-frontend-prod`
- ECR image pulls completed without disk space errors
- System resources adequate: `/dev/nvme0n1p1     20G  2.0G   18G  10% /`

**Status:** ✅ Resolved - Issue addressed and deployment pipeline restored

---

## 2025-09-20 – Production Deployment Pipeline Validation

**Decision:** Complete end-to-end deployment pipeline validated and documented.

**Pipeline Components:**

- **GitHub Actions CI/CD**: Automated builds and deployments from main branch
- **ECR Image Registry**: Production images building and pushing successfully
- **Terraform Infrastructure**: EC2 instance with 20GB storage configuration
- **Docker Compose Deployment**: Multi-container production environment running
- **Health Checks**: Both frontend and backend containers reporting healthy status
- **Port Configuration**: Backend (3000), Frontend (3001) properly exposed

**Final Deployment Validation (2025-09-20 09:50:45 UTC):**

```
NAME                      STATUS                    PORTS
bb-portfolio-backend-prod    Up 20 seconds (healthy)   0.0.0.0:3000->3000/tcp
bb-portfolio-frontend-prod   Up 20 seconds (healthy)   0.0.0.0:3001->3000/tcp
```

**Key Metrics:**

- **Deployment Time**: ~22 seconds for container startup
- **Resource Usage**: 10% disk utilization (18GB available)
- **Uptime**: Continuous operation with automatic restart policies
- **Security**: Encrypted EBS volumes, proper container isolation

**Status:** ✅ Active - Production pipeline operational

---

## 2025-09-20 – Data & Asset Management Strategy

**Decision:** Use **environment-specific databases and S3 buckets** for complete isolation across local, dev, and production environments.

**Database Strategy (MongoDB Atlas):**

- **Separate databases** within single Atlas cluster:
  - `bb-portfolio-local` - Local development
  - `bb-portfolio-dev` - EC2 development
  - `bb-portfolio-prod` - EC2 production
- **Benefits**: Complete data isolation, safe experimentation, cost-effective shared cluster
- **Configuration**: Environment-specific `MONGODB_URI` in each `.env` file

**Asset Storage Strategy (AWS S3):**

- **Separate S3 buckets** per environment:
  - `bb-portfolio-assets-local` - Local development uploads
  - `bb-portfolio-assets-dev` - EC2 development uploads
  - `bb-portfolio-assets-prod` - EC2 production uploads
- **Payload Integration**: Use `@payloadcms/storage-s3` with dynamic bucket naming based on `ENV_PROFILE`
- **Organization**: Environment-specific prefixes (screenshots, thumbnails, brand-logos)

**Environment Configuration:**

```bash
# Local/Docker Local
ENV_PROFILE=local
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/bb-portfolio-local

# EC2 Development
ENV_PROFILE=dev
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/bb-portfolio-dev

# EC2 Production
ENV_PROFILE=prod
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/bb-portfolio-prod
```

**Reasoning:**

- **Data Isolation**: Prevents dev changes from affecting production
- **Asset Organization**: Clean separation of uploaded media per environment
- **Cost Optimization**: Single Atlas cluster with multiple databases is more cost-effective than separate clusters
- **Development Safety**: Developers can safely test data changes and uploads
- **Production Integrity**: Production data and assets remain untouched during development

**Alternatives considered:**

- **Shared database with environment prefixes**: Less clean, potential for data contamination
- **Single S3 bucket with folder structure**: Possible but separate buckets provide better isolation
- **Local file storage for development**: Inconsistent with production, harder to test cloud integration

**Status:** ✅ Active

---

## 2025-09-28 – Media Seeding and Export Pipeline

- **Decision:** Standardize a local media workflow using an external `cms-seedings` folder and an export script that converts PSDs to WebP for import into the app.
- **Details:**
  - External working assets (PSDs) live outside the repo at:
    - `.../Portfolio Site/_work/project-screenshots`
    - `.../Portfolio Site/_work/project-thumbnails`
  - Script `cms-seedings/export-media.sh` converts PSDs → WebP and outputs to:
    - `cms-seedings/project-screenshots/*.webp`
    - `cms-seedings/project-thumbnails/*.webp`
  - Script is location-independent and reliable:
    - Reads from parent-level `_work` (relative to `cms-seedings`)
    - Writes into the `cms-seedings` folder
    - Supports ImageMagick v7 (`magick mogrify`) and v6 (`mogrify`)
    - Case-insensitive PSD matching (`*.psd` / `*.PSD`)
  - Import for local dev via `npm run media:seed` (copies from `../cms-seedings` into `backend/media/*`).
- **Reasoning:** Keep heavy/layered source files (PSDs) out of the repo, enable reproducible hydration for local dev, and standardize on WebP outputs for performance.
- **Alternatives considered:**
  - Commit images to repo → rejected due to repo bloat and history churn.
  - Convert on-the-fly in backend → adds runtime overhead and complexity.
  - S3-based transformation → unnecessary for local-only workflow.
- **Status:** ✅ Active

---

## 2025-09-28 – S3 Buckets and Prefixes (Finalized)

- **Decision:** Use per-environment S3 buckets named `bb-portfolio-media-<env>` with stable collection prefixes.
- **Bucket naming:**
  - `bb-portfolio-media-dev`
  - `bb-portfolio-media-stg` (optional, if/when we add stage)
  - `bb-portfolio-media-prod`
- **Prefixes (unchanged and stable):**
  - `brand-logos/`
  - `project-screenshots/`
  - `project-thumbnails/`
- **Terraform:** Buckets and IAM are managed in `infra/`; variables expose per-env bucket names and region. Outputs provide names/ARNs for wiring.
- **Backend configuration:**
  - Enable `@payloadcms/storage-s3` when `ENV_PROFILE` is `dev` or `prod`; use filesystem when `ENV_PROFILE=local`.
  - Environment variables (examples):
    - `S3_BUCKET=bb-portfolio-media-<profile>` (per overlay)
    - `AWS_REGION=us-west-2`
    - Optional base URL envs if fronted by CDN (e.g., CloudFront): `S3_BASE_URL` in each overlay.
- **CORS & IAM:**
  - CORS allows GET/HEAD from frontend origins; tighten in Terraform as needed.
  - IAM policy (per env) grants backend role `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject` on `arn:aws:s3:::<bucket>/*` and `s3:ListBucket` on the bucket.
- **Rationale:**
  - Clear isolation across environments; simple promotion via `aws s3 sync` per prefix or whole bucket.
  - Stable prefixes ensure DB keys remain portable across backends and CDNs.
- **Status:** ✅ Active (supersedes earlier “assets” bucket naming in 2025-09-20 entry; that entry remains for historical context)

---

## 2025-10-25 – NDA Routing and Rendering Segmentation

- **Decision:** Strictly segment NDA content under a dedicated route and keep public routes NDA-free.
- **Context:**
  - Route keys are split into:
    - a human slug (title-derived) for public/canonical URLs
    - an opaque Base62 short code for alternate access (used for NDA-safe routing when slug may be redacted)
  - Public project route `/project/[projectKey]` never includes NDA items in the active dataset (even when authenticated).
  - NDA-only route `/nda/[projectKey]` requires authentication and is rendered dynamically per request (no ISR), and is noindex.
  - Server behavior: if an authenticated user requests a public NDA slug, redirect to `/nda/[projectKey]`; unauthenticated users receive 404.
  - Client behavior: carousel and prev/next links are route-aware (public → `/project/*`, NDA → `/nda/*`) and never leak NDA data.
- **Reasoning:** Prevent accidental NDA exposure while supporting mixed navigation; clear separation improves safety and clarity of intent.
- **Alternatives considered:**
  - Serve NDA under `/project/*` when authenticated (simpler URLs but higher risk of leakage/accidental exposure).
  - Completely separate datasets without route-aware navigation (safer but worse UX when switching between public and NDA projects).
- **Status:** ✅ Active

---

## 2025-11-09 – Canonical Project File Delivery (Direct S3 Streaming)

- **Decision:** Replace prior presigned-URL 302 redirect pattern for project/NDA files with server-side direct S3 streaming under stable, canonical application paths: `/projects/<projectKey>/[index.html]` and `/private/<projectKey>/[index.html]`.
- **Context:** Previously, requests to project assets under clean app routes were internally converted to short‑lived presigned S3 URLs via a 302 redirect. This leaked bucket hostnames + signatures into browser history / analytics, complicated caching, and prevented conventional conditional + range requests at the application edge. Private (NDA) assets also returned 404 for unauthenticated access, diverging from a more reusable boilerplate that would signal `401 Unauthorized`.
- **Implementation:**
  - Next.js Route Handlers (`/frontend/src/app/projects/[[...key]]/route.ts` and `/frontend/src/app/private/[[...key]]/route.ts`) stream S3 objects directly using AWS SDK v3 `HeadObject` + `GetObject`.
  - Key normalization (`sanitizeKey`) resolves extensionless or directory paths to `index.html` and blocks traversal attempts (`..`).
  - Conditional requests: Evaluate `If-None-Match` / `If-Modified-Since` against S3 `ETag` / `LastModified`; return `304` with caching headers when unmodified.
  - Partial content: Honor `Range` headers; return `206` with `Content-Range` + `Accept-Ranges: bytes`.
  - Distinct cache policies:
    - Public: `Cache-Control: public, max-age=300, must-revalidate`
    - Private (NDA): `Cache-Control: private, max-age=0, must-revalidate`
  - Security hardening: `X-Content-Type-Options: nosniff`, path traversal guard, no exposure of raw S3 URLs or signatures.
  - Auth gating (private): Server-side session check via backend `/api/users/me`; unauthenticated returns conventional `401 Unauthorized` (explicit, easier to reuse) instead of obscured 404.
  - HEAD parity: Implements `HEAD` handlers that mirror auth + object existence semantics without fetching bodies.
  - Error behavior: Missing keys → `404 Not Found`; malformed traversal → `400 Bad path`; misconfiguration (missing bucket env) → `500`.
  - Environment variables: `PUBLIC_PROJECTS_BUCKET`, `PUBLIC_PROJECTS_PREFIX` (optional), `NDA_PROJECTS_BUCKET`, `NDA_PROJECTS_PREFIX` (optional), `AWS_REGION`/`AWS_DEFAULT_REGION`.
- **Reasoning:**
  - Preserves clean, stable URLs for bookmarking, analytics, and SEO (public side) without leaking presigned query parameters.
  - Enables proper HTTP cache negotiation (304) and efficient media seeking (Range) at the application layer.
  - Simplifies client code: No redirect follow, no need to distinguish S3 hostnames, consistent headers.
  - Improves security posture by eliminating exposure of signed URLs and reducing surface for misuse/log leakage.
  - Boilerplate‑friendly: Conventional `401` for protected assets is clearer for future reuse than silent 404 concealment (which can still be reinstated if desired).
  - Provides future flexibility (e.g., adding transform layers, access logs, rate limiting) before S3 without altering canonical links.
- **Alternatives considered:**
  - Continue 302 to presigned URL (leaks signed URLs, poor cache control).
  - Nginx reverse proxy to S3 (adds infra complexity; still needs app auth logic for NDA gating).
  - CloudFront distribution with signed cookies/URLs (powerful but heavier than needed now; harder to express per-object auth quickly).
  - Bundling project files into Payload CMS/media buckets (mixes concerns; larger DB/object lifecycle coupling).
  - Full static import / build-time embedding (bloats frontend bundle; loses on-demand updates without redeploy).
- **Status:** ✅ Active (supersedes earlier “Project Files on S3 and NDA Gated Delivery” redirect mechanics; path structure unchanged, delivery mechanism upgraded)

```

```
