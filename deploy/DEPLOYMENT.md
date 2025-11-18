# Portfolio Deployment Guide (Legacy Single-Instance Path)

> For rationale behind major technical choices (hosting strategy, HTTPS, auth hardening, single canonical domain, SSR gating, etc.) see the Architecture Decisions Log: [`docs/architecture-decisions.md`](../docs/architecture-decisions.md). Always consult it before introducing platform changes so new work aligns with or intentionally supersedes documented decisions.

## Scope

This document now describes the legacy, single EC2 instance deployment model (canonical prod + optional dev profile) after pausing the Lagoon (blue/green) strategy. Lagoon artifacts were preserved under `infra-lagoon/` and `deploy-lagoon/` and documented separately. Day‑to‑day operations should rely on the simplified approach below for faster recovery and reduced complexity.

## Current Status (Legacy Model)

Infrastructure is managed with Terraform (`infra/`) and a single host runs both production and (optionally) development containers via Docker Compose profiles.

### Infrastructure Components (Legacy)

- **EC2 Instance**: t3.medium with Elastic IP (44.246.43.116)
- **Nginx Reverse Proxy**: Configured and running
- **Docker Containers**: Development containers running
- **ECR Repositories**: Available for production image deployments
- **S3 Buckets**: Media storage with security policies
- **IAM Roles**: Access policies configured

### Management Tools (Legacy)

- **Management Script**: `./bb-portfolio-management.sh` for container control
- **Terraform Outputs**: Connection details and configuration
- **Documentation**: Setup and troubleshooting guides

## Next Steps (Typical Flow)

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

- Nginx on the EC2 host is now managed outside of user_data to avoid drift and size limits. The deploy orchestrator (or the helper script below) is responsible for syncing `/etc/nginx/conf.d/bb-portfolio.conf`.
- To propagate reverse-proxy updates from this repo (e.g., admin assets under `/admin/_next`):
  1. Quick sync (recommended):
     - Use the helper script to push the vhost config template in this repo to the server and reload Nginx.
     - This is safe and idempotent; it backs up the old file.

     ```bash
     # from repo root
     ./deploy/scripts/sync-nginx-config.sh --host ec2-user@44.246.43.116 --key ~/.ssh/bb-portfolio-site-key.pem
     ```

  2. Rebuild via Terraform (slower):
     - Not required for Nginx anymore. user_data is intentionally minimal and does not write the site config.

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

## Automated Components (Host Lifecycle)

### Instance Boot/Restart

1. Docker service starts automatically
2. Nginx starts automatically (default config only)
3. Site config, env files, and containers are managed by the deploy orchestrator or GitHub Actions
4. Services are configured and available after orchestrator runs

### Deployment Process (Legacy)

1. Run `terraform apply` to deploy infrastructure changes
2. Use the orchestrator or management script to control containers
3. Regenerate runtime env files on EC2 when needed (GitHub workflow or orchestrator `--refresh-env`)
   - Backend envs include: `PROD_/DEV_REQUIRED_ENVIRONMENT_VARIABLES`, `SECURITY_TXT_EXPIRES`, S3 buckets, Mongo URIs, Payload secret, SES emails, internal backend URL.
   - Frontend envs include: internal backend URL for SSR/server code only (browser uses relative `/api`).
4. CI/CD pipeline updates production images in ECR

### Infrastructure as Code

- Nginx configuration managed by Terraform
- Docker installation automated via user_data
- Container startup handled by systemd
- Service configuration defined in code

## Current Architecture (Legacy)

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

## Architecture Benefits (Legacy)

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

## Troubleshooting (Legacy)

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

## Production Readiness (Switching to Production Images)

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

---

## Lagoon (Blue/Green) Strategy – Deferred

The Lagoon strategy (parallel candidate instance, EIP promotion, enhanced health checks, versioned Nginx with fallback `/healthz`) is currently paused to simplify recovery operations. Its full design, scripts, and Terraform modules were snapshotted under:

- `infra-lagoon/` (blue/green infrastructure definitions)
- `deploy-lagoon/` (orchestrators, Nginx config, diagnostics, promotion helpers)

Refer to `deploy-lagoon/README.md` for comprehensive details, rationale, and the steps to resume. We will revisit Lagoon when time permits and operational stability goals are met.

Brief Advantages (when active): safer cutover, rollback path, validation before promotion. Temporary drawback: added cognitive overhead during outage recovery.

Action to Resume Later:
1. Run a Terraform plan in `infra-lagoon/`.
2. Rebuild candidate instance and run containers only.
3. Validate health paths → perform promotion.

Until then, treat this legacy model as authoritative.

No new Node.js dependencies were added to enable HTTPS. All TLS functionality lives at the host layer (Nginx + certbot). Application packages remained unchanged. This minimizes surface area and avoids per-container certificate renewal complexity.
