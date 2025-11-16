# Portfolio Deployment Guide

> For rationale behind major technical choices (hosting strategy, HTTPS, auth hardening, single canonical domain, SSR gating, etc.) see the Architecture Decisions Log: [`docs/architecture-decisions.md`](../docs/architecture-decisions.md). Always consult it before introducing platform changes so new work aligns with or intentionally supersedes documented decisions.

## Current Status

The portfolio infrastructure is deployed using Infrastructure as Code with Terraform.

### Infrastructure Components

- **EC2 Instance**: t3.medium with Elastic IP (44.246.43.116)
- **Nginx Reverse Proxy**: Configured and running
- **Docker Containers**: Development containers running
- **ECR Repositories**: Available for production image deployments
- **S3 Buckets**: Media storage with security policies
- **IAM Roles**: Access policies configured

### Management Tools

- **Management Script**: `./bb-portfolio-management.sh` for container control
- **Terraform Outputs**: Connection details and configuration
- **Documentation**: Setup and troubleshooting guides

## Next Steps

See also: "Deployment Orchestrator: Discovery and Fresh Create" in `docs/deployment-orchestrator.md` for how to run read-only discovery, plan-only previews, and first-time creation.

### 1. Configure DNS (Canonical Host Strategy)

Point your domain DNS to the Elastic IP:

```
Historically multiple domains pointed to the instance. We now standardize on a single canonical host per environment and redirect `www` → apex. Keep only what you actually use:

```

A Record: bbaysinger.com → 44.246.43.116 (prod canonical)
A Record: www.bbaysinger.com → 44.246.43.116 (redirects to apex)
A Record: dev.bbaysinger.com → 44.246.43.116 (dev environment)

```

Remove or let expire legacy entries for the old domain unless you have a migration need documented in the ADR log.
```

**Test URLs (direct IP is for smoke only)**:

- Production canonical: https://bbaysinger.com
- Dev canonical: https://dev.bbaysinger.com
- Raw IP (smoke/debug only): http://44.246.43.116

### 2. Deploy Dev Subdomain Support (If Adding/Changing)

The infrastructure has been updated to support `dev.bbaysinger.com`. To deploy this change:

```bash
cd infra/
terraform plan    # Review the Nginx configuration changes
terraform apply   # Deploy the updated server configuration
```

This will update the Nginx configuration on your server to handle the new subdomain.

Note on Nginx config changes:

- Nginx on the EC2 host is managed outside of user_data to avoid drift and size limits. The deploy orchestrator is responsible for syncing `/etc/nginx/conf.d/bb-portfolio.conf` automatically as part of every run.
- To propagate reverse-proxy updates from this repo (e.g., admin assets under `/admin/_next`), re-run the orchestrator. No manual Nginx sync is required.

### 3. Future Infrastructure Changes (Optional)

For any additional infrastructure changes:

```bash
cd infra/
terraform plan    # Review changes
terraform apply   # Apply changes
```

### 4. Container Management (As Needed)

```bash
# Check status
./infra/bb-portfolio-management.sh status

# View logs
./infra/bb-portfolio-management.sh logs bb-portfolio-frontend-dev

# Deploy production images (when ready)
./infra/bb-portfolio-management.sh deploy-prod

# Switch between environments
./infra/bb-portfolio-management.sh switch-to-dev
./infra/bb-portfolio-management.sh switch-to-prod
```

## Automated Components

### Instance Boot/Restart

1. Docker service starts automatically
2. Nginx starts automatically (default config only)
3. Site config, env files, and containers are managed by the deploy orchestrator or GitHub Actions
4. Services are configured and available after orchestrator runs

### Deployment Process

1. Run `terraform apply` to deploy infrastructure changes
2. Use the orchestrator or management script to control containers
3. Regenerate runtime env files on EC2 when needed (GitHub workflow or orchestrator `--refresh-env`)
   - Backend envs include: `PROD_/DEV_REQUIRED_ENVIRONMENT_VARIABLES`, `SECURITY_TXT_EXPIRES`, S3 buckets, Mongo URIs, Payload secret, SES emails, internal backend URL.
   - Frontend envs include: internal backend URL for SSR/server code only (browser uses relative `/api`).
4. CI/CD pipeline updates production images in ECR

### Mandatory AWS Account ID (ECR Image Resolution)

Production container image references now require `AWS_ACCOUNT_ID` with **no fallback** (removed `${AWS_ACCOUNT_ID:-000000000000}` default). If this variable is missing, ECR pulls will silently fail because the registry host becomes empty/invalid.

How it is supplied:

- The deploy orchestrator (`deploy/scripts/deployment-orchestrator.sh`) auto‑resolves the account ID via `aws sts get-caller-identity` if not already exported.
- On successful resolution it exports `AWS_ACCOUNT_ID`, sets the corresponding GitHub secret, and (in SSH fallback mode) writes a `./bb-portfolio/.env` file on EC2 containing `AWS_ACCOUNT_ID=...` for docker‑compose.
- GitHub Actions workflows read the secret to perform `docker compose pull` for prod profile.

Operator override:

- You may explicitly export `AWS_ACCOUNT_ID` before running the orchestrator to force a specific value (useful in multi‑account testing).

Verification checklist after a prod deploy attempt:

```bash
ssh -i ~/.ssh/bb-portfolio-site-key.pem ec2-user@<BLUE_IP> 'grep AWS_ACCOUNT_ID bb-portfolio/.env || echo "missing AWS_ACCOUNT_ID in compose .env"'
ssh -i ~/.ssh/bb-portfolio-site-key.pem ec2-user@<BLUE_IP> 'docker images | grep bb-portfolio-backend-prod || echo "prod backend image not pulled"'
ssh -i ~/.ssh/bb-portfolio-site-key.pem ec2-user@<BLUE_IP> 'docker ps --filter name=bb-portfolio-backend-prod'
```

If images were not pulled:

1. Confirm AWS credentials (`aws sts get-caller-identity`).
2. Re-run orchestrator with `--refresh-env`.
3. Manually set and retry: `export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)` then run orchestrator.

Document update rationale: Removing the fallback prevents accidental deployments pointing at a non‑existent registry `000000000000.dkr.ecr...` which previously resulted in missing prod containers and upstream 502 errors.

### Promotion Health Gate (Blue → Green)

Production promotion (Elastic IP handover of the candidate “blue” instance to become the new “active” green) is now strictly gated to prevent swapping in an unhealthy release. The orchestrator enforces this automatically when `--promote` or `--auto-promote` is used.

Gate criteria (all must pass):

1. Backend prod container (`bb-portfolio-backend-prod`) reports a `healthy` status (Docker healthcheck).
2. Frontend prod container (`bb-portfolio-frontend-prod`) is `Up`.
3. Backend health endpoint: `curl http://localhost:3001/api/health` returns HTTP 2xx or 3xx after retry/backoff.
4. Frontend root: `curl http://localhost:3000/` returns HTTP 2xx or 3xx after retry/backoff.
5. Transient `000` (connection/init) responses are tolerated and retried; persistent `000` or 5xx fails the gate.

Retry/backoff defaults:

```
HEALTH_RETRY_ATTEMPTS=6
HEALTH_RETRY_DELAY=5   # seconds between attempts
```

You can override these by exporting env vars before invoking the orchestrator (e.g. `HEALTH_RETRY_ATTEMPTS=10`).

Failure behavior:

- The orchestrator aborts the promotion with a clear error (no IP swap occurs).
- If `--auto-promote` was supplied, the run still halts safely—there is no silent partial promotion.
- Logs show each attempt and container status snapshots for fast triage.

Workflow-level hard fail:

- The GitHub Actions `redeploy.yml` job independently performs health polling and will exit non‑zero on production backend/container failure (backend unhealthy or persistent 5xx / 000) even before you attempt promotion.
- This ensures CI/CD signals breakage early; the orchestrator’s gate is the final safety net at handover time.

Null-Green Initial Activation:

- On the very first production stand‑up (no instance tagged `Role=active`), a healthy candidate is tagged active directly (no swap). The same gate applies so the initial active instance is verified.

Manual vs Auto Promote:

- `npm run orchestrate` (no promote) lets you manually inspect the candidate.
- `npm run orchestrate:auto-promote` deploys and, if the gate passes, performs the handover without an extra prompt.
- For manual promotion after validation use `npm run candidate-promote` (standalone promotion script under `deploy/scripts/`; gate enforced before swap).

Quick verification commands (post-deploy, before promoting):

```bash
ssh -i ~/.ssh/bb-portfolio-site-key.pem ec2-user@<BLUE_IP> \
  "docker ps --filter name=bb-portfolio-backend-prod --format '{{.Status}}'"
ssh -i ~/.ssh/bb-portfolio-site-key.pem ec2-user@<BLUE_IP> \
  "curl -fsSL -o /dev/null -w '%{http_code}' http://localhost:3001/api/health"
ssh -i ~/.ssh/bb-portfolio-site-key.pem ec2-user@<BLUE_IP> \
  "curl -fsSL -o /dev/null -w '%{http_code}' http://localhost:3000/"
```

If any gate check fails:

1. Inspect container logs (`docker logs <name>`).
2. Confirm env files presence (`ls backend/.env.prod frontend/.env.prod`).
3. Re-run orchestration with `--refresh-env` if env variance is suspected.
4. Fix root cause, redeploy, then retry promotion.

All logic lives in `deploy/scripts/deployment-orchestrator.sh` (`gate_promotion_health`). Update this doc if criteria or thresholds change.

### Orchestration Shortcuts

Use npm scripts for end-to-end orchestration:

```
# Full redeploy to blue (candidate) for both profiles
npm run orchestrate

# Deploy + automatic promotion after health checks (includes null-green initial activation if no previous active exists)
npm run orchestrate:auto-promote

# Manual promotion only (when blue is ready)
npm run candidate-promote

> Initial Activation (null-green mode): If no instance is tagged `Role=active` yet (first time standing up production), the promotion path will tag the healthy candidate directly as active without performing a swap.
```

### Infrastructure as Code

- Nginx configuration managed by Terraform
- Docker installation automated via user_data
- Container startup handled by systemd
- Service configuration defined in code

## Current Architecture

```
Internet → CloudFlare DNS → Elastic IP (44.246.43.116)
    ↓
AWS EC2 t3.medium
    ├── Nginx (:80)
   │   ├── bbaysinger.com & www.bbaysinger.com → Production Containers (:3000/:3001)
   │   ├── dev.bbaysinger.com → Development Containers (:4000/:4001)
    │   └── API requests (/api/) routed per domain
    ├── ECR Images (for production deployment)
    └── S3 Buckets (media storage)
```

## Architecture Benefits

### Reliability

- Automatic service restart on failure
- Health checks for container monitoring
- Systemd service management

### Maintainability

- Infrastructure defined in code
- Reproducible deployments
- Clear documentation and management tools

### Cost Optimization

- Single t3.medium instance for multiple services
- ECR lifecycle policies limit storage costs
- Elastic IP prevents reconnection charges

### Security

- IAM roles with minimal permissions
- Encrypted storage volumes
- Private S3 buckets
- Security groups restrict access

### Management

- Single script for container operations
- Terraform for infrastructure changes
- Centralized logging and status monitoring

## Troubleshooting

If anything goes wrong, you have complete control:

# Quick smoke checks

After a redeploy, especially when env files were changed, verify:

```bash
# From EC2 host (ssh in first):
curl -fsSL http://localhost:3001/api/health/   # backend should return 200
curl -fsSL http://localhost:3000/api/projects/?limit=3&depth=0 | jq '.docs | length'
```

If backend logs show "Missing required environment variables":

- Re-run the redeploy with env refresh enabled so the workflow regenerates `.env.prod`/`.env.dev` on EC2:

```bash
deploy/scripts/deployment-orchestrator.sh --profiles prod --refresh-env

### Focused Promotion Script Location

The standalone Elastic IP handover utility is now located at `deploy/scripts/orchestrator-promote.sh` (previously `scripts/orchestrator-promote.sh`). Update any external automation or personal aliases referencing the old path.

### Instance Retention Script Location

The previous‑instance pruning logic has been relocated from `scripts/instance-retention.sh` to `deploy/scripts/instance-retention.sh` to centralize blue/green lifecycle concerns.
```

This ensures `SECURITY_TXT_EXPIRES` and the required-lists are present for the env-guard.

```bash
# Check everything
./infra/bb-portfolio-management.sh status

# Restart containers
./infra/bb-portfolio-management.sh restart dev

# View detailed logs
./infra/bb-portfolio-management.sh logs bb-portfolio-frontend-dev

# SSH to server
ssh -i ~/.ssh/bb-portfolio-site-key.pem ec2-user@44.246.43.116
```

## Production Readiness

When you're ready to use production containers:

1. Fix the ECR build issues (Next.js standalone mode)
2. Deploy production: `./infra/bb-portfolio-management.sh deploy-prod`
3. The infrastructure supports both seamlessly!

---

## Enabling & Maintaining HTTPS

TLS termination is handled directly on the EC2 host by Nginx with certificates provisioned via Let's Encrypt (certbot). The deploy orchestrator installs certbot on the host if missing and issues certificates over SSH for the canonical set (apex + www + dev). Legacy domains are no longer required:

```
bbaysinger.com
www.bbaysinger.com
dev.bbaysinger.com
```

If you still need a legacy domain for transition, temporarily include it, then remove once traffic has fully migrated (document the deprecation in the ADR log).

### 1. Provide ACME Email

Add `ACME_REGISTRATION_EMAIL` (or `ACME_EMAIL`) to `.github-secrets.private.json5`. Example:

```json5
{
  strings: {
    // ... existing secrets ...
    ACME_REGISTRATION_EMAIL: "you@bbaysinger.com",
  },
}
```

The orchestrator reads this value directly to run certbot over SSH; Terraform does not need it in user_data anymore.

### 2. Ensure DNS A Records Resolve

All listed domains must point to the Elastic IP before certbot can issue. Test each with:

```bash
dig +short bbaysinger.com
dig +short www.bbaysinger.com
dig +short dev.bbaysinger.com
```

They should all return the Elastic IP (e.g., `44.246.43.116`). If any do not, wait for propagation or fix DNS before proceeding.

### 3. Issue Certificates (Orchestrator)

With DNS pointed to the Elastic IP and your ACME email set, run the deploy orchestrator (containers-only is fine):

```bash
deploy/scripts/deployment-orchestrator.sh --profiles prod --no-build --no-secrets-sync
```

It will detect the EC2 host, ensure certbot is installed, and issue certs via the nginx plugin with `--redirect`.

### 4. Verifying HTTPS

After deploy (can be minutes for DNS + issuance), verify:

```bash
curl -I https://bbaysinger.com | head -1      # Expect: HTTP/1.1 200 / 301
curl -I https://www.bbaysinger.com | head -1  # Expect a 301 → apex or 200
curl -I https://dev.bbaysinger.com | head -1  # Dev site
```

Or remotely via orchestrator after infra step:

```bash
deploy/scripts/deployment-orchestrator.sh --discover-only
```

### 5. Manual Re-Issue / Adjust Domains

If you add or remove domains later, SSH into the instance and re-run certbot:

```bash
ssh -i ~/.ssh/bb-portfolio-site-key.pem ec2-user@$(terraform -chdir=infra output -raw bb_portfolio_elastic_ip)
sudo certbot --nginx -n --agree-tos --email you@bbaysinger.com \
   -d bbaysinger.com -d www.bbaysinger.com -d dev.bbaysinger.com --redirect
```

### 6. Renewal

Certbot installs a systemd timer (`certbot-renew.timer`) which runs twice daily. You can confirm:

```bash
systemctl list-timers | grep certbot
sudo certbot renew --dry-run
```

If renewal succeeds, no action needed. Certificates are typically valid for 90 days; certbot renews at ~30 day threshold.

### 7. Fallback / Troubleshooting

- If issuance fails, check DNS propagation or open port 80 reachability.
- View logs: `sudo tail -n 200 /var/log/letsencrypt/letsencrypt.log`
- Re-run with verbose: add `-vv --debug-challenges` flags.
- Ensure security group still allows ports 80/443 (Terraform manages this in `infra/main.tf`).

### 8. Moving to Caddy (Optional Alternative)

If you later switch to Caddy for simpler config + automatic certificate management, you'll:

1. Add production `Caddyfile` similar to local dev.
2. Add a `caddy` service to EC2 docker-compose with ports 80/443.
3. Remove certbot + SSL blocks from Nginx or disable Nginx entirely.
4. Update orchestrator to sync `Caddyfile` and restart `caddy` container.

Current implementation keeps Nginx (host-level) for stability and explicit control. Consider Caddy ONLY if you need dynamic routing or simplified header management; update ADR log with the rationale before switching.

### 9. Dependency Footprint for HTTPS

No new Node.js dependencies were added to enable HTTPS. All TLS functionality lives at the host layer (Nginx + certbot). Application packages remained unchanged. This minimizes surface area and avoids per-container certificate renewal complexity.
