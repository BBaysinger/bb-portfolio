#!/bin/bash

# =============================================================================
# Complete Infrastructure Deployment Script
# =============================================================================
#
# This script orchestrates the entire deployment process:
# 1. Sync secrets from github-secrets.private.json5 to GitHub Actions
# 2. Destroy existing infrastructure (if exists)
# 3. Deploy fresh infrastructure via Terraform
# 4. Validate all 4 containers (prod + dev environments)
# 5. Perform comprehensive health checks
#
# Usage: ./deploy/scripts/full-deployment.sh.sh (replaced)
#
# Prerequisites:
# - github-secrets.private.json5 configured with current secrets
# - AWS CLI configured with appropriate credentials
# - Terraform installed and configured
# - SSH key available at ~/.ssh/bb-portfolio-site-key.pem
# =============================================================================

set -euo pipefail  # Exit on any error, undefined variable, or pipe failure

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# deploy/scripts -> repo root is two levels up
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
INFRA_DIR="${PROJECT_ROOT}/infra"
SSH_KEY="${HOME}/.ssh/bb-portfolio-site-key.pem"
SSH_OPTS=( -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=10 )

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_step() {
    echo -e "\n${BLUE}🔄 $1${NC}"
    echo "=============================================================="
}

# Error handling
cleanup() {
    local exit_code=$?
    if [[ $exit_code -ne 0 ]]; then
        log_error "Deployment failed with exit code $exit_code"
        log_warning "Infrastructure may be in an inconsistent state"
        log_info "Check the logs above for details"
    fi
    exit $exit_code
}

trap cleanup EXIT

# Validation functions
validate_prerequisites() {
    log_step "Validating Prerequisites"
    
    # Check required files
    if [[ ! -f "${PROJECT_ROOT}/.github-secrets.private.json5" ]]; then
        log_error "github-secrets.private.json5 not found in project root"
        exit 1
    fi
    
    if [[ ! -f "${SSH_KEY}" ]]; then
        log_error "SSH key not found at ${SSH_KEY}"
        exit 1
    fi
    
    # Check required tools (docker only needed if building images locally)
    local tools=(aws terraform node npm)
    if [[ -n "${BUILD_IMAGES_FLAG:-}" ]]; then
        tools+=(docker)
    fi
    for tool in "${tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "$tool is required but not installed"
            exit 1
        fi
    done
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured or invalid"
        exit 1
    fi
    
    # Verify SSH key permissions
    chmod 400 "${SSH_KEY}"
    
    log_success "All prerequisites validated"
}

prepare_initial_deployment() {
    log_step "Preparing Initial Deployment Configuration"
    
    cd "${PROJECT_ROOT}"
    
    # Install dependencies if needed
    if [[ ! -d "node_modules" ]]; then
        log_info "Installing npm dependencies..."
        npm install
    fi
    
    # Generate terraform.tfvars from secrets (with current IP, will be updated later)
    log_info "Generating initial terraform.tfvars from github-secrets.private.json5..."
    npx tsx deploy/scripts/generate-terraform-vars.ts
    
    log_success "Initial deployment configuration prepared"
}

sync_github_secrets_final() {
    log_step "Syncing Updated GitHub Secrets"
    
    cd "${PROJECT_ROOT}"
    
    # Run the sync script with updated IP addresses
    log_info "Syncing updated secrets to GitHub..."
    npx tsx scripts/sync-github-secrets.ts BBaysinger/bb-portfolio .github-secrets.private.json5
    
    log_success "GitHub secrets synchronized with updated IP addresses"
}

destroy_infrastructure() {
    local force_mode="${1:-false}"
    
    log_step "Destroying Existing Infrastructure"
    
    cd "${INFRA_DIR}"
    
    # Check if infrastructure exists
    if ! terraform state list &> /dev/null; then
        log_warning "No existing infrastructure found, skipping destroy"
        return
    fi
    
    # Initialize Terraform to ensure state is available
    terraform init -input=false > /dev/null 2>&1
    
    # Get current EC2 IP and instance info before showing destroy plan
    local current_ip
    current_ip=$(terraform output -raw public_ip 2>/dev/null || terraform output -raw elastic_ip 2>/dev/null || echo 'unknown')
    
    local instance_id
    instance_id=$(terraform output -raw instance_id 2>/dev/null || echo 'unknown')
    
    # Get list of resources for targeted destruction, preserving S3, ECR, and Elastic IP
    local resources_to_destroy=()
    while IFS= read -r resource; do
        # Skip S3 buckets and ECR resources entirely (preserve media and images)
        if [[ "$resource" =~ aws_s3_bucket ]]; then
            continue
        fi
        if [[ "$resource" =~ aws_ecr_repository|aws_ecr_lifecycle_policy ]]; then
            continue
        fi
        # Skip Elastic IP and its association (preserve static public IP)
        if [[ "$resource" =~ aws_eip$|aws_eip_association$ ]]; then
            continue
        fi
        resources_to_destroy+=("$resource")
    done < <(terraform state list)
    
    if [[ ${#resources_to_destroy[@]} -eq 0 ]]; then
        log_warning "No destroyable infrastructure found (S3/ECR/EIP preserved)"
        return
    fi
    
    # Show what will be destroyed (excluding S3/ECR/EIP)
    log_warning "The following infrastructure will be DESTROYED (S3 buckets, ECR repositories, and Elastic IP preserved):"
    for resource in "${resources_to_destroy[@]}"; do
        echo "  - $resource"
    done
    
    # Ask for confirmation unless force mode is enabled  
    if [[ "$force_mode" != "true" ]]; then
        echo -e "\n${RED}⚠️  WARNING: This will permanently delete your EC2 instance and all associated resources!${NC}"
        echo -e "${YELLOW}Current EC2 IP: ${current_ip}${NC}"
        
        if [[ "$instance_id" != "unknown" ]]; then
            echo -e "${YELLOW}Instance ID: ${instance_id}${NC}"
        fi
        
        echo -e "${YELLOW}This action cannot be undone!${NC}"
        echo ""
        echo -n "Are you sure you want to destroy the infrastructure? Type 'yes' to continue: "
        read confirm
        
        if [[ "$confirm" != "yes" ]]; then
            log_error "Infrastructure destruction cancelled by user"
            # Clean up the destroy plan file
            rm -f destroy-plan.tfplan
            exit 1
        fi
    else
        log_warning "Skipping confirmation prompt (force mode enabled)"
    fi
    
    log_info "Destroying EC2 infrastructure (preserving S3, ECR, and Elastic IP)..."
    
    # Build terraform destroy command with targeted resources (skip S3 buckets)
    local destroy_args=()
    for resource in "${resources_to_destroy[@]}"; do
        destroy_args+=("-target=$resource")
    done
    
    # Execute targeted destruction
    terraform destroy "${destroy_args[@]}" -auto-approve
    
    log_success "EC2 infrastructure destroyed (S3, ECR, and Elastic IP preserved)"
}

deploy_infrastructure() {
    log_step "Deploying Fresh Infrastructure"
    
    cd "${INFRA_DIR}"
    
    # Initialize Terraform
    log_info "Initializing Terraform..."
    terraform init
    
    # Validate configuration
    log_info "Validating Terraform configuration..."
    terraform validate
    
    # Plan deployment
    log_info "Planning infrastructure deployment..."
    terraform plan -out=tfplan
    
    # Apply deployment
    log_info "Applying infrastructure deployment..."
    terraform apply tfplan
    
    # Clean up plan file
    rm -f tfplan
    
    log_success "Infrastructure deployed successfully"
}

update_secrets_with_new_ip() {
    local new_ip="$1"
    log_step "Updating Secrets File with New IP Address"
    
    cd "${PROJECT_ROOT}"
    
    log_info "Updating github-secrets.private.json5 with new IP: ${new_ip}"
    
    # Use node to update the JSON5 file with the new IP
    npx tsx -e "
    import { readFileSync, writeFileSync } from 'fs';
    import JSON5 from 'json5';
    
    const secretsFile = '.github-secrets.private.json5';
    const content = readFileSync(secretsFile, 'utf8');
    const config = JSON5.parse(content);
    
    const oldIp = config.strings.EC2_HOST;
    const newIp = '${new_ip}';
    
    console.log(\`Updating IP from \${oldIp} to \${newIp}\`);
    
    // Update all IP references
    config.strings.EC2_HOST = newIp;
    config.strings.DEV_FRONTEND_URL = config.strings.DEV_FRONTEND_URL.replace(/http:\/\/[0-9.]+:/g, \`http://\${newIp}:\`);
    config.strings.PROD_FRONTEND_URL = config.strings.PROD_FRONTEND_URL.replace(/http:\/\/[0-9.]+:/g, \`http://\${newIp}:\`);
    config.strings.DEV_NEXT_PUBLIC_BACKEND_URL = config.strings.DEV_NEXT_PUBLIC_BACKEND_URL.replace(/http:\/\/[0-9.]+:/g, \`http://\${newIp}:\`);
    config.strings.PROD_NEXT_PUBLIC_BACKEND_URL = config.strings.PROD_NEXT_PUBLIC_BACKEND_URL.replace(/http:\/\/[0-9.]+:/g, \`http://\${newIp}:\`);
    config.strings.NEXT_PUBLIC_BACKEND_URL = config.strings.NEXT_PUBLIC_BACKEND_URL.replace(/http:\/\/[0-9.]+:/g, \`http://\${newIp}:\`);
    
    // Write back to file
    const updatedContent = '// Private secrets file for syncing to GitHub Actions secrets\n// This file is ignored by git. Keep real values here.\n// Do NOT commit this file to version control!\n// cspell:disable\n' + JSON5.stringify(config, null, 2);
    writeFileSync(secretsFile, updatedContent, 'utf8');
    
    console.log('Successfully updated secrets file with new IP address');
    "
    
    log_success "Secrets file updated with new IP: ${new_ip}"
}

get_ec2_ip() {
    cd "${INFRA_DIR}"
    # Prefer the Elastic IP from Terraform outputs
    local eip="" pip="" cli_ip=""
    eip=$(terraform output -raw portfolio_elastic_ip 2>/dev/null || true)
    pip=$(terraform output -raw portfolio_instance_ip 2>/dev/null || true)

    if [[ -n "$eip" && "$eip" != "null" ]]; then
        echo "$eip"
        return 0
    fi

    # Fallback to instance public_ip if EIP isn't available
    if [[ -n "$pip" && "$pip" != "null" ]]; then
        log_warning "Elastic IP not found in outputs; falling back to instance public_ip: $pip"
        echo "$pip"
        return 0
    fi

    # Final fallback: use AWS CLI to query the running instance by Name tag
    cli_ip=$(aws ec2 describe-instances --region us-west-2 \
      --filters "Name=tag:Name,Values=bb-portfolio" "Name=instance-state-name,Values=running" \
      --query 'Reservations[0].Instances[0].PublicIpAddress' --output text 2>/dev/null || true)
    if [[ -n "$cli_ip" && "$cli_ip" != "None" ]]; then
        log_warning "Using AWS CLI detected IP: $cli_ip"
        echo "$cli_ip"
        return 0
    fi

    log_error "Could not retrieve EC2 IP from Terraform outputs or AWS CLI"
    exit 1
}

update_env_files_on_ec2() {
    local ec2_ip="$1"
    log_step "Updating Environment Files on EC2 with Correct IP"
    
        log_info "Recreating environment files with updated IP: ${ec2_ip} (no secrets in repo)"

        # Wait for SSH to be ready
        wait_for_ssh "${ec2_ip}"

        # Generate environment files locally from private secrets and upload via scp
        local TMP_ENV_DIR
        TMP_ENV_DIR="$(mktemp -d)"

            log_info "Generating .env files from .github-secrets.private.json5..."
            pushd "${PROJECT_ROOT}" >/dev/null
            # Write a temporary JS module to avoid shell expansion of ${...}
            local TMP_JS
            TMP_JS="${TMP_ENV_DIR}/gen-env.mjs"
            cat > "${TMP_JS}" <<'JS'
    import { readFileSync, writeFileSync, mkdirSync } from 'fs';
    import JSON5 from 'json5';

    const OUT_DIR = process.env.OUT_DIR || '';
    const IP = process.env.EC2_IP || '';
    const secretsFile = '.github-secrets.private.json5';
    const cfg = JSON5.parse(readFileSync(secretsFile, 'utf8'));
    const s = (cfg.strings || cfg);
    const ensure = (k, d = '') => (s[k] ?? d);

    // Prefer values already updated by update_secrets_with_new_ip
    const PROD_FRONTEND_URL = ensure('PROD_FRONTEND_URL', `https://bbinteractive.io,http://${IP}:3000`);
    const DEV_FRONTEND_URL  = ensure('DEV_FRONTEND_URL',  `https://dev.bbinteractive.io,http://${IP}:4000`);
    const PROD_BACKEND_URL  = ensure('PROD_NEXT_PUBLIC_BACKEND_URL', `http://${IP}:3001`);
    const DEV_BACKEND_URL   = ensure('DEV_NEXT_PUBLIC_BACKEND_URL',  `http://${IP}:4001`);

    const prodBackend = [
        'NODE_ENV=production',
        'ENV_PROFILE=prod',
        '',
        // AWS
        `AWS_ACCESS_KEY_ID=${ensure('AWS_ACCESS_KEY_ID')}`,
        `AWS_SECRET_ACCESS_KEY=${ensure('AWS_SECRET_ACCESS_KEY')}`,
        `PROD_AWS_REGION=${ensure('PROD_AWS_REGION', ensure('AWS_REGION'))}`,
        '',
        // DB & App
        `PROD_MONGODB_URI=${ensure('PROD_MONGODB_URI')}`,
        `PROD_PAYLOAD_SECRET=${ensure('PROD_PAYLOAD_SECRET')}`,
        '',
        // S3
        `PROD_S3_BUCKET=${ensure('PROD_S3_BUCKET')}`,
        `S3_AWS_ACCESS_KEY_ID=${ensure('S3_AWS_ACCESS_KEY_ID', ensure('AWS_ACCESS_KEY_ID'))}`,
        `S3_AWS_SECRET_ACCESS_KEY=${ensure('S3_AWS_SECRET_ACCESS_KEY', ensure('AWS_SECRET_ACCESS_KEY'))}`,
        `S3_REGION=${ensure('S3_REGION', ensure('PROD_AWS_REGION'))}`,
        '',
        // URLs
        `PROD_FRONTEND_URL=${PROD_FRONTEND_URL}`,
        `PROD_NEXT_PUBLIC_BACKEND_URL=${PROD_BACKEND_URL}`,
        `PROD_BACKEND_INTERNAL_URL=${ensure('PROD_BACKEND_INTERNAL_URL', 'http://portfolio-backend-prod:3000')}`,
        '',
        // Email
        `PROD_SES_FROM_EMAIL=${ensure('PROD_SES_FROM_EMAIL')}`,
        `PROD_SES_TO_EMAIL=${ensure('PROD_SES_TO_EMAIL')}`,
        ''
    ].join('\n');

    const devBackend = [
        'NODE_ENV=development',
        'ENV_PROFILE=dev',
        '',
        // AWS
        `AWS_ACCESS_KEY_ID=${ensure('AWS_ACCESS_KEY_ID')}`,
        `AWS_SECRET_ACCESS_KEY=${ensure('AWS_SECRET_ACCESS_KEY')}`,
        `DEV_AWS_REGION=${ensure('DEV_AWS_REGION', ensure('AWS_REGION'))}`,
        '',
        // DB & App
        `DEV_MONGODB_URI=${ensure('DEV_MONGODB_URI')}`,
        `DEV_PAYLOAD_SECRET=${ensure('DEV_PAYLOAD_SECRET')}`,
        '',
        // S3
        `DEV_S3_BUCKET=${ensure('DEV_S3_BUCKET')}`,
        `S3_AWS_ACCESS_KEY_ID=${ensure('S3_AWS_ACCESS_KEY_ID', ensure('AWS_ACCESS_KEY_ID'))}`,
        `S3_AWS_SECRET_ACCESS_KEY=${ensure('S3_AWS_SECRET_ACCESS_KEY', ensure('AWS_SECRET_ACCESS_KEY'))}`,
        `S3_REGION=${ensure('S3_REGION', ensure('DEV_AWS_REGION'))}`,
        '',
        // URLs
        `DEV_FRONTEND_URL=${DEV_FRONTEND_URL}`,
        `DEV_NEXT_PUBLIC_BACKEND_URL=${DEV_BACKEND_URL}`,
        `DEV_BACKEND_INTERNAL_URL=${ensure('DEV_BACKEND_INTERNAL_URL', 'http://portfolio-backend-dev:3000')}`,
        '',
        // Email
        `DEV_SES_FROM_EMAIL=${ensure('DEV_SES_FROM_EMAIL')}`,
        `DEV_SES_TO_EMAIL=${ensure('DEV_SES_TO_EMAIL')}`,
        ''
    ].join('\n');

    const prodFrontend = [
        'NODE_ENV=production',
        'ENV_PROFILE=prod',
        '',
        `NEXT_PUBLIC_BACKEND_URL=${PROD_BACKEND_URL}`,
        ''
    ].join('\n');

    const devFrontend = [
        'NODE_ENV=development',
        'ENV_PROFILE=dev',
        '',
        `NEXT_PUBLIC_BACKEND_URL=${DEV_BACKEND_URL}`,
        ''
    ].join('\n');

    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(`${OUT_DIR}/backend.env.prod`, prodBackend);
    writeFileSync(`${OUT_DIR}/backend.env.dev`, devBackend);
    writeFileSync(`${OUT_DIR}/frontend.env.prod`, prodFrontend);
    writeFileSync(`${OUT_DIR}/frontend.env.dev`, devFrontend);
    console.log(`Local env files generated at: ${OUT_DIR}`);
    JS
            # Run the generator with environment variables
            OUT_DIR="${TMP_ENV_DIR}" EC2_IP="${ec2_ip}" npx tsx "${TMP_JS}"
            
            # Validate required env vars exist before uploading (fail fast, don't print values)
            log_info "Validating generated env files have required keys..."
            validate_env_file() {
                local file="$1"; shift
                local missing=()
                for key in "$@"; do
                    if ! grep -qE "^${key}=.+$" "$file"; then
                        missing+=("$key")
                    fi
                done
                if (( ${#missing[@]} > 0 )); then
                    log_error "Missing required keys in $(basename "$file"): ${missing[*]}"
                    log_info "Ensure these are present in .github-secrets.private.json5 under 'strings' and rerun."
                    exit 1
                fi
            }

            validate_env_file "${TMP_ENV_DIR}/backend.env.prod" \
                PROD_MONGODB_URI PROD_PAYLOAD_SECRET PROD_S3_BUCKET PROD_AWS_REGION \
                PROD_FRONTEND_URL PROD_NEXT_PUBLIC_BACKEND_URL
            validate_env_file "${TMP_ENV_DIR}/backend.env.dev" \
                DEV_MONGODB_URI DEV_PAYLOAD_SECRET DEV_S3_BUCKET DEV_AWS_REGION \
                DEV_FRONTEND_URL DEV_NEXT_PUBLIC_BACKEND_URL
            popd >/dev/null

        log_info "Uploading env files to EC2..."
        # Ensure target directories exist
        ssh -i "${SSH_KEY}" "${SSH_OPTS[@]}" ec2-user@"${ec2_ip}" "mkdir -p /home/ec2-user/portfolio/backend /home/ec2-user/portfolio/frontend"

        scp -i "${SSH_KEY}" "${SSH_OPTS[@]}" "${TMP_ENV_DIR}/backend.env.prod"  ec2-user@"${ec2_ip}":/home/ec2-user/portfolio/backend/.env.prod
        scp -i "${SSH_KEY}" "${SSH_OPTS[@]}" "${TMP_ENV_DIR}/backend.env.dev"   ec2-user@"${ec2_ip}":/home/ec2-user/portfolio/backend/.env.dev
        scp -i "${SSH_KEY}" "${SSH_OPTS[@]}" "${TMP_ENV_DIR}/frontend.env.prod" ec2-user@"${ec2_ip}":/home/ec2-user/portfolio/frontend/.env.prod
        scp -i "${SSH_KEY}" "${SSH_OPTS[@]}" "${TMP_ENV_DIR}/frontend.env.dev"  ec2-user@"${ec2_ip}":/home/ec2-user/portfolio/frontend/.env.dev

        # Restart containers with new environment files
        log_info "Restarting containers with updated environment files (prod profile)..."
        ssh -i "${SSH_KEY}" "${SSH_OPTS[@]}" ec2-user@"${ec2_ip}" $'set +e
cd /home/ec2-user/portfolio
# Login to ECR to ensure pulls succeed
aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin 778230822028.dkr.ecr.us-west-2.amazonaws.com >/dev/null 2>&1 || true
# Try to stop existing resources; ignore if none exist
docker-compose down || true
# Pull latest images for prod services (ignore errors)
COMPOSE_PROFILES=prod docker-compose pull || true
# Try to start prod services, fallback to dev if images not found
COMPOSE_PROFILES=prod docker-compose up -d || {
        echo "Prod images not available or failed to start. Fallback to dev profile..."
        COMPOSE_PROFILES=dev docker-compose up -d || exit 1
}

# Also start dev profile to serve dev.bbinteractive.io (ports 4000/4001)
echo "Starting dev profile alongside prod to power dev subdomain..."
COMPOSE_PROFILES=dev docker-compose up -d || true
'

        log_success "Environment files updated and containers restarted with correct IP"
}

wait_for_ssh() {
    local ec2_ip="$1"
    local max_attempts=30
    local attempt=1
    
    log_info "Waiting for SSH access to EC2 instance (${ec2_ip})..."
    
    while [[ $attempt -le $max_attempts ]]; do
        if ssh -i "${SSH_KEY}" \
            -o ConnectTimeout=10 \
            -o StrictHostKeyChecking=no \
            -o UserKnownHostsFile=/dev/null \
            ec2-user@"${ec2_ip}" "echo 'SSH connection successful'" &> /dev/null; then
            log_success "SSH connection established"
            return 0
        fi
        
        log_info "Attempt ${attempt}/${max_attempts} - SSH not ready yet, waiting 10 seconds..."
        sleep 10
        ((attempt++))
    done
    
    log_error "SSH connection failed after ${max_attempts} attempts"
    exit 1
}

wait_for_containers() {
    local ec2_ip="$1"
    local max_attempts=60
    local attempt=1
    
    log_info "Waiting for all containers to be healthy..."
    
    while [[ $attempt -le $max_attempts ]]; do
        # Check container status
        local container_status
        container_status=$(ssh -i "${SSH_KEY}" ec2-user@"${ec2_ip}" 'cd /home/ec2-user/portfolio && docker-compose ps --format "table {{.Name}}\t{{.Status}}" | grep -E "(frontend|backend)"' 2>/dev/null || true)
        
        if [[ -n "$container_status" ]]; then
            log_info "Container status (attempt ${attempt}/${max_attempts}):"
            echo "$container_status"
            
            # Check if all containers are up and healthy
            local unhealthy_count
            unhealthy_count=$(echo "$container_status" | grep -c "unhealthy\|starting" || true)
            
            if [[ $unhealthy_count -eq 0 ]] && echo "$container_status" | grep -q "Up"; then
                log_success "All containers are healthy"
                return 0
            fi
        fi
        
        log_info "Waiting for containers to be healthy..."
        sleep 15
        ((attempt++))
    done
    
    log_warning "Containers did not become healthy within expected time, but continuing with validation..."
}

validate_deployment() {
    log_step "Validating Complete Deployment"
    
    local ec2_ip
    ec2_ip=$(get_ec2_ip)
    
    log_info "EC2 Public IP: ${ec2_ip}"
    
    # Wait for SSH access
    wait_for_ssh "${ec2_ip}"
    
    # Check Docker installation
    log_info "Verifying Docker installation..."
    ssh -i "${SSH_KEY}" ec2-user@"${ec2_ip}" 'docker --version && docker-compose version'
    
    # Check generated files
    log_info "Verifying generated configuration files..."
    ssh -i "${SSH_KEY}" ec2-user@"${ec2_ip}" 'cd /home/ec2-user/portfolio && echo "=== Directory structure ===" && ls -la && echo -e "\n=== Backend .env.prod ===" && ls -la backend/ && echo -e "\n=== Frontend .env.prod ===" && ls -la frontend/'
    
    # Wait for containers to start
    wait_for_containers "${ec2_ip}"
    
    # Test endpoints
    log_info "Testing application endpoints..."
    
    # Test frontend (prod 3000 or dev 4000)
    if ssh -i "${SSH_KEY}" "${SSH_OPTS[@]}" ec2-user@"${ec2_ip}" 'curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/' | grep -q "200"; then
        log_success "Frontend prod (port 3000) is responding"
    elif ssh -i "${SSH_KEY}" "${SSH_OPTS[@]}" ec2-user@"${ec2_ip}" 'curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/' | grep -q "200"; then
        log_success "Frontend dev (port 4000) is responding"
    else
        log_warning "Frontend not responding on ports 3000/4000"
    fi

    # Test backend (prod 3001 or dev 4001)
    if ssh -i "${SSH_KEY}" "${SSH_OPTS[@]}" ec2-user@"${ec2_ip}" 'curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health' | grep -q "200"; then
        log_success "Backend prod (port 3001) is responding"
    elif ssh -i "${SSH_KEY}" "${SSH_OPTS[@]}" ec2-user@"${ec2_ip}" 'curl -s -o /dev/null -w "%{http_code}" http://localhost:4001/api/health' | grep -q "200"; then
        log_success "Backend dev (port 4001) is responding"
    else
        log_warning "Backend not responding on ports 3001/4001"
    fi
    
    # Show final status
    log_info "Final container status:"
    ssh -i "${SSH_KEY}" "${SSH_OPTS[@]}" ec2-user@"${ec2_ip}" 'cd /home/ec2-user/portfolio && docker-compose ps'
    
    log_success "Deployment validation completed"
}

show_deployment_summary() {
    log_step "Deployment Summary"
    
    local ec2_ip
    ec2_ip=$(get_ec2_ip)
    
    echo -e "${GREEN}"
    echo "🎉 Infrastructure deployment completed successfully!"
    echo ""
    echo "📋 Access Information:"
    echo "   • EC2 Instance: ${ec2_ip}"
    echo "   • Frontend:     http://${ec2_ip}:3000/"
    echo "   • Backend API:  http://${ec2_ip}:3001/api/health"
    echo ""
    echo "🐳 Container Management:"
    echo "   • SSH: ssh -i ~/.ssh/bb-portfolio-site-key.pem ec2-user@${ec2_ip}"
    echo "   • Status: docker-compose ps"
    echo "   • Logs: docker-compose logs [service-name]"
    echo ""
    echo "🔧 Available Services:"
    echo "   • frontend-prod (port 3000) - Production frontend"
    echo "   • backend-prod  (port 3001) - Production backend"
    echo "   • frontend-dev  (port 4000) - Development frontend"
    echo "   • backend-dev   (port 4001) - Development backend"
    echo ""
    echo "💡 To start dev containers:"
    echo "   • COMPOSE_PROFILES=dev docker-compose up -d"
    echo ""
    echo -e "${NC}"
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

main() {
    # Parse command line arguments
    local force_destroy=false
    local build_images=""
    while [[ $# -gt 0 ]]; do
        case $1 in
            --force)
                force_destroy=true
                shift
                ;;
            --build-images)
                build_images="${2:-}"
                if [[ -z "$build_images" ]]; then
                    log_error "--build-images requires a value: prod|dev|both"
                    exit 1
                fi
                case "$build_images" in
                    prod|dev|both) ;;
                    *)
                        log_error "Invalid value for --build-images: '$build_images'. Use prod|dev|both."
                        exit 1
                        ;;
                esac
                shift 2
                ;;
            -h|--help)
                echo "Usage: $0 [--force] [--build-images prod|dev|both]"
                echo ""
                echo "Options:"
                echo "  --force    Skip confirmation prompt for infrastructure destruction"
                echo "  --build-images prod|dev|both  Rebuild and push images before deploy"
                echo "  -h, --help Show this help message"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                echo "Use -h or --help for usage information"
                exit 1
                ;;
        esac
    done

    # Support passing flags via `npm run iac:full-redeploy --force` without the extra `--`.
    # npm exposes CLI flags as env vars like npm_config_force=true, npm_config_build_images=prod
    if [[ "$force_destroy" == false && "${npm_config_force:-}" == "true" ]]; then
        log_info "Detected npm --force; enabling force mode"
        force_destroy=true
    fi
    if [[ -z "$build_images" && -n "${npm_config_build_images:-}" ]]; then
        build_images="${npm_config_build_images}"
        case "$build_images" in
            prod|dev|both) ;;
            *)
                log_error "Invalid value for npm --build-images: '$build_images'. Use prod|dev|both."
                exit 1
                ;;
        esac
        log_info "Detected npm --build-images=$build_images"
    fi

    # Optionally rebuild and push images prior to infra changes
    if [[ -n "$build_images" ]]; then
        # Mark that we need docker available
        export BUILD_IMAGES_FLAG=1
        log_step "Rebuilding container images per flag: $build_images"
        pushd "$PROJECT_ROOT" >/dev/null
        if [[ "$build_images" == "prod" || "$build_images" == "both" ]]; then
            log_info "Building and pushing production images to ECR (npm run ecr:build-push)"
            npm run ecr:build-push
            log_success "Production images pushed to ECR"
        fi
        if [[ "$build_images" == "dev" || "$build_images" == "both" ]]; then
            log_info "Building and pushing development images to Docker Hub (npm run docker:build-push)"
            npm run docker:build-push
            log_success "Development images pushed to Docker Hub"
        fi
        popd >/dev/null
    fi

    log_step "Starting Complete Infrastructure Deployment"
    echo "This will:"
    echo "1. 🔧 Prepare deployment configuration"
    echo "2. 🗑️  Destroy existing infrastructure"
    echo "3. 🚀 Deploy fresh infrastructure"  
    echo "4. 🎯 Capture new IP and update configuration"
    echo "5. ✅ Sync updated secrets to GitHub"
    echo "6. ✅ Validate all components"
    echo ""
    
    if [[ "$force_destroy" == true ]]; then
        log_warning "Running in FORCE mode - infrastructure will be destroyed without confirmation"
    fi
    
    # Validate prerequisites
    validate_prerequisites
    
    # Prepare initial deployment (generate terraform vars, install deps)
    prepare_initial_deployment
    
    # Destroy existing infrastructure
    if [[ "$force_destroy" == true ]]; then
        destroy_infrastructure "true"
    else
        destroy_infrastructure "false"
    fi
    
    # Deploy fresh infrastructure
    deploy_infrastructure
    
    # Capture and update the new IP address
    local new_ec2_ip
    new_ec2_ip=$(get_ec2_ip)
    update_secrets_with_new_ip "${new_ec2_ip}"
    
    # Regenerate terraform variables with updated IP
    log_info "Regenerating terraform variables with updated IP..."
    npx tsx deploy/scripts/generate-terraform-vars.ts
    
    # Update environment files on EC2 with correct IP
    update_env_files_on_ec2 "${new_ec2_ip}"
    
    # Sync updated secrets to GitHub
    sync_github_secrets_final
    
    # Validate deployment
    validate_deployment
    
    # Show summary
    show_deployment_summary
    
    log_success "🎉 Complete infrastructure deployment finished successfully!"
}

# Run main function
main "$@"