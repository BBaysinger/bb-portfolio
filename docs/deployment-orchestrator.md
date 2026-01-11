# Deployment Orchestrator (Single-Instance / Current)

This document covers the current, day-to-day deployment toolchain for the single-host model.

- **Script:** `deploy/scripts/deployment-orchestrator.sh`
- **Scope:** provisions/updates a single EC2 host via Terraform and (re)starts Docker Compose profiles (via GitHub Actions with SSH fallback).

## What it does

- Terraform discovery/plan/apply for the single-instance stack in `infra/`
- Optional image build/push to registries
- Dispatches GitHub Actions workflow(s) to regenerate env files on the host and restart containers
- Falls back to direct SSH/Compose control if workflow dispatch fails

## Common commands

Read-only discovery:

```bash
bash deploy/scripts/deployment-orchestrator.sh --discover-only
```

Plan-only preview:

```bash
bash deploy/scripts/deployment-orchestrator.sh --plan-only
```

Deploy containers (prod+dev profiles) and regenerate env files:

```bash
bash deploy/scripts/deployment-orchestrator.sh --profiles both --refresh-env
```

Deploy only prod:

```bash
bash deploy/scripts/deployment-orchestrator.sh --profiles prod --refresh-env
```

Containers-only (skip Terraform/host sync):

```bash
bash deploy/scripts/deployment-orchestrator.sh --skip-infra --profiles both --refresh-env
```

## Profiles and ports

The host can run two Compose profiles:

- **prod**: frontend on `3000`, backend on `3001`
- **dev**: frontend on `4000`, backend on `4001`

## Notes

- Use `--help` on the script for the authoritative option list.
- The orchestrator is intentionally separate from any archived blue/green promotion workflow.
