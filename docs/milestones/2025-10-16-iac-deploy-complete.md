# Milestone: IaC Deployment Workflow Substantially Complete (2025-10-16)

We have reached a stable, repeatable end-to-end deployment workflow driven by Infrastructure as Code and a single local orchestrator.

## Highlights

- Terraform-managed EC2 stack with preserved Elastic IP (54.70.138.1)
- IAM-first runtime (no long-lived AWS creds on the instance)
- S3 media buckets with versioning + SSE and CORS for both prod/dev
- ECR for production images; Docker Hub for dev images
- Reusable GitHub Actions Redeploy workflow (manual dispatch + reusable from CI)
- One orchestrator: `deploy/scripts/deployment-orchestrator.sh` handles infra, secrets sync, image builds, and container restarts
- Safe fallback: if GH dispatch is flaky, orchestrator uploads envs + restarts via SSH automatically

## What’s in place

- `.github/workflows/redeploy.yml` with workflow_dispatch and workflow_call
- `deploy/scripts/deployment-orchestrator.sh` (preferred entrypoint)
- `deploy/publish-ecr-images.sh` and `deploy/publish-dockerhub-dev-images.sh`
- `deploy/scripts/generate-terraform-vars.ts` to derive `infra/terraform.tfvars` from private JSON5
- `infra/` Terraform with lifecycle protection for EIP and targeted-destroy filters

## Ops notes

- DNS should point Cloudflare A records (root, www, dev) to the Elastic IP
- MongoDB Atlas Network Access must allow 54.70.138.1/32
- Frontend/Backend health checks (local on EC2): 3000/3001 (prod) and 4000/4001 (dev)

## Known caveat

- GitHub CLI workflow dispatch can return 422 intermittently; the orchestrator now auto-falls back to SSH. UI dispatch still works.

## Next steps (optional)

- Consider removing the manual wrapper workflow if redundant
- Tighten Cloudflare cache rules for /api/\*
- Add a small canary test in CI that hits /api/health after redeploy
