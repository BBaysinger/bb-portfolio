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

- Avoid operational overhead of running a database on EC2.
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
```

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
