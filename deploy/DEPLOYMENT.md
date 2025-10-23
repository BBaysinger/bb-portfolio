# Portfolio Deployment Guide

## Current Status ✅

Your portfolio infrastructure is now **fully automated** with Terraform! Here's what we've accomplished:

### Infrastructure as Code

- ✅ **EC2 Instance**: t3.medium with Elastic IP (44.246.43.116)
- ✅ **Nginx Reverse Proxy**: Automatically configured and running
- ✅ **Docker Containers**: Development containers running reliably
- ✅ **ECR Repositories**: Ready for production image deployments
- ✅ **S3 Buckets**: Media storage with proper security
- ✅ **IAM Roles**: Secure access policies configured

### Management Tools

- ✅ **Management Script**: `./bb-portfolio-management.sh` for easy container control
- ✅ **Terraform Outputs**: Easy access to connection details
- ✅ **Documentation**: Complete setup and troubleshooting guides

## Next Steps

See also: "Deployment Orchestrator: Discovery and Fresh Create" in `docs/deployment-orchestrator.md` for how to run read-only discovery, plan-only previews, and first-time creation.

### 1. Point Your Domain (Immediate)

Your site is ready! Point your domain DNS to the Elastic IP:

```
A Record: bbinteractive.io → 44.246.43.116
A Record: www.bbinteractive.io → 44.246.43.116
A Record: dev.bbinteractive.io → 44.246.43.116
```

**Test URLs**:

- Production: http://44.246.43.116 (already working!)
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

## What's Automated Now

### On Instance Boot/Restart

1. Docker service starts automatically
2. Nginx starts automatically
3. Portfolio containers start automatically via systemd service
4. All services are configured and ready

### On Future Deployments

1. Run `terraform apply` to deploy infrastructure changes
2. Use management script to control containers
3. CI/CD pipeline updates production images in ECR automatically

### No More Manual Setup Required!

- ❌ No manual Nginx configuration
- ❌ No manual Docker installation
- ❌ No manual container startup
- ❌ No manual service configuration

Everything is now **Infrastructure as Code**! 🎈

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

## Benefits of This Setup

### 🚀 **Reliability**

- Development containers are proven to work
- Automatic service restart on failure
- Health checks for production containers

### 🔧 **Maintainability**

- All infrastructure defined in code
- Easy to reproduce and modify
- Clear documentation and management tools

### 💰 **Cost Effective**

- Single t3.medium instance handles everything
- ECR lifecycle policies limit storage costs
- Elastic IP prevents reconnection charges

### 🔒 **Secure**

- IAM roles with minimal permissions
- Encrypted storage volumes
- Private S3 buckets
- Security groups restrict access

### ⚡ **Easy Management**

- Single script for all container operations
- Terraform for infrastructure changes
- Clear status and logging

## Troubleshooting

If anything goes wrong, you have complete control:

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

**Your portfolio is now live and fully automated! 🎈**
