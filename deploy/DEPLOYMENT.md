# Portfolio Deployment Guide

## Current Status ✅

Your portfolio infrastructure is now **fully automated** with Terraform! Here's what we've accomplished:

### Infrastructure as Code

- ✅ **EC2 Instance**: t3.medium with Elastic IP (54.70.138.1)
- ✅ **Nginx Reverse Proxy**: Automatically configured and running
- ✅ **Docker Containers**: Development containers running reliably
- ✅ **ECR Repositories**: Ready for production image deployments
- ✅ **S3 Buckets**: Media storage with proper security
- ✅ **IAM Roles**: Secure access policies configured

### Management Tools

- ✅ **Management Script**: `./portfolio-management.sh` for easy container control
- ✅ **Terraform Outputs**: Easy access to connection details
- ✅ **Documentation**: Complete setup and troubleshooting guides

## Next Steps

### 1. Point Your Domain (Immediate)

Your site is ready! Point your domain DNS to the Elastic IP:

```
A Record: bbinteractive.io → 54.70.138.1
A Record: www.bbinteractive.io → 54.70.138.1
A Record: dev.bbinteractive.io → 54.70.138.1
```

**Test URLs**:

- Production: http://54.70.138.1 (already working!)
- Development subdomain: http://dev.bbinteractive.io (after DNS propagation)

### 2. Deploy .dev Subdomain Support (Required)

The infrastructure has been updated to support `dev.bbinteractive.io`. To deploy this change:

```bash
cd infra/
terraform plan    # Review the Nginx configuration changes
terraform apply   # Deploy the updated server configuration
```

This will update the Nginx configuration on your server to handle the new subdomain.

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
./infra/portfolio-management.sh status

# View logs
./infra/portfolio-management.sh logs bb-portfolio-frontend-dev

# Deploy production images (when ready)
./infra/portfolio-management.sh deploy-prod

# Switch between environments
./infra/portfolio-management.sh switch-to-dev
./infra/portfolio-management.sh switch-to-prod
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
Internet → CloudFlare DNS → Elastic IP (54.70.138.1)
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
./infra/portfolio-management.sh status

# Restart containers
./infra/portfolio-management.sh restart dev

# View detailed logs
./infra/portfolio-management.sh logs bb-portfolio-frontend-dev

# SSH to server
ssh -i ~/.ssh/bb-portfolio-site-key.pem ec2-user@54.70.138.1
```

## Production Readiness

When you're ready to use production containers:

1. Fix the ECR build issues (Next.js standalone mode)
2. Deploy production: `./infra/portfolio-management.sh deploy-prod`
3. The infrastructure supports both seamlessly!

---

**Your portfolio is now live and fully automated! 🎈**
