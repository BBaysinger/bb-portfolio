# Portfolio Deployment Guide

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

### 1. Configure DNS

Point your domain DNS to the Elastic IP:

```
A Record: bbinteractive.io → 44.246.43.116
A Record: www.bbinteractive.io → 44.246.43.116
A Record: dev.bbinteractive.io → 44.246.43.116
```

**Test URLs**:

- Production: http://44.246.43.116
- Development subdomain: http://dev.bbinteractive.io (after DNS propagation)

### 2. Deploy .dev Subdomain Support (Required)

The infrastructure has been updated to support `dev.bbinteractive.io`. To deploy this change:

```bash
cd infra/
terraform plan    # Review the Nginx configuration changes
terraform apply   # Deploy the updated server configuration
```

This will update the Nginx configuration on your server to handle the new subdomain.

Note on Nginx config changes:

- Nginx on the EC2 host is provisioned by Terraform’s user_data the first time the instance is created. Subsequent container deploys do NOT change Nginx automatically.
- If you change reverse-proxy behavior in the repo (for example, we now emit admin assets under `/admin/_next` via backend assetPrefix), you have two ways to propagate the Nginx change:
  1. Quick sync (recommended):
     - Use the helper script to push the vhost config template in this repo to the server and reload Nginx.
     - This is safe and idempotent; it backs up the old file.

     ```bash
     # from repo root
     ./deploy/scripts/sync-nginx-config.sh --host ec2-user@44.246.43.116 --key ~/.ssh/bb-portfolio-site-key.pem
     ```

  2. Rebuild via Terraform (slower):
     - Update Terraform to render the new config in user_data, then recreate or reprovision the instance so user_data runs again.
     - Useful when you want a fully fresh instance.

### 3. Future Infrastructure Changes (Optional)

For any additional infrastructure changes:

```bash
cd infra/
terraform plan    # Review changes
terraform apply   # Apply changes
```

### 3. Container Management (As Needed)

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
2. Nginx starts automatically
3. Portfolio containers start via systemd service
4. Services are configured and available

### Deployment Process

1. Run `terraform apply` to deploy infrastructure changes
2. Use the orchestrator or management script to control containers
3. Regenerate runtime env files on EC2 when needed (GitHub workflow or orchestrator `--refresh-env`)
    - Backend envs include: `PROD_/DEV_REQUIRED_ENVIRONMENT_VARIABLES`, `SECURITY_CONTACT_EMAIL`, `SECURITY_TXT_EXPIRES`, S3 buckets, Mongo URIs, Payload secret, SES emails, internal backend URL.
    - Frontend envs include: internal backend URL for SSR/server code only (browser uses relative `/api`).
4. CI/CD pipeline updates production images in ECR

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
    │   ├── bbinteractive.io & www.bbinteractive.io → Production Containers (:3000/:3001)
    │   ├── dev.bbinteractive.io → Development Containers (:4000/:4001)
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
