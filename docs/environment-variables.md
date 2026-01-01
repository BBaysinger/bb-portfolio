# Environment Variables Configuration

> See also: [Engineering Standards](./engineering-standards.md) for naming, required-list grammar, and enforcement stages used across environments.

## Overview

This project uses multiple "env roots" because it is a monorepo:

- **Repo root (`./`)**: used by Docker Compose + infra/deploy scripts
- **Frontend (`./frontend/`)**: used by Next.js when running the frontend directly
- **Backend (`./backend/`)**: used by the Payload/Next backend when running the backend directly

General conventions:

- **`.env.example`** / **`.env.local.example`** are templates committed to git.
- **`.env`** / **`.env.local`** are local-only files (gitignored in this repo).

### Naming paradigm

- Local development should rely on unprefixed keys (e.g., `PUBLIC_SERVER_URL`, `MONGODB_URI`). These stay in `.env` / `.env.local` and never leave your machine.
- Per-profile overrides live in `.github-secrets.private.<profile>.json5`. Each profile reuses the same key names (no prefixes) so scripts can treat `FRONTEND_URL`, `MONGODB_URI`, etc., uniformly regardless of environment.
- We intentionally avoid sprawling “compatibility” envs; when the backend needs a value, it fails fast with a helpful error instead of silently massaging inputs.
- Prefer canonical, unprefixed key names for local dev (`BACKEND_INTERNAL_URL`, `AWS_REGION`, etc.).
- No backwards compatibility for env keys: do not add aliases like `LOCAL_*`, `DEV_*`, or `PROD_*`. Use the canonical key name only.

## Key Variables

### NEXT_PUBLIC_FORCE_HASH_HISTORY

- **Purpose**: When set to `1`, navigation utilities append a timestamp hash token (e.g., `#ts=...`) to ensure distinct history entries during rapid client‑side route changes. This improves Back/Forward behavior in some browsers.
- **Default**: `0` (disabled)
- **Usage**: `frontend/src/utils/navigation.ts`, `frontend/src/components/common/PushStateLink.tsx`, and carousel navigation.

### NEXT_PUBLIC_DOUBLE_PUSH

- **Purpose**: When set to `1`, enables a “double‑push” fallback for programmatic navigation: push a dummy entry, then replace with the final URL on the next frame. This mitigates coalescing of entries during gesture navigation on some UAs.
- **Default**: `0` (disabled)
- **Usage**: `frontend/src/utils/navigation.ts`, `frontend/src/components/common/PushStateLink.tsx`, and carousel navigation.

### NEXT_PUBLIC_RUM_DEBUG

- **Purpose**: Enables additional browser console logging for CloudWatch RUM initialization + event dispatch (useful for debugging).
- **Default**: `false`
- **Notes**: Only has effect in non-production builds; production ignores it.
- **Usage**: `frontend/src/services/rum.ts` (see also `docs/cloudwatch-rum-setup.md`).

### NEXT_PUBLIC_RUM_PUBLIC_RESOURCE_POLICY

- **Purpose**: Enables CloudWatch RUM ingestion via an App Monitor *public resource-based policy* (unsigned requests).
- **Default**: `false`
- **Notes**:
  - When `true`, the frontend sets `signing=false` and does **not** require `NEXT_PUBLIC_RUM_IDENTITY_POOL_ID` / `NEXT_PUBLIC_RUM_GUEST_ROLE_ARN`.
  - When `false`, the frontend uses Cognito identity pool + guest role signing.
- **Usage**: `frontend/src/services/rum.ts`

### AWS_ACCOUNT_ID

- **Purpose**: AWS Account ID for ECR image URIs
- **Default**: `778230822028` (production account)
- **Usage**: Required for production Docker image pulls from ECR

### EC2_INSTANCE_IP

- **Purpose**: EC2 instance IP address for deployments and SSH access
- **Required**: Set explicitly (no implicit default)
- **Usage**: Used in deployment scripts and infrastructure management. Prefer syncing into `.env` via `npm run infra:sync-env`.

### PUBLIC_SERVER_URL

- **Purpose**: Defines the exact origin (scheme + host + port) that serves the Payload admin UI and `/api` routes for a given environment.
- **Variants**:
  - `PUBLIC_SERVER_URL` (local / unprefixed default)
  - Profile overlays in `.github-secrets.private.dev.json5`, `.github-secrets.private.prod.json5`, etc., provide the environment-specific values while keeping the canonical key name.
  - `PAYLOAD_PUBLIC_SERVER_URL` (global override for CI or special hosts)
- **Why it matters**: Payload’s admin shell builds API requests relative to this origin. When unset, requests fall back to `/admin/api/...` which no longer exists now that the backend isn’t mounted under a Next.js `basePath`.
- **Typical values**:
  - `http://localhost:3001` – bare-metal backend dev (`npm run dev` inside `backend/`)
  - `http://localhost:8081` – Docker backend exposed via compose
  - `http://localhost:8080` – Local Caddy proxy aggregating frontend + backend
  - `https://bbaysinger.com` – Production
- **Usage**: Validated in `backend/src/payload.config.ts` during boot. Missing values cause the backend to exit with a guidance message.

## Setup

1. Start from the templates:

```bash
# Repo root (compose + scripts)
cp .env.example .env
cp .env.local.example .env.local

# Frontend (Next.js)
cp frontend/.env.local.example frontend/.env.local

# Backend (Payload)
cp backend/.env.local.example backend/.env.local
```

2. Put secrets and machine-specific values in the `.env.local` files.
3. Env files do not automatically "cascade" between root/frontend/backend — each service reads env from its own folder.

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

### Notes

This repo is intentionally fail-fast:

- No env var aliases (no `LOCAL_*`, `DEV_*`, `PROD_*` prefixes)
- No hidden defaults for deployment-critical values — set them explicitly (ideally via Terraform sync)
