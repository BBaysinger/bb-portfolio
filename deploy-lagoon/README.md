# Lagoon Deployment Strategy (formerly Blue/Green)

Lagoon is the deployment strategy introduced on 2025‑11‑14 (commit `9dc62eef`). It layers a candidate instance alongside the active instance to enable safer promotions, reduced downtime, and easier rollback. (Previously referred to as Blue/Green.)

> This README isolates all Lagoon‑specific concepts so the legacy single‑instance deployment docs (`deploy/DEPLOYMENT.md`) can remain lean. When working only on the classic path you can ignore this file.

## Goals

- Parallel validation of a new instance build (AMI + user_data + container images) without disturbing the active site.
- Explicit promotion step that atomically reassigns the Elastic IP (EIP) to the candidate.
- Clear instance lifecycle roles: `active` (serving), `candidate` (pending cutover), `previous` (demoted / recycle window).
- Minimize accidental EIP churn and Terraform drift via guarded lifecycle blocks.

## Core Components

| Aspect              | Green (Active)                                      | Blue (Candidate)                                               |
| ------------------- | --------------------------------------------------- | -------------------------------------------------------------- |
| EC2 Tag `Role`      | `active`                                            | `candidate`                                                    |
| EIP                 | Stable Elastic IP (public DNS points here)          | Temporary EIP for validation                                   |
| Security Group      | Production ingress (80/443 + app ports)             | Candidate SG (can be operator‑IP restricted)                   |
| Terraform Resources | `aws_instance.bb_portfolio_green` + EIP association | `aws_instance.bb_portfolio_blue` + candidate EIP + association |
| Promotion           | N/A (already active)                                | Acquire production EIP; previous green tainted/demoted         |

## Orchestrators

Two scripts existed during Lagoon work:

- `deploy-lagoon/scripts/deployment-orchestrator.sh` – Main Lagoon aware orchestrator (discovery, create, promote).
- `deploy-lagoon/scripts/orchestrator-promote.sh` – Focused promotion / EIP handover.

Legacy path retained a simpler script: `deploy-lagoon/scripts/deployment-orchestrator-legacy.sh` (mirrors `deploy/scripts/deployment-orchestrator-legacy.sh` now).

### Typical Flow

1. Provision / update blue candidate via Terraform (`infra-lagoon/`).
2. Orchestrator runs containers on blue (with env regeneration).
3. Health / smoke tests (curl internal ports, Nginx, payload admin, project listing).
4. Promote: stop green containers, reassign Elastic IP to blue, retag roles, taint/recycle old green (becomes red).
5. Optionally create a new fresh candidate (next blue) for future updates.

### Promotion Safety Checks

During promotion the orchestrator performed (or planned to perform) checks:

- Candidate backend `/api/health` returns 200.
- Frontend root `/` returns 200 and assets load.
- Nginx local `/healthz` returns 200 for fallback and canonical hosts.
- No pending migrations / data divergence indicators.

Failed checks abort promotion to avoid traffic cutover.

## Nginx & /healthz

Lagoon introduced a versioned Nginx config (`deploy-lagoon/nginx/bb-portfolio.conf`) with:

- Separate server blocks for prod and dev canonical hosts.
- Fallback `default_server` with explicit `location /healthz { return 200; }` to allow header‑less probes.
- Reverse proxy upstream mapping to container profiles: `:3000/:3001` for prod, `:4000/:4001` for dev.
- Optional admin asset path normalization (`/admin/_next`).

Sync helper: `deploy-lagoon/scripts/sync-nginx-config.sh` uploads the config and reloads Nginx with validation.

## Environment Files

The orchestrator supported regenerating env bundles on the host via a single tarball upload to reduce SSH handshake overhead and mitigate sporadic key exchange resets.

Relevant env guard variables (examples):

- `REQUIRED_ENVIRONMENT_VARIABLES`
- `SECURITY_TXT_EXPIRES`

## Health & Diagnostics Enhancements

Lagoon era improvements (retained where helpful):

- Bounded curl health retries with low `--max-time` / `--connect-timeout` values.
- SSH reliable options (`ServerAliveInterval`, `Compression=yes`, retry loops for uploads).
- Host diagnostic script `deploy-lagoon/scripts/host-diag.sh` enumerating listeners, container statuses, and proxy health.

## Why It Was Paused

Operational complexity (dual instances + EIP handover) slowed recovery when the site was down. For rapid restoration, the project reverted to the legacy single‑instance model. Lagoon assets were preserved (`infra-lagoon/`, `deploy-lagoon/`) for future resumption when stability allows.

## Resuming Lagoon Later

To resume:

1. Re‑sync `infra-lagoon/` with current Terraform provider versions.
2. Refresh AMI IDs / security groups as needed.
3. Dry‑run candidate provisioning (`terraform plan` in `infra-lagoon/`).
4. Execute orchestrator discovery: `deploy-lagoon/scripts/deployment-orchestrator.sh --discover-only`.
5. Perform container build + deploy to candidate only.
6. Validate full stack, then run promotion script.

Document any resumed steps in `docs/architecture-decisions.md` with a new ADR referencing this README.

## Reference Commands

```bash
# Candidate containers only (no promotion)
COMPOSE_PROFILES=prod docker compose -f deploy-lagoon/compose/docker-compose.yml up -d --force-recreate

# Sync Nginx config (Lagoon version)
./deploy-lagoon/scripts/sync-nginx-config.sh --host ec2-user@<candidate-ip> --key ~/.ssh/bb-portfolio-site-key.pem

# Promote (example placeholder; ensure script flags before running)
./deploy-lagoon/scripts/orchestrator-promote.sh --candidate-ip <ip> --elastic-ip <eip>
```

## Status

Lagoon is currently dormant. Legacy deployment remains the authoritative path. This file captures the design for future iteration without impacting day‑to‑day ops.
