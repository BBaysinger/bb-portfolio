# Portfolio Infrastructure

This directory contains the Terraform configuration and management scripts for the BB-Portfolio AWS infrastructure.

## Infrastructure Overview

The infrastructure includes:

- **AWS EC2 Instance** (t3.medium) with Elastic IP
- **Nginx Reverse Proxy** for HTTP traffic routing
- **Docker Containers** for frontend/backend services
- **ECR Repositories** for production container images
- **S3 Buckets** for media storage
- **IAM Roles & Policies** for secure access

## Quick Start

### 1. Deploy Infrastructure

```bash
# Initialize Terraform (first time only)
terraform init

# Plan the deployment
terraform plan

# Apply the infrastructure
terraform apply
```

### 2. Sync Environment Variables

After deployment, sync the infrastructure state to your environment configuration:

```bash
# Sync .env file with current Terraform state
./sync-env-from-terraform.sh

# Or from repo root:
npm run infra:sync-env
```

This ensures your `.env` file contains the actual deployed infrastructure values (like Elastic IP).

### 3. Get Connection Info

After deployment, Terraform outputs important connection details:

```bash
# Get the public IP address
terraform output bb_portfolio_elastic_ip

# Get SSH command
terraform output bb_portfolio_ssh_command

# Get website URL
terraform output bb_portfolio_website_url
```

### 3. Manage Containers

Use the provided management script to control the Docker containers:

```bash
# Show container status
./bb-portfolio-management.sh status

# Start development containers (default)
./bb-portfolio-management.sh start dev

# Deploy production containers from ECR
./bb-portfolio-management.sh deploy-prod

# Switch between environments
./bb-portfolio-management.sh switch-to-dev
./bb-portfolio-management.sh switch-to-prod

# View logs
./bb-portfolio-management.sh logs bb-portfolio-frontend-dev
```

## Container Profiles

### Development Profile (`dev`)

- Uses Docker Hub images (`bhbaysinger/bb-portfolio-*:dev`)
- Frontend runs on port 4000
- Backend runs on port 4001
- More reliable for immediate deployment
- Used by default

### Production Profile (`prod`)

- Uses ECR images built by CI/CD pipeline
- Frontend runs on port 3000
- Backend runs on port 3001
- Requires AWS ECR authentication
- Used for production deployments

## Nginx Configuration

Nginx is automatically configured to:

- Listen on port 80 for HTTP traffic
- Proxy requests to the appropriate container ports
- Serve the canonical hosts `bbaysinger.com` and `www.bbaysinger.com` (deprecated domains removed)
- Handle API routes separately (`/api/` → backend)

The configuration automatically points to development containers (port 4000) by default, but can be switched to production containers (port 3000) using the management script.

## Dual Environment Co-Hosting (Non-Standard Design)

Both the `dev` and `prod` profiles are intentionally run concurrently on the SAME EC2 instance (and during blue‑green cycles, on both active and candidate instances). This is a deliberate cost optimization for a portfolio project and deviates from conventional isolation where each environment would have its own host (or autoscaling group).

### Why Co-Host?

- Reduce monthly spend (one t3.medium instead of two instances)
- Demonstrate full stack (SSR + API) for both environments without doubling infra
- Keep operational complexity low (single host to patch, monitor, snapshot)

### Trade-Offs / Risks

- Shared resource contention: CPU, memory, and disk spikes in one profile can impact the other.
- Larger blast radius: Host failure or misconfiguration affects both environments simultaneously.
- Security blast surface: Although containers are separate, kernel/host layer compromise impacts both.
- Performance tuning complexity: Harder to attribute bottlenecks when workloads overlap.

### Mitigations Implemented

- Distinct ports (prod: 3000/3001, dev: 4000/4001) with explicit nginx routing.
- Blue‑green candidate deployments allow validation of BOTH profiles before promotion.
- Retention policy preserves last healthy instance for rollback (`--prune-after-promotion` optional).
- Secrets and env files generated per profile; no cross-pollution of runtime configuration.
- Registry separation: ECR for prod, Docker Hub for dev to reduce accidental image mix-ups.

### When to Revisit

Move to isolated hosts (or autoscaling groups) if any of these become priorities:

1. Sustained CPU > 60% or memory pressure leading to swap.
2. Need for independent scaling (e.g., prod traffic grows but dev remains light).
3. Stricter security/compliance boundaries.
4. Desire for zero shared blast radius during experimentation.

### Monitoring Suggestions

Add lightweight host dashboards (CloudWatch or Node Exporter + Grafana) if contention becomes frequent. Until then, manual inspection via `docker stats` + `top` is sufficient.

> NOTE: Documentation in other folders (deployment scripts, architecture decisions) mirrors this non-standard co-hosting choice. Treat this as an intentional, reversible optimization rather than a best practice.

## DNS Setup

After infrastructure deployment:

1. Get the Elastic IP: `terraform output bb_portfolio_elastic_ip`
2. Configure DNS A records:
   - `bbaysinger.com` → `<elastic_ip>`
   - `www.bbaysinger.com` → `<elastic_ip>`

## File Structure

```
infra/
├── main.tf                    # Main Terraform configuration
├── variables.tf               # Input variables
├── terraform.tfvars          # Variable values
├── outputs.tf                # Output definitions (if separate)
├── bb-portfolio-management.sh   # Container management script
└── README.md                 # This file
```

## Key Features

### Automated Setup

- EC2 instance automatically configured with Docker, Nginx, and containers
- Systemd service ensures containers start on boot
- Nginx reverse proxy pre-configured

### Container Management

- Development and production container profiles
- Easy switching between environments
- Automatic ECR authentication for production images
- Health checks and restart policies

### Security

- IAM roles with minimal required permissions
- Encrypted EBS volumes
- Private S3 buckets with access controls
- Security group with only necessary ports (22, 80, 443)

### Monitoring & Logs

- Container health checks
- Centralized logging via Docker
- SystemD service management
- Nginx access logs

## Troubleshooting

### Check Container Status

```bash
./bb-portfolio-management.sh status
```

### View Container Logs

```bash
./bb-portfolio-management.sh logs bb-portfolio-frontend-dev
./bb-portfolio-management.sh logs bb-portfolio-backend-dev
```

### SSH to Instance

```bash
# Use output from Terraform
ssh -i ~/.ssh/bb-portfolio-site-key.pem ec2-user@<elastic_ip>

# Or use the provided command
$(terraform output -raw bb_portfolio_ssh_command)
```

### Restart Services

```bash
# Restart containers
./bb-portfolio-management.sh restart dev

# Restart Nginx
ssh -i ~/.ssh/bb-portfolio-site-key.pem ec2-user@<ip> 'sudo systemctl restart nginx'
```

### Switch Container Profiles

```bash
# Switch to development (Docker Hub images)
./bb-portfolio-management.sh switch-to-dev

# Switch to production (ECR images)
./bb-portfolio-management.sh switch-to-prod
```

## Cost Optimization

- t3.medium instance provides good performance/cost balance
- ECR lifecycle policies limit stored images to 10 most recent
- S3 buckets use standard storage (can upgrade to IA/Glacier if needed)
- Elastic IP prevents charges for IP changes

## Security Considerations

- SSH key required for instance access (not included in repo)
- IAM roles use principle of least privilege
- S3 buckets block public access by default
- Container images scanned for vulnerabilities
- Nginx configured with security headers

## Maintenance

### Update Container Images

Production images are updated automatically via CI/CD pipeline. For development:

```bash
# Pull latest development images
./bb-portfolio-management.sh stop dev
./bb-portfolio-management.sh start dev
```

### Update Infrastructure

```bash
# Review changes
terraform plan

# Apply updates
terraform apply
```

### Backup Important Data

- S3 buckets have versioning enabled
- Consider regular AMI snapshots for disaster recovery
- Document any manual configuration changes
