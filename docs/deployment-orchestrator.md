# Deployment Orchestrator: Discovery and Fresh Create

This document explains the orchestrator’s discovery and plan modes, and how it creates infrastructure from scratch when nothing exists.

## Overview

Script: `deploy/scripts/deployment-orchestrator.sh`

Responsibilities:

- Discover current Terraform state (EC2, SG, EIP, S3, ECR) and basic reachability
- Optionally plan/apply infrastructure (EC2 instance, security group, EIP association)
- Optionally build and push images (ECR/Docker Hub)
- Hand off container (re)starts to GitHub Actions (with SSH fallback)
- Generate runtime env files on EC2 (via GH workflow or SSH fallback) including required env-guard lists and security.txt settings

## Prerequisites

- macOS/Linux shell with bash
- Installed and authenticated:
  - Terraform, AWS CLI, GitHub CLI, Node.js/npm, tsx
- Local secrets file: `.github-secrets.private.json5` at repo root

## Discovery Mode

Run a read-only discovery of the current environment:

```
deploy/scripts/deployment-orchestrator.sh --discover-only
```

What it prints:

- Whether Terraform state is initialized
- Presence of resources in state: EC2 instance, security group, Elastic IP, EIP association, S3 buckets (dev/prod), ECR repos (frontend/backend)
- Terraform outputs: Elastic IP (`bb_portfolio_elastic_ip`) and instance public IP
- Reachability checks against the Elastic IP:
  - SSH (port 22)
  - HTTP (port 80)

If no EC2 instance or EIP association is present, the next apply will be a “fresh create.”

## Plan-Only Mode

Preview changes without applying:

```
deploy/scripts/deployment-orchestrator.sh --plan-only
```

It runs `terraform plan` and prints the summary line, e.g.: `Plan: 13 to add, 0 to change, 0 to destroy`.

## Fresh Create vs Update

- Fresh create: No EC2 instance and no EIP association are present in Terraform state. The script’s infra phase will provision:
  - Security group allowing SSH/HTTP/HTTPS and app ports
  - EC2 instance with Nginx, Docker, SSM, and systemd wiring
  - Elastic IP association to the instance
- Update: If the resources exist, Terraform will reconcile changes only.

## Typical Flows

- Discover only (safe):

```
deploy/scripts/deployment-orchestrator.sh --discover-only
```

- Plan only (no changes):

```
deploy/scripts/deployment-orchestrator.sh --plan-only
```

- Create/update infra without rebuilding images, then redeploy via GH:

```
deploy/scripts/deployment-orchestrator.sh --no-build --profiles both --refresh-env
```

When --refresh-env is set, the workflow regenerates these files on EC2:

- backend/.env.prod and backend/.env.dev
  - Include: PROD\_/DEV_REQUIRED_ENVIRONMENT_VARIABLES (env-guard lists), SECURITY_CONTACT_EMAIL, SECURITY_TXT_EXPIRES, S3 bucket names, Mongo URIs, Payload secret, SES emails, internal backend URL.
- frontend/.env.prod and frontend/.env.dev
  - Include: internal backend URL for SSR/server use only.

SSH fallback mirrors this behavior using values from .github-secrets.private.json5.

- Full redeploy including image builds for dev/prod:

```
npm run deploy:full
```

## Exit Codes

- `0` Success
- Non-zero indicates the step that failed (e.g., terraform plan/apply, GH dispatch, SSH fallback)

## Troubleshooting

- SSH 255 / unreachable:
  - Run discovery and confirm the Elastic IP and EIP association exist
  - Ensure the security group has port 22 open (Terraform creates this)
  - Wait for EC2 boot/user-data to finish; try again
- GH dispatch fails:
  - The orchestrator auto-falls back to SSH to restart containers
  - Confirm EC2 is reachable; then re-run
  - If backend restart-loops with "Missing required environment variables", re-run with --refresh-env to regenerate env files (ensuring SECURITY_TXT_EXPIRES and required lists are present).
