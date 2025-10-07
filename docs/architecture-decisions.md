# Architecture Decisions Log

This file records major technical decisions for the portfolio project.  
Each entry includes the date, decision, reasoning, alternatives, and current status.  
New decisions should be appended chronologically.

---

## 📌 Template for new entries

**Date:** YYYY-MM-DD – _Topic_

- **Decision:** …
- **Reasoning:** …
- **Alternatives considered:** …
- **Status:** Active / Superseded

---

## 2025-09-14 – Database

**Decision:** Use **MongoDB Atlas (cloud-managed MongoDB)**  
**Reasoning:**

- Avoid operational over- **Status:** ✅ Active (supersedes earlier "assets" bucket naming in 2025-09-20 entry; that entry remains for historical context)

---

## 2025-10-07 – Complete Infrastructure Automation & Production Deployment

**Decision:** Implement **comprehensive Infrastructure as Code (IaC) with full automation** for zero-manual deployment and production-ready hosting.

**Infrastructure Architecture:**

- **Terraform IaC**: Complete AWS infrastructure defined as code with full automation
- **EC2 Instance**: t3.medium with automated configuration via user_data scripts
- **Elastic IP**: Static IP assignment for consistent domain pointing (44.250.92.40)
- **Nginx Reverse Proxy**: Automated configuration for professional routing and load balancing
- **Docker Containerization**: Development and production container profiles with systemd management
- **ECR Integration**: Private container registries with lifecycle policies and IAM authentication
- **S3 Media Storage**: Environment-specific buckets with proper CORS and encryption
- **Security**: Comprehensive security groups, encrypted storage, and least-privilege IAM roles

**Automation Features:**

- **One-Command Deployment**: `terraform apply` creates entire infrastructure from scratch
- **One-Command Teardown**: `terraform destroy` cleanly removes all 25+ AWS resources
- **Zero Manual Configuration**: All services configured automatically via user_data scripts
- **Auto-Healing**: Systemd services ensure containers restart on failure
- **Boot Persistence**: All services start automatically on server restart
- **Container Management**: Custom management scripts for easy environment switching (dev/prod profiles)

**Production Deployment:**

- **Domain**: bbinteractive.io successfully pointed to infrastructure
- **SSL-Ready**: Architecture prepared for HTTPS certificate integration
- **Scalable Foundation**: Ready for auto-scaling groups, load balancers, and CDN integration
- **Monitoring Ready**: CloudWatch integration prepared for metrics and alerts

**Technical Implementation:**

```bash
# Infrastructure Management
terraform plan    # Review changes
terraform apply   # Deploy infrastructure
terraform destroy # Clean teardown

# Container Management (via SSH)
./portfolio-management.sh status     # Check containers
./portfolio-management.sh switch prod # Switch to production profile
./portfolio-management.sh deploy      # Deploy from ECR
```

**Verified Capabilities:**

- **Complete Infrastructure Recreation**: Successfully destroyed and recreated entire infrastructure
- **Automatic Service Configuration**: Docker, Nginx, containers all start without manual intervention
- **Production Reliability**: Website accessible at bbinteractive.io with professional architecture
- **Development Workflow**: Easy switching between dev (Docker Hub) and prod (ECR) container sources
- **Documentation**: Comprehensive README with troubleshooting and management procedures

**Reasoning:**

- **Professional Standards**: Demonstrates enterprise-level DevOps practices and infrastructure management
- **Reliability**: Eliminates manual configuration errors and ensures consistent deployments
- **Scalability**: Foundation supports growth from portfolio to production applications
- **Cost Efficiency**: Infrastructure as Code prevents resource waste and enables easy environment management
- **Learning Value**: Provides hands-on experience with modern cloud architecture patterns
- **Portfolio Enhancement**: Shows advanced technical capabilities beyond basic web development

**Alternatives considered:**

- **Platform-as-a-Service (Heroku, Vercel)**: Simpler but less learning value and technical demonstration
- **Manual EC2 Setup**: More prone to errors, not reproducible, unprofessional for portfolio demonstration
- **Container Services (ECS/EKS)**: More complex, higher cost, overkill for portfolio scale
- **Static Hosting (S3/CloudFront)**: Limited to frontend-only, doesn't demonstrate full-stack capabilities

**Status:** ✅ Active - Production infrastructure deployed and verified working

`````

---

## 2025-10-06 – Dual Registry Strategy: Docker Hub + ECR

**Decision:** Implement **dual container registry strategy** using Docker Hub for development and ECR for production.

**Configuration:**

- **Development environment**: Images built and pushed to Docker Hub (`bhbaysinger/portfolio-*:dev`)
- **Production environment**: Images built and pushed to Amazon ECR (`*.dkr.ecr.us-west-2.amazonaws.com/bb-portfolio-*:latest`)
- **CI/CD workflow**: Different registry authentication per environment
- **Cost optimization**: Free Docker Hub public repositories for dev, ECR for production reliability

**Reasoning:**

- **Experience diversification**: Provides hands-on experience with both industry-standard registries
- **Cost optimization**: Docker Hub free tier reduces operational costs for development environment
- **Professional demonstration**: Shows understanding of multi-registry enterprise patterns
- **Risk management**: Separate registries isolate development experiments from production deployments
- **Performance**: ECR integration with AWS services provides better production performance

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
- Leveraged existing `npm run sync:secrets` workflow for GitHub Actions integration
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

````ead of running a database on EC2.
- Free/low-tier Atlas is sufficient for project scale.
- Provides automatic backups and scaling without extra config.

**Alternatives considered:**

- **Postgres in Docker on EC2**: Would require persistence management (EBS volumes), more setup, higher memory use.
- **Self-hosted Mongo in Docker**: More maintenance, less reliable.

**Status:** ✅ Active

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

**Decision:** Run **both dev and prod environments on the same EC2 instance** using separate Docker Compose projects.

- Reverse proxy routes traffic:
  - `mysite.com` → prod containers
  - `dev.mysite.com` → dev containers

**Reasoning:**

- Avoids cost of a second EC2 instance (~$7–8/mo).
- Still provides a live dev environment accessible at a separate subdomain.
- Keeps deployment consistent with production (same stack).
- Sufficient for portfolio purposes even if dev impacts prod occasionally.

**Alternatives considered:**

- **Separate EC2 instance for dev**: Cleaner isolation, but doubles costs.
- **Ephemeral dev envs (Fly.io, Railway, etc.)**: Cheaper, but less consistent with prod.
- **Local-only dev**: Fine for personal use, but doesn’t provide a shareable dev URL.

**Status:** ✅ Active

---

## 2025-09-15 – Instance Consolidation & Key Management

**Decision:** Consolidate to a single EC2 instance named `portfolio` with one keypair.
**Reasoning:**

- Simplifies management (one server to update/patch).
- Avoids confusion of juggling multiple `.pem` files.
- Clearer mental model for deployment pipeline (prod + dev both on one host).

**Alternatives considered:**

- **Two separate EC2 instances (frontend + backend)**: Tested, but unnecessarily complex and doubled cost.
- **Separate dev EC2**: Cleaner but unjustifiable cost.
- **Reusing multiple keypairs**: Works, but adds complexity for no real gain.

**Status:** ✅ Active

## 2025-09-16 – Base OS Migration

**Decision:** Standardize on **Debian (Bookworm)** as the base OS for the EC2 instance.
**Reasoning:**

- More stable and lightweight than Ubuntu, with fewer default packages and less bloat.
- Security updates are more conservative, reducing risk of sudden package breakage.
- Long support cycles make it easier to “set and forget” for a low-maintenance portfolio server.
- Strong ecosystem and compatibility with Docker + CI/CD workflows.
- Clean baseline for learning: demonstrates deliberate OS choice and shows knowledge of trade-offs.

**Alternatives considered:**

- **Ubuntu 22.04 LTS**: Familiar, widely documented, but slightly heavier and more prone to frequent package churn.
- **Amazon Linux 2023**: Tight AWS integration and security patches, but smaller community and not as general-purpose.
- **Alpine Linux**: Extremely lightweight, but would require extra effort for tooling/packages, and debugging can be harder.

**Status:** ✅ Active

## 2025-09-18 – Dev Deployment Strategy

**Decision:** Keep **dev environment rebuilds manual on EC2**, while keeping **prod automated via CI/CD**.

- **Prod (`main` branch)** → Auto build/test/push via GitHub Actions → push images to ECR → deploy with `docker compose --profile prod`.
- **Dev (`dev` branch)** → Manual trigger: SSH into EC2 or run a GitHub Actions workflow button to pull latest code and run `docker compose --profile dev up -d --build`.

**Reasoning:**

- Keeps CI/CD simple: only `main` branch triggers full rebuilds and ECR pushes.
- Avoids unnecessary rebuilds every time code is pushed to `dev` (saves CI/CD minutes and clutter).
- Still provides a live dev sandbox on EC2 (`dev.mysite.com`) for testing, but updates happen only when explicitly triggered.
- Reflects professional workflow separation: **prod is automated, dev is flexible/manual**.

**Alternatives considered:**

- **Have `dev` auto-deploy like prod**: More consistent, but wastes builds on half-finished commits and requires managing separate ECR repos.

**Status:** ✅ Active

---

## 2025-09-18 – Multi-Environment Docker Strategy

**Decision:** Use **Docker Compose profiles** for environment separation with distinct deployment strategies.

- **Local (`local` profile)**: Volume mounts + hot reload for development
- **Development (`dev` profile)**: Build on EC2 for remote testing
- **Production (`prod` profile)**: Pre-built ECR images for reliable deployments

**Reasoning:**

- Single `docker-compose.yml` file reduces configuration drift between environments.
- Local development gets fast iteration with volume mounts and file watching.
- Production gets atomic deployments with pre-tested, immutable images.
- Development environment provides middle ground for testing production builds remotely.
- Profiles prevent accidental cross-environment interference.

**Alternatives considered:**

- **Separate docker-compose files per environment**: More complex to maintain, higher drift risk.
- **Environment variables only**: Less explicit, harder to reason about differences.
- **Different repositories**: Massive overhead, doesn't reflect real-world monorepo patterns.

**Status:** ✅ Active

---

## 2025-09-18 – Health Check Strategy

**Decision:** Use **TCP connection checks** instead of HTTP health checks for container monitoring.

```yaml
healthcheck:
  test:
    [
      "CMD",
      "node",
      "-e",
      "const net = require('net'); const client = net.createConnection(3000, 'localhost', () => { console.log('connected'); client.end(); process.exit(0); }); client.on('error', () => process.exit(1));",
    ]
`````

**Reasoning:**

- More reliable during application startup phase when HTTP routes may not be ready.
- Avoids dependency on specific endpoint implementations or authentication.
- Works consistently across different application frameworks and configurations.
- Faster response time than HTTP checks with complex routing logic.
- Less prone to false negatives during deployment windows.

**Alternatives considered:**

- **HTTP GET requests**: More semantic but prone to startup timing issues and authentication complications.
- **Simple port checks without Node.js**: Platform-dependent and less precise.
- **No health checks**: Missing observability and automatic recovery capabilities.

**Status:** ✅ Active

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

**Decision:** Implement **comprehensive logging and status checks** in CI/CD deployments.

- Container logs capture (last 50 lines) for immediate visibility
- System resource checks (disk space, memory) before deployment
- Container status verification with `docker ps` and `docker compose ps`
- Progressive deployment validation with sleep delays for startup

**Reasoning:**

- EC2 deployments are harder to debug than local environments.
- Early visibility into failures reduces deployment iteration time.
- Resource constraints (disk/memory) are common EC2 failure modes.
- Container startup timing varies significantly between environments.
- Comprehensive logging helps diagnose issues without SSH access.

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
- Comprehensive resource cleanup before builds (containers, images, networks, volumes)
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

- ✅ **September 20, 2025**: Production deployment completed successfully
- ✅ Both containers running healthy: `portfolio-backend-prod`, `portfolio-frontend-prod`
- ✅ ECR image pulls completed without disk space errors
- ✅ System resources now adequate: `/dev/nvme0n1p1     20G  2.0G   18G  10% /`

**Status:** ✅ **RESOLVED** - Deployment pipeline fully operational

---

## 2025-09-20 – 🚀 Production Deployment Pipeline Status: OPERATIONAL

**Milestone:** Complete end-to-end deployment pipeline successfully validated and operational.

**Pipeline Components Verified:**

- ✅ **GitHub Actions CI/CD**: Automated builds and deployments from main branch
- ✅ **ECR Image Registry**: Production images building and pushing successfully
- ✅ **Terraform Infrastructure**: EC2 instance with proper 20GB storage configuration
- ✅ **Docker Compose Deployment**: Multi-container production environment running
- ✅ **Health Checks**: Both frontend and backend containers reporting healthy status
- ✅ **Port Configuration**: Backend (3000), Frontend (3001) properly exposed

**Final Deployment Validation (2025-09-20 09:50:45 UTC):**

```
NAME                      STATUS                    PORTS
portfolio-backend-prod    Up 20 seconds (healthy)   0.0.0.0:3000->3000/tcp
portfolio-frontend-prod   Up 20 seconds (healthy)   0.0.0.0:3001->3000/tcp
```

**Key Metrics:**

- **Deployment Time**: ~22 seconds for container startup
- **Resource Usage**: 10% disk utilization (18GB available)
- **Uptime**: Continuous operation with automatic restart policies
- **Security**: Encrypted EBS volumes, proper container isolation

**Status:** ✅ **FULLY OPERATIONAL** - Ready for production traffic

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
  - Script is location-independent and robust:
    - Reads from parent-level `_work` (relative to `cms-seedings`)
    - Writes into the `cms-seedings` folder
    - Supports ImageMagick v7 (`magick mogrify`) and v6 (`mogrify`)
    - Case-insensitive PSD matching (`*.psd` / `*.PSD`)
  - Import for local dev via `npm run seed:media` (copies from `../cms-seedings` into `backend/media/*`).
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
    - `DEV_S3_BUCKET=bb-portfolio-media-dev`
    - `PROD_S3_BUCKET=bb-portfolio-media-prod`
    - `DEV_AWS_REGION=us-west-2` / `PROD_AWS_REGION=us-west-2`
    - Optional base URL envs if fronted by CDN (e.g., CloudFront): `DEV_S3_BASE_URL`, `PROD_S3_BASE_URL`.
- **CORS & IAM:**
  - CORS allows GET/HEAD from frontend origins; tighten in Terraform as needed.
  - IAM policy (per env) grants backend role `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject` on `arn:aws:s3:::<bucket>/*` and `s3:ListBucket` on the bucket.
- **Rationale:**
  - Clear isolation across environments; simple promotion via `aws s3 sync` per prefix or whole bucket.
  - Stable prefixes ensure DB keys remain portable across backends and CDNs.
- **Status:** ✅ Active (supersedes earlier “assets” bucket naming in 2025-09-20 entry; that entry remains for historical context)
