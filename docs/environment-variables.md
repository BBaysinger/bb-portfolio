# Environment Variables Configuration

## Overview

This project follows the standard environment variable conventions:

- **`.env`** - Committed defaults/shared values across all environments
- **`.env.local`** - Local overrides (not committed, in `.gitignore`)
- **`.env.example`** - Template showing required variables

## Key Variables

### AWS_ACCOUNT_ID

- **Purpose**: AWS Account ID for ECR image URIs
- **Default**: `778230822028` (production account)
- **Usage**: Required for production Docker image pulls from ECR

### EC2_INSTANCE_IP

- **Purpose**: EC2 instance IP address for deployments and SSH access
- **Default**: `44.246.43.116`
- **Usage**: Used in deployment scripts and infrastructure management

## Setup

1. The `.env` file contains production defaults (already committed)
2. For local development, copy and customize:

   ```bash
   cp .env .env.local
   # Edit .env.local with your local values
   ```

3. **Required**: Environment variables must be set - scripts will fail if missing
4. **No fallbacks**: Scripts enforce proper `.env`/`.env.local` usage without hardcoded defaults

## Terraform Integration

The `.env` file serves as the **single source of truth** for runtime configuration. To keep it in sync with your actual infrastructure:

### Sync from Terraform

After deploying infrastructure changes:

```bash
# Sync environment variables from current Terraform state (interactive)
npm run infra:sync-env

# Or skip confirmation for automation/CI (use with caution)
npm run infra:sync-env:force
```

This updates `.env` with the actual values from your deployed infrastructure (like Elastic IP addresses).

**⚠️ Safety Features:**

- **Confirmation required** - Shows current vs. new values and asks for confirmation
- **Automatic backup** - Creates timestamped backup before making changes
- **Force mode** - Available for CI/automation with `--force` flag

### Workflow

1. **Deploy infrastructure** - Terraform creates/updates AWS resources
2. **Sync environment** - `npm run infra:sync-env` updates `.env` with real values
3. **Scripts use `.env`** - All deployment scripts read from the synchronized `.env`

## Validation

All scripts validate required environment variables and will exit with clear error messages if not properly configured. This ensures:

- **Single source of truth** - `.env` contains authoritative values synced from infrastructure
- **Explicit configuration** - No hidden defaults or surprising behaviors
- **Environment safety** - Prevents accidental use of wrong/stale values
- **Clear errors** - Immediate feedback when configuration is missing

### Files Updated

The following files now use the `EC2_INSTANCE_IP` environment variable:

- `package.json` - SSH sync command
- `package.json5` - SSH sync command (mirror)
- `infra/bb-portfolio-management.sh` - Infrastructure management script
- `deploy/scripts/generate-terraform-vars.ts` - CORS origins for S3

### Fallback Behavior

All scripts maintain backward compatibility by falling back to the hardcoded IP address if the environment variable is not set:

- npm scripts: `${NGINX_HOST:-ec2-user@${EC2_INSTANCE_IP}}`
- Infrastructure script: `${EC2_INSTANCE_IP:-44.246.43.116}`
- Terraform generator: `process.env.EC2_INSTANCE_IP || "44.246.43.116"`

### Benefits

- **Single Source of Truth**: IP address is centralized in environment configuration
- **Environment Flexibility**: Easy to override for different environments or IP changes
- **Backward Compatibility**: Scripts still work without the environment variable set
- **Security**: Sensitive configuration can be managed through environment variables
