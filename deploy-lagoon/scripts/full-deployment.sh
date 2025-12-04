#!/bin/bash

# Full deploy orchestrator: run all infra/image steps locally, then hand off
# container (re)start to GitHub Actions "Redeploy" workflow.
#
# This mirrors scripts/iac/full-redeploy.sh except the final step uses GH to
# restart compose profiles on EC2 (no SSH/scp from local). Useful when you want
# a single source of truth in GitHub for runtime env files and container start.
#
# Usage examples:
#   deploy/scripts/deployment-orchestrator.sh --force --build-images both --profiles both
#   deploy/scripts/deployment-orchestrator.sh --build-images prod --profiles prod
#   deploy/scripts/deployment-orchestrator.sh --no-build --profiles dev
#
# Requirements:
# - aws, terraform, node/npm, docker (if building images), gh CLI (auth'd)
# - .github-secrets.private.json5 present locally for terraform var generation

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
INFRA_DIR="${REPO_ROOT}/infra"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

log()  { echo -e "${BLUE}ℹ️  $*${NC}"; }
ok()   { echo -e "${GREEN}✅ $*${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $*${NC}"; }
err()  { echo -e "${RED}❌ $*${NC}"; }

die() { err "$*"; exit 1; }

force_destroy=false
do_destroy=true
do_infra=true       # allow skip-infra mode
skip_infra=false
build_images=""   # prod|dev|both|""
profiles="both"   # prod|dev|both
workflows="redeploy.yml" # comma-separated list of workflow names or filenames to trigger (e.g., 'Redeploy' or 'redeploy.yml')
refresh_env=false   # whether GH workflow should regenerate/upload env files
restart_containers=true # whether GH workflow should restart containers
watch_logs=true     # whether to watch GH workflow logs
secrets_sync_args=()

usage() {
  cat <<USAGE
Full deploy via GitHub (infra/images local; containers via GH Actions)

Options:
  --force                 Skip confirmation for Terraform destroy
  --build-images [val]    Rebuild/push images: prod|dev|both (default: none)
  --no-build              Disable image build/push
  --profiles [val]        Which profiles to start in GH: prod|dev|both (default: both)
  --no-destroy            Do not destroy EC2 infra; only terraform apply
  --skip-infra            Skip all Terraform/infra steps (no destroy/apply)
  --pull-latest-tags-only Deprecated alias for --skip-infra
  --containers-only       Deprecated alias for --skip-infra
  --gh-workflows [names]  Comma-separated workflow names to trigger (default: Redeploy)
  --refresh-env           Ask GH workflow to regenerate & upload .env files (default: false)
  --no-restart            Do not restart containers in GH workflow (default: restart)
  --no-watch              Do not watch GH workflow logs (default: watch)
  --secrets-omit-env val  Pass --omit-env <val> to the secrets sync script (repeatable; use 'all' for repo-only)
  --secrets-omit-envs csv Pass --omit-envs <csv> to the secrets sync script
  --secrets-dry-run       Pass --dry-run to the secrets sync script
  -h|--help               Show this help
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --force) force_destroy=true; shift ;;
    --build-images)
      build_images="${2:-}"; [[ -n "$build_images" ]] || die "--build-images requires prod|dev|both"; shift 2 ;;
    --no-build) build_images=""; shift ;;
    --profiles)
      profiles="${2:-}"; [[ "$profiles" =~ ^(prod|dev|both)$ ]] || die "--profiles must be prod|dev|both"; shift 2 ;;
    --no-destroy) do_destroy=false; shift ;;
    --skip-infra)
      do_infra=false
      skip_infra=true
      shift ;;
    --pull-latest-tags-only)
      warn "--pull-latest-tags-only is deprecated; use --skip-infra"
      do_infra=false
      skip_infra=true
      shift ;;
    --containers-only)
      warn "--containers-only is deprecated; use --skip-infra"
      do_infra=false
      skip_infra=true
      shift ;;
    --gh-workflows)
      workflows="${2:-}"; [[ -n "$workflows" ]] || die "--gh-workflows requires at least one name"; shift 2 ;;
    --refresh-env) refresh_env=true; shift ;;
    --no-restart) restart_containers=false; shift ;;
    --no-watch) watch_logs=false; shift ;;
    --secrets-omit-env)
      [[ -n "${2:-}" ]] || die "--secrets-omit-env requires a value (e.g., dev, prod, stage, all)"
      secrets_sync_args+=("--omit-env" "$2")
      shift 2 ;;
    --secrets-omit-envs)
      [[ -n "${2:-}" ]] || die "--secrets-omit-envs requires a comma-separated list"
      secrets_sync_args+=("--omit-envs" "$2")
      shift 2 ;;
    --secrets-dry-run)
      secrets_sync_args+=("--dry-run")
      shift ;;
    -h|--help) usage; exit 0 ;;
    *) die "Unknown option: $1" ;;
  esac
done

# Prereqs
need() { command -v "$1" >/dev/null 2>&1 || die "$1 is required"; }
need aws; need terraform; need node; need npm; need gh
if [[ -n "$build_images" ]]; then need docker; fi

# Ensure gh is authenticated and repo is set
if ! gh auth status >/dev/null 2>&1; then
  die "GitHub CLI is not authenticated. Run 'gh auth login' first."
fi
GH_REPO="BBaysinger/bb-portfolio"
gh repo view "$GH_REPO" >/dev/null 2>&1 || die "Cannot access repo $GH_REPO via gh CLI"

[[ -f "${REPO_ROOT}/.github-secrets.private.json5" ]] || die ".github-secrets.private.json5 missing at repo root"
#   deploy/scripts/deployment-orchestrator.sh --force --build-images both --profiles both
#   deploy/scripts/deployment-orchestrator.sh --build-images prod --profiles prod
#   deploy/scripts/deployment-orchestrator.sh --no-build --profiles dev
pushd "$REPO_ROOT" >/dev/null

log "Installing npm deps if needed"
[[ -d node_modules ]] || npm install

if [[ "$do_infra" != true ]]; then
  if [[ "$skip_infra" == true ]]; then
    warn "Skipping Terraform/infra per --skip-infra"
  else
    warn "Skipping Terraform/infra per operator request"
  fi
  npx tsx ./deploy/scripts/generate-terraform-vars.ts
fi

# Optional image build/push (delegates to existing npm scripts)
if [[ -n "$build_images" ]]; then
  log "Rebuilding container images: $build_images"
  if [[ "$build_images" == "prod" || "$build_images" == "both" ]]; then
    log "Building & pushing production images to ECR"
    npm run ecr:build-push
    ok "Pushed prod images"
  fi
  if [[ "$build_images" == "dev" || "$build_images" == "both" ]]; then
    log "Building & pushing development images to Docker Hub"
    npm run docker:build-push
    ok "Pushed dev images"
  fi
fi

# Terraform: optional targeted destroy preserving S3/ECR/EIP, then apply
if [[ "$do_infra" != true ]]; then
  if [[ "$skip_infra" == true ]]; then
    warn "Discovery: skipping Terraform (skip-infra mode)"
  terraform init -input=false

  if [[ "$do_destroy" == true ]]; then
  # Determine resources to destroy (skip S3/ECR/EIP)
    to_destroy=()
    if terraform state list >/dev/null 2>&1; then
      while IFS= read -r r; do
  [[ "$r" =~ ^aws_s3_bucket(\.|$) ]] && continue
  [[ "$r" =~ ^aws_ecr_repository(\.|$)|^aws_ecr_lifecycle_policy(\.|$) ]] && continue
  # Preserve Elastic IP resources under all names and modules
  [[ "$r" =~ ^aws_eip(\.|$) ]] && continue
  [[ "$r" =~ ^aws_eip_association(\.|$) ]] && continue
        to_destroy+=("$r")
      done < <(terraform state list)
    fi

    if (( ${#to_destroy[@]} > 0 )); then
      warn "Planned destroy targets (preserving S3/ECR/EIP):"
      printf '  - %s\n' "${to_destroy[@]}"
      if [[ "$force_destroy" != true ]]; then
        echo "Type 'yes' to confirm destroy:"; read -r ans; [[ "$ans" == yes ]] || die "Cancelled"
      else
        warn "Force mode enabled - skipping confirmation"
      fi
      log "Destroying targeted resources"
      args=(); for r in "${to_destroy[@]}"; do args+=("-target=$r"); done
      terraform destroy "${args[@]}" -auto-approve
    else
      warn "No destroyable resources (or state not present)"
    fi
  else
    warn "Skipping destroy per --no-destroy"
  fi

  log "Planning/applying fresh infrastructure"
  terraform validate
  terraform plan -out=tfplan
  terraform apply -input=false tfplan
  rm -f tfplan

  # Detect EIP for info/logs (GH workflow uses EC2_HOST secret at runtime)
  EC2_IP=$(terraform output -raw bb_portfolio_elastic_ip 2>/dev/null || terraform output -raw bb_portfolio_instance_ip 2>/dev/null || true)
  popd >/dev/null

  # Regenerate tfvars in case IP-based URLs in secrets changed locally
  log "Regenerating terraform vars after apply"
  npx tsx ./deploy/scripts/generate-terraform-vars.ts
  
  # Update local private secrets with the new EC2 IP so GitHub Secrets get the latest EC2_HOST
  if [[ -n "${EC2_IP:-}" && "${EC2_IP}" != "null" ]]; then
    log "Updating .github-secrets.private.json5 with new EC2 IP: ${EC2_IP}"
    export EC2_IP
    npx tsx -e '
      import { readFileSync, writeFileSync } from "fs";
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const JSON5 = require("json5");
      const file = ".github-secrets.private.json5";
      const ip = process.env.EC2_IP || "";
      const raw = readFileSync(file, "utf8");
      const cfg = JSON5.parse(raw);
      const s = (cfg.strings || cfg);
      const before = s.EC2_HOST;
      s.EC2_HOST = ip;
      const replaceHost = (val: any) => typeof val === "string" ? val.replace(/http:\/\/[0-9.]+:/g, "http://" + ip + ":") : val;
      const updateUrl = (key: string) => {
        if (typeof s[key] === "string") {
          s[key] = replaceHost(s[key]);
        }
      };
      updateUrl("FRONTEND_URL");
      updateUrl("BACKEND_INTERNAL_URL");
  # NEXT_PUBLIC_BACKEND_URL values are deprecated; proxy-relative /api is used now.
      const banner = "// Private secrets file for syncing to GitHub Actions secrets\n// This file is ignored by git. Keep real values here.\n// Do NOT commit this file to version control!\n// cspell:disable\n";
      const out = banner + JSON5.stringify(cfg, null, 2);
      writeFileSync(file, out, "utf8");
      console.info(`Updated EC2_HOST from ${before} to ${ip}`);
    '
  else
    warn "EC2 IP not detected from Terraform outputs; skipping secrets IP update"
  fi
else
  if [[ "$skip_infra" == true ]]; then
    warn "Skipping Terraform/infra per --skip-infra"
  else
    warn "Skipping Terraform/infra per operator request"
  fi
fi

# Sync secrets to GitHub (keeps GH secrets aligned with local private json5)
log "Syncing GitHub secrets from private json5${secrets_sync_args[*]:+ (extra flags: ${secrets_sync_args[*]})}"
npx tsx ./scripts/sync-github-secrets.ts BBaysinger/bb-portfolio .github-secrets.private.json5 "${secrets_sync_args[@]}"

ok "Infra and images complete. Handing off container restart to GitHub Actions."

need jq

# Try multiple identifiers for the workflow to avoid 422 dispatch issues
BRANCH=$(git rev-parse --abbrev-ref HEAD)
WF_CANDIDATES=("$workflows" "Redeploy" ".github/workflows/redeploy.yml" "redeploy.yml")

dispatch_ok=false
RUN_ID=""
for WF in "${WF_CANDIDATES[@]}"; do
  [[ -n "$WF" ]] || continue
  log "Attempting dispatch of workflow '$WF' on branch $BRANCH (env=$profiles, refresh_env=$refresh_env, restart=$restart_containers)"
  set +e
  OUT=$(gh workflow run "$WF" \
    --repo "$GH_REPO" \
    --ref "$BRANCH" \
    -f environment="$profiles" \
    -f start_dev=true \
    -f refresh_env="$refresh_env" \
    -f restart_containers="$restart_containers" 2>&1)
  STATUS=$?
  set -e
  if [[ $STATUS -eq 0 ]]; then
    sleep 3
    # Resolve latest run for this workflow and branch
    RUN_ID=$(gh run list --repo "$GH_REPO" --workflow "$WF" --branch "$BRANCH" --limit 1 --json databaseId,status | jq -r '.[0].databaseId // empty') || true
    if [[ -n "$RUN_ID" ]]; then
      dispatch_ok=true
      ok "Dispatch succeeded for '$WF' (run id: $RUN_ID)"
      break
    else
      warn "Dispatch returned success but could not resolve run id for '$WF'"
    fi
  else
    warn "Dispatch failed for '$WF' (status $STATUS): ${OUT//$'\n'/  }"
    # Keep trying next candidate
  fi
done

if [[ "$dispatch_ok" == true ]]; then
  log "Watching run $RUN_ID"
  if [[ "$watch_logs" == true ]]; then
    gh run watch "$RUN_ID" --repo "$GH_REPO" || true
    echo "\n--- Logs ---"
    gh run view "$RUN_ID" --repo "$GH_REPO" --log || true
  else
    ok "Started workflow run $RUN_ID (not watching)"
  fi
  ok "Full deploy via GitHub completed. EC2 IP: ${EC2_IP:-unknown}"
  popd >/dev/null
  exit 0
fi

warn "All GitHub workflow dispatch attempts failed. Falling back to direct SSH restart from this script."

# SSH fallback: generate env files locally if requested and upload, then restart compose profiles
SSH_KEY="$HOME/.ssh/bb-portfolio-site-key.pem"
[[ -f "$SSH_KEY" ]] || die "SSH key not found at $SSH_KEY"

# Determine EC2_HOST (prefer Terraform outputs; fallback to GH secret)
EC2_HOST="${EC2_IP:-}"
if [[ -z "$EC2_HOST" ]] && command -v terraform >/dev/null 2>&1; then
  pushd "$INFRA_DIR" >/dev/null
  EC2_HOST=$(terraform output -raw elastic_ip 2>/dev/null || terraform output -raw bb_portfolio_elastic_ip 2>/dev/null || true)
  popd >/dev/null
fi
if [[ -z "$EC2_HOST" ]] && command -v gh >/dev/null 2>&1; then
  EC2_HOST=$(gh secret view EC2_HOST -q .value 2>/dev/null || true)
fi
[[ -n "$EC2_HOST" ]] || die "EC2 host unknown for SSH fallback"

if [[ "$refresh_env" == true ]]; then
  log "Generating env files locally from .github-secrets.private.json5 for upload"
  [[ -f "$REPO_ROOT/.github-secrets.private.json5" ]] || die ".github-secrets.private.json5 missing for env generation"
  TMP_DIR="$(mktemp -d)"
  (
    cd "$REPO_ROOT"
    npx --yes tsx scripts/generate-env-files.ts --out "$TMP_DIR"
  )
  log "Uploading env files to EC2 ($EC2_HOST)"
  ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ec2-user@"$EC2_HOST" "mkdir -p /home/ec2-user/portfolio/backend /home/ec2-user/portfolio/frontend"
  scp -i "$SSH_KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$TMP_DIR/backend.env.prod"  ec2-user@"$EC2_HOST":/home/ec2-user/portfolio/backend/.env.prod
  scp -i "$SSH_KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$TMP_DIR/backend.env.dev"   ec2-user@"$EC2_HOST":/home/ec2-user/portfolio/backend/.env.dev
  scp -i "$SSH_KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$TMP_DIR/frontend.env.prod" ec2-user@"$EC2_HOST":/home/ec2-user/portfolio/frontend/.env.prod
  scp -i "$SSH_KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$TMP_DIR/frontend.env.dev"  ec2-user@"$EC2_HOST":/home/ec2-user/portfolio/frontend/.env.dev
fi

log "Logging into ECR and restarting compose profiles via SSH"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ec2-user@"$EC2_HOST" "aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin 778230822028.dkr.ecr.us-west-2.amazonaws.com >/dev/null 2>&1 || true"
ssh -i "$SSH_KEY" -tt -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ec2-user@"$EC2_HOST" bash -lc $'set -e
cd /home/ec2-user/portfolio
docker-compose down || true
case '"$profiles"' in
  prod)
    COMPOSE_PROFILES=prod docker-compose pull || true
    COMPOSE_PROFILES=prod docker-compose up -d
    ;;
  dev)
    COMPOSE_PROFILES=dev docker-compose pull || true
    COMPOSE_PROFILES=dev docker-compose up -d
    ;;
  both)
    COMPOSE_PROFILES=prod docker-compose pull || true
    COMPOSE_PROFILES=prod docker-compose up -d || true
    COMPOSE_PROFILES=dev docker-compose pull || true
    COMPOSE_PROFILES=dev docker-compose up -d || true
    ;;
esac
'

ok "Containers restarted via SSH fallback. EC2 IP: $EC2_HOST"
ok "Full deploy completed (fallback path)."

popd >/dev/null
