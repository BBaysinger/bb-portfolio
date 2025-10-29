#!/bin/bash
# Sync environment variables from Terraform output to .env file
# This ensures .env stays in sync with actual infrastructure state
#
# Usage:
#   ./sync-env-from-terraform.sh         # Interactive mode with confirmation
#   ./sync-env-from-terraform.sh --force # Skip confirmation (for CI/automation)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$REPO_ROOT/.env"
FORCE_MODE=false

# Parse arguments
for arg in "$@"; do
    case $arg in
        --force|-f)
            FORCE_MODE=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [--force]"
            echo ""
            echo "Sync environment variables from Terraform output to .env file"
            echo ""
            echo "Options:"
            echo "  --force, -f    Skip confirmation prompt (for automation)"
            echo "  --help,  -h    Show this help"
            exit 0
            ;;
        *)
            echo "Unknown option: $arg"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

echo "🔄 Syncing Terraform output to .env file..."

# Check if we're in the infra directory or can access Terraform
if [ ! -f "terraform.tfstate" ] && [ ! -f ".terraform/terraform.tfstate" ]; then
    echo "❌ Error: No Terraform state found. Run from infra directory or ensure Terraform is initialized."
    exit 1
fi

# Get current values from Terraform
ELASTIC_IP=$(terraform output -raw bb_portfolio_elastic_ip 2>/dev/null || echo "")

if [ -z "$ELASTIC_IP" ]; then
    echo "❌ Error: Could not get Elastic IP from Terraform output"
    echo "   Make sure Terraform has been applied and infrastructure exists"
    exit 1
fi

# Show what will be changed
echo ""
echo "📋 Current .env file:"
if [ -f "$ENV_FILE" ]; then
    grep -E "^(AWS_ACCOUNT_ID|EC2_INSTANCE_IP)=" "$ENV_FILE" || echo "   (No relevant variables found)"
else
    echo "   File does not exist"
fi

echo ""
echo "🔄 Proposed changes:"
echo "   EC2_INSTANCE_IP will be set to: $ELASTIC_IP"

echo ""
if [ "$FORCE_MODE" = false ]; then
    echo "⚠️  This will modify the committed .env file"
    read -p "Do you want to continue? (y/N): " -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]([Ee][Ss])?$ ]]; then
        echo "❌ Sync cancelled by user"
        exit 0
    fi
else
    echo "🤖 Running in --force mode, skipping confirmation"
fi

# Backup current .env file
BACKUP_FILE="$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
cp "$ENV_FILE" "$BACKUP_FILE"

# Update EC2_INSTANCE_IP in .env file
if grep -q "^EC2_INSTANCE_IP=" "$ENV_FILE"; then
    # Replace existing line
    sed -i.tmp "s/^EC2_INSTANCE_IP=.*/EC2_INSTANCE_IP=$ELASTIC_IP/" "$ENV_FILE"
    rm "$ENV_FILE.tmp"
    echo "✅ Updated EC2_INSTANCE_IP=$ELASTIC_IP in $ENV_FILE"
else
    # Add new line
    echo "EC2_INSTANCE_IP=$ELASTIC_IP" >> "$ENV_FILE"
    echo "✅ Added EC2_INSTANCE_IP=$ELASTIC_IP to $ENV_FILE"
fi

echo "📁 Backup saved to: $BACKUP_FILE"
echo "🎉 Environment variables are now in sync with Terraform state"