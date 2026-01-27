# Infrastructure Deployment Workflow Complete (2025-10-16)

Stable, repeatable end-to-end deployment workflow implemented using Infrastructure as Code and local orchestration.

## Implementation Summary

- Terraform-managed EC2 stack with preserved Elastic IP (<EC2_INSTANCE_IP>)
- IAM-first runtime (no long-lived AWS creds on the instance)
- S3 media buckets with versioning + SSE and CORS for both prod/dev
- ECR for production images; Docker Hub for dev images
- Reusable GitHub Actions Redeploy workflow (manual dispatch + reusable from CI)
- One orchestrator: `deploy/scripts/deployment-orchestrator.sh` handles infra, secrets sync, image builds, and container restarts
- Safe fallback: if GH dispatch is flaky, orchestrator uploads envs + restarts via SSH automatically

## Components

- `.github/workflows/redeploy.yml` with workflow_dispatch and workflow_call
- `deploy/scripts/deployment-orchestrator.sh` (preferred entrypoint)
- `deploy/publish-ecr-images.sh` and `deploy/publish-dockerhub-dev-images.sh`
- `deploy/scripts/generate-terraform-vars.ts` to derive `infra/terraform.tfvars` from private JSON5
- `infra/` Terraform with lifecycle protection for EIP and targeted-destroy filters

## Operations

- DNS should point Cloudflare A records (root, www, dev) to the Elastic IP
- MongoDB Atlas Network Access must allow <EC2_INSTANCE_IP>/32
- Frontend/Backend health checks (local on EC2): 3000/3001 (prod) and 4000/4001 (dev)

## Known caveat

- GitHub CLI workflow dispatch can return 422 intermittently; the orchestrator now auto-falls back to SSH. UI dispatch still works.

## Next steps (optional)

- Consider removing the manual wrapper workflow if redundant
- Tighten Cloudflare cache rules for /api/\*
- Add a small canary test in CI that hits /api/health after redeploy
