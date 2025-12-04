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

## Dual Profile Candidate (Prod + Dev Always On)

The EC2 "candidate" (blue) instance is intentionally a dual-profile host running BOTH production and development containers by default.

Default profiles: `--profiles both`

Port mapping summary:

- Production frontend: host port 3000 → container 3000
- Production backend: host port 3001 → container 3000
- Development frontend: host port 4000 → container 3000
- Development backend: host port 4001 → container 3000

Public HTTP traffic and promotion health checks target the production ports (3000/3001). Development ports remain available for manual testing, debugging, and feature iteration without impacting prod readiness.

If ONLY dev containers are up (4000/4001) and prod is missing, the site proxy (nginx/caddy) still routes to 3000/3001 → upstream missing → 502 Bad Gateway. The orchestrator’s health gate will now abort with a clear message in this scenario, preventing accidental promotion of a dev-only state.

To ensure prod containers can start, the orchestrator resolves and (if absent) sets `AWS_ACCOUNT_ID` so prod images can pull from ECR. Dev images pull from Docker Hub.

Typical dual-profile prep before promotion:

```bash
# Redeploy both profiles (build/pull images, restart containers, auto health gate)
bash deploy/scripts/deployment-orchestrator.sh --profiles both

# If health gate passes and you wish to promote:
bash deploy/scripts/orchestrator-promote.sh --region us-west-2 --auto-promote
```

Skip health gate only if you are performing low-level debugging:

```bash
bash deploy/scripts/deployment-orchestrator.sh --profiles both --no-health
```

You can still run only prod:

```bash
bash deploy/scripts/deployment-orchestrator.sh --profiles prod
```

But dev will remain absent unless you choose `both`. Keeping dev always on is recommended for fast iteration—use `prod` alone only if you deliberately want a minimal footprint.

## Automatic Health Gate

After successful dispatch for `prod` or `both` (when not using `--auto-promote`), the orchestrator automatically runs a promotion-style health gate:

1. Verifies production containers are present (and aborts with explanation if only dev exists).
2. Polls backend container health status (`healthy`).
3. Confirms frontend container is running (`Up`).
4. Performs HTTP checks against internal endpoints on the production ports.

Disable this check via `--no-health` if necessary (e.g., staging broken images intentionally). Auto-promotion flows still perform their own gate before handover.

## Candidate Prep Workflow Summary

1. `--profiles both` redeploy (containers, env regeneration if needed).
2. Automatic health gate validates prod readiness (unless `--no-health`).
3. Optional manual inspection (logs, metrics, dev endpoints on 4000/4001).
4. Run promotion script to perform Elastic IP handover (or null-green activation on first ever promote).

If health fails: fix environment variables, ensure AWS_ACCOUNT_ID, rebuild images, then rerun step 1.

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

- Create/update infra and deploy (images are always built and pushed):

```
deploy/scripts/deployment-orchestrator.sh --profiles both --refresh-env
```

Note: The orchestrator automatically builds and pushes both frontend and backend images (prod to ECR, dev to Docker Hub) to ensure consistency. The `--build-images` flag has been removed as images should always be fresh.

When --refresh-env is set, the workflow regenerates these files on EC2:

- backend/.env.prod and backend/.env.dev
  - Include: `REQUIRED_ENVIRONMENT_VARIABLES` (env-guard list), `SECURITY_TXT_EXPIRES`, S3 bucket names, Mongo URIs, Payload secret, SES emails, internal backend URL.
- frontend/.env.prod and frontend/.env.dev
  - Include: internal backend URL for SSR/server use only.

SSH fallback mirrors this behavior using values from .github-secrets.private.json5.

- Full redeploy including image builds for dev/prod (npm shortcuts):

````
# Deploy to blue (candidate) and restart containers for both profiles
npm run orchestrate

# Deploy + auto-promote (blue → green) without manual prompt (includes null-green initial activation when no active exists)
npm run orchestrate:auto-promote

# Only perform promotion (when blue is already healthy)
npm run candidate-promote

### Blue Replacement Prompt

When a blue (candidate) instance already exists and hasn’t been promoted, re-running the orchestrator will prompt you to either:

- replace: destroy + recreate blue (fresh candidate), or
- reuse: keep the current blue and deploy onto it, or
- cancel: abort the run.

Use `--reuse-blue` to skip the prompt and reuse automatically.

### Null-Green Mode (Initial Activation)

If there is no previously promoted instance (i.e. no EC2 tagged `Role=active`), the promotion script enters **null-green mode**. In this mode:

1. The lone candidate instance is health-checked.
2. If healthy, it is directly tagged `Role=active` (initial activation).
3. No Elastic IP or security-group swap occurs (there is nothing to swap).
4. If an Elastic IP is already attached to the candidate, it is retained as production.

This avoids confusing error output during the very first promotion and makes the first `orchestrate:auto-promote` seamless.

## SSH Hang Handling and SSM Fallback

When the promotion flow detects that SSH appears open but stalls during the banner exchange (a common symptom of a stuck sshd, PAM/MOTD hang, or host firewall), it now:

- Classifies the condition explicitly as "banner-timeout" during network preflight.
- Auto-disables SSH-dependent steps (cert issuance and diagnostics) to avoid long, opaque hangs.
- Best-effort SSM fallback: attempts to restart `sshd` using AWS Systems Manager Run Command if permitted.
- Optional self-healing: with `--reboot-on-ssh-hang`, reboots the instance and rechecks health (asks for confirmation unless `--auto-promote`).

Flags added to `orchestrator-promote.sh`:
- `--reboot-on-ssh-hang`: reboot the instance if SSH is stuck after an SSM repair attempt. If not using `--auto-promote`, you will be prompted to confirm.

SSM requirements:
- Instance profile must include the managed policy `AmazonSSMManagedInstanceCore` and the SSM agent must be present on the AMI.
- The operator identity (your local `AWS_PROFILE`) must have permission to call SSM Run Command.

Minimal operator IAM policy (replace `REGION` and `ACCOUNT_ID`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:SendCommand"
      ],
      "Resource": [
        "arn:aws:ec2:REGION:ACCOUNT_ID:instance/*",
        "arn:aws:ssm:REGION:ACCOUNT_ID:document/AWS-RunShellScript"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "ssm:ListCommandInvocations",
        "ssm:GetCommandInvocation"
      ],
      "Resource": "*"
    }
  ]
}
````

Instance role requirement (attach to the EC2 instance profile):

- AWS managed policy: `AmazonSSMManagedInstanceCore`

Operational notes:

- If SSM permissions or agent are missing, the orchestrator will log a clear warning and proceed without SSM repair.
- After SSM repair or reboot, the orchestrator re-probes ports and continues; SSH-dependent steps remain disabled for that run to keep promotion timely.

### Skip-Infra Mode

Use `--skip-infra` to skip all Terraform and host-level configuration steps. (`--pull-latest-tags-only` and `--containers-only` remain as temporary aliases.) In this mode the orchestrator:

- Does **not** plan/apply infrastructure
- Skips single-controller host enforcement and nginx config sync
- Skips HTTPS certificate ensure
- Still builds & pushes images (prod ECR + dev Docker Hub) unless `--no-build`
- Updates GitHub Actions secrets (including `EC2_HOST` to candidate IP)
- Dispatches redeploy workflows which restart containers via SSH on the existing host

This mode is ideal when infra is stable and you only need refreshed containers or regenerated env files. If you need nginx, cert, or host config changes, omit `--skip-infra` so host sync runs.

### Mandatory Candidate SSH Connectivity

Early in every run (full or pull-only) the script resolves the candidate (blue) IP and performs an SSH connectivity test. If SSH fails the run aborts immediately to avoid false-success scenarios where containers appear updated but host config could not be applied.

### Health Check Strategy (Retry & Poll)

The redeploy workflow and SSH fallback implement a resilient multi-phase health approach:

1. Container health polling:

- Backend ready only when `docker ps` status contains `healthy`.
- Frontend ready when status begins with `Up` (no explicit health check).
- Poll defaults: 6 attempts × 5s (configurable) with status logged each try.

2. HTTP probes with backoff:

- Endpoints: `/` (frontend) and `/api/health` (backend) for both prod and dev profiles.
- 5 curl attempts × 3s delay (configurable) follow redirects (`-L`).
- Success: any 2xx/3xx (redirects like 308 accepted). Transient `000` ignored until final attempt.

3. Port 80 verification (orchestrator): same retry semantics applied after deployment and optional promotion.

Configuration knobs:
| Context | Vars | Defaults |
|---------|------|----------|
| Workflow | `HEALTH_ATTEMPTS`, `HEALTH_DELAY_SECONDS`, `CURL_ATTEMPTS`, `CURL_DELAY_SECONDS` | 6 / 5 / 5 / 3 |
| SSH fallback | `HEALTH_RETRY_ATTEMPTS`, `HEALTH_RETRY_DELAY` | 6 / 5 |

Rationale:

- Eliminates flakiness from cold starts & slow health checks.
- Treats redirect (308) and transient network unavailability as normal start-up conditions.
- Surfaces persistent failures via WARN without blocking blue-green promotion flows.

To tighten enforcement (e.g., fail on WARN), adjust attempt counts downward and treat final non-2xx/3xx as fatal in custom automation.

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

```

```
