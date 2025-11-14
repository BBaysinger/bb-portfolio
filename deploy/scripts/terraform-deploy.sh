#!/bin/bash
# Infrastructure as Code Deployment Script
# Handles complete infrastructure deployment with automated SSH key management

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# scripts/iac -> repo root is two levels up
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
INFRA_DIR="$PROJECT_ROOT/infra"
SSH_KEY_PATH="$HOME/.ssh/bb-portfolio-site-key.pem"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if we're in the right directory
    if [[ ! -f "$INFRA_DIR/main.tf" ]]; then
        log_error "Terraform configuration not found at $INFRA_DIR/main.tf"
        exit 1
    fi
    
    # Check if SSH key exists
    if [[ ! -f "$SSH_KEY_PATH" ]]; then
        log_error "SSH key not found at $SSH_KEY_PATH"
        exit 1
    fi
    
    # Check if terraform is installed
    if ! command -v terraform &> /dev/null; then
        log_error "Terraform is not installed or not in PATH"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Deploy infrastructure
deploy_infrastructure() {
    log_info "Starting Terraform deployment..."
    
    cd "$INFRA_DIR"
    
    # Initialize Terraform (safe to run multiple times)
    log_info "Initializing Terraform..."
    terraform init
    
    # Plan the deployment
    log_info "Planning deployment..."
    terraform plan -out=tfplan
    
    # Apply the deployment
    log_info "Applying infrastructure changes..."
    terraform apply tfplan
    
    # Clean up plan file
    rm -f tfplan
    
    log_success "Infrastructure deployment completed"
}

# Get infrastructure outputs
get_infrastructure_outputs() {
    cd "$INFRA_DIR"
    
    # Get the public IP
    PUBLIC_IP=$(terraform output -raw public_ip)
    INSTANCE_ID=$(terraform output -raw instance_id)
    
    log_info "Infrastructure outputs:"
    log_info "  Public IP: $PUBLIC_IP"
    log_info "  Instance ID: $INSTANCE_ID"
    
    # Export for use in other functions
    export PUBLIC_IP INSTANCE_ID
}

# Handle SSH host key management (IaC approach)
manage_ssh_keys() {
    log_info "Managing SSH host keys for $PUBLIC_IP..."
    
    # Remove old host key if it exists (prevents SSH warnings)
    ssh-keygen -R "$PUBLIC_IP" 2>/dev/null || true
    
    # Wait for SSH to be available and get new host key
    log_info "Waiting for SSH service to be available..."
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if ssh-keyscan -H "$PUBLIC_IP" >> ~/.ssh/known_hosts 2>/dev/null; then
            log_success "SSH host key added successfully"
            break
        fi
        
        log_info "Attempt $attempt/$max_attempts: SSH not ready, waiting 10 seconds..."
        sleep 10
        ((attempt++))
    done
    
    if [[ $attempt -gt $max_attempts ]]; then
        log_error "SSH service did not become available within expected time"
        exit 1
    fi
}

# Validate deployment
validate_deployment() {
    log_info "Validating infrastructure deployment..."
    
    # Test SSH connection
    log_info "Testing SSH connection..."
    if ssh -i "$SSH_KEY_PATH" -o ConnectTimeout=10 -o BatchMode=yes ec2-user@"$PUBLIC_IP" "echo 'SSH connection successful'" &>/dev/null; then
        log_success "SSH connection test passed"
    else
        log_error "SSH connection test failed"
        return 1
    fi
    
    # Check if user_data script has completed
    log_info "Checking user_data script execution..."
    local cloud_init_status
    cloud_init_status=$(ssh -i "$SSH_KEY_PATH" -o ConnectTimeout=10 ec2-user@"$PUBLIC_IP" "sudo cloud-init status" 2>/dev/null || echo "unknown")
    
    log_info "Cloud-init status: $cloud_init_status"
    
    # Check if Docker is running
    log_info "Checking Docker service status..."
    if ssh -i "$SSH_KEY_PATH" -o ConnectTimeout=10 ec2-user@"$PUBLIC_IP" "sudo systemctl is-active docker" &>/dev/null; then
        log_success "Docker service is running"
    else
        log_warning "Docker service not yet running (user_data may still be executing)"
    fi
    
    # Check if Nginx is running
    log_info "Checking Nginx service status..."
    if ssh -i "$SSH_KEY_PATH" -o ConnectTimeout=10 ec2-user@"$PUBLIC_IP" "sudo systemctl is-active nginx" &>/dev/null; then
        log_success "Nginx service is running"
    else
        log_warning "Nginx service not yet running (user_data may still be executing)"
    fi
    
    log_success "Infrastructure validation completed"
}

# Check application status
check_application_status() {
    log_info "Checking application deployment status..."
    
    # Check if containers are running
    local container_status
    container_status=$(ssh -i "$SSH_KEY_PATH" -o ConnectTimeout=10 ec2-user@"$PUBLIC_IP" "docker ps --format 'table {{.Names}}\t{{.Status}}'" 2>/dev/null || echo "No containers running")
    
    log_info "Container status:"
    echo "$container_status"
    
    # Test HTTP response
    log_info "Testing HTTP response..."
    local http_status
    http_status=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 "http://$PUBLIC_IP" || echo "000")
    
    if [[ "$http_status" == "200" ]]; then
        log_success "Application is responding (HTTP $http_status)"
    elif [[ "$http_status" == "000" ]]; then
        log_warning "Application not responding (connection failed)"
    else
        log_warning "Application responding with HTTP $http_status"
    fi
    
    # Show useful URLs
    log_info "Application URLs:"
    log_info "  Website: http://$PUBLIC_IP"
    log_info "  Admin: http://$PUBLIC_IP/admin"
    log_info "  API: http://$PUBLIC_IP/api"
}

# Show deployment summary
show_deployment_summary() {
    log_success "=== DEPLOYMENT SUMMARY ==="
    log_info "Infrastructure deployed successfully!"
    log_info "Public IP: $PUBLIC_IP"
    log_info "Instance ID: $INSTANCE_ID"
    log_info ""
    log_info "SSH Access:"
    log_info "  ssh -i $SSH_KEY_PATH ec2-user@$PUBLIC_IP"
    log_info ""
    log_info "Application URLs:"
    log_info "  Website: http://$PUBLIC_IP"
    log_info "  Admin: http://$PUBLIC_IP/admin"
    log_info "  API: http://$PUBLIC_IP/api"
    log_info ""
    log_info "Next steps:"
    log_info "1. Wait for user_data script to complete (check cloud-init status)"
    log_info "2. Deploy application containers via GitHub Actions"
    log_info "3. Test application functionality"
}

# Main deployment workflow
main() {
    log_info "Starting Infrastructure as Code deployment..."
    log_info "Timestamp: $(date)"
    log_info "Project: BB-Portfolio"
    log_info ""
    
    check_prerequisites
    deploy_infrastructure
    get_infrastructure_outputs
    manage_ssh_keys
    validate_deployment
    check_application_status
    show_deployment_summary
    
    log_success "Infrastructure deployment completed successfully!"
}

# Handle script interruption
trap 'log_error "Deployment interrupted"; exit 1' INT TERM

# Run main function
main "$@"