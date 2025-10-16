#!/bin/bash

# Full deploy orchestrator: run all infra/image steps locally, then hand off
# container (re)start to GitHub Actions "Redeploy" workflow.
#
# This mirrors scripts/iac/full-redeploy.sh except the final step uses GH to
# restart compose profiles on EC2 (no SSH/scp from local). Useful when you want
# a single source of truth in GitHub for runtime env files and container start.
#
# Usage examples:
#   scripts/iac/full-deploy-gh.sh --force --build-images both --profiles both
#   scripts/iac/full-deploy-gh.sh --build-images prod --profiles prod
#   scripts/iac/full-deploy-gh.sh --no-build --profiles dev
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
do_infra=true       # allow containers-only mode
build_images=""   # prod|dev|both|""
profiles="both"   # prod|dev|both
workflows="redeploy.yml" # comma-separated list of workflow names or filenames to trigger (e.g., 'Redeploy' or 'redeploy.yml')
refresh_env=false   # whether GH workflow should regenerate/upload env files
restart_containers=true # whether GH workflow should restart containers
watch_logs=true     # whether to watch GH workflow logs
sync_secrets=true   # whether to sync local secrets to GitHub

usage() {
  cat <<USAGE
Full deploy via GitHub (infra/images local; containers via GH Actions)

Options:
  --force                 Skip confirmation for Terraform destroy
  --build-images [val]    Rebuild/push images: prod|dev|both (default: none)
  --no-build              Disable image build/push
  --profiles [val]        Which profiles to start in GH: prod|dev|both (default: both)
  --no-destroy            Do not destroy EC2 infra; only terraform apply
  --containers-only       Skip all Terraform/infra steps (no destroy/apply)
  --gh-workflows [names]  Comma-separated workflow names to trigger (default: Redeploy)
  --refresh-env           Ask GH workflow to regenerate & upload .env files (default: false)
  --no-restart            Do not restart containers in GH workflow (default: restart)
  --no-watch              Do not watch GH workflow logs (default: watch)
  --no-secrets-sync       Do not sync local secrets to GitHub
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
    --containers-only) do_infra=false; shift ;;
    --gh-workflows)
      workflows="${2:-}"; [[ -n "$workflows" ]] || die "--gh-workflows requires at least one name"; shift 2 ;;
    --refresh-env) refresh_env=true; shift ;;
    --no-restart) restart_containers=false; shift ;;
    --no-watch) watch_logs=false; shift ;;
    --no-secrets-sync) sync_secrets=false; shift ;;
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

chmod 600 "$HOME/.ssh/bb-portfolio-site-key.pem" 2>/dev/null || true

pushd "$REPO_ROOT" >/dev/null

log "Installing npm deps if needed"
[[ -d node_modules ]] || npm install

if [[ "$do_infra" == true ]]; then
  log "Generating terraform.tfvars from private secrets"
  npx tsx scripts/iac/generate-terraform-vars.ts
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
if [[ "$do_infra" == true ]]; then
  pushd "$INFRA_DIR" >/dev/null
  log "Initializing Terraform"
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
  EC2_IP=$(terraform output -raw portfolio_elastic_ip 2>/dev/null || terraform output -raw portfolio_instance_ip 2>/dev/null || true)
  popd >/dev/null

  # Regenerate tfvars in case IP-based URLs in secrets changed locally
  log "Regenerating terraform vars after apply"
  npx tsx scripts/iac/generate-terraform-vars.ts
  
  # Update local private secrets with the new EC2 IP so GitHub Secrets get the latest EC2_HOST
  if [[ -n "${EC2_IP:-}" && "${EC2_IP}" != "null" ]]; then
    log "Updating .github-secrets.private.json5 with new EC2 IP: ${EC2_IP}"
    npx tsx -e "
      import { readFileSync, writeFileSync } from 'fs';
      import JSON5 from 'json5';
      const file = '.github-secrets.private.json5';
      const ip = process.env.EC2_IP || '';
      const raw = readFileSync(file, 'utf8');
      const cfg = JSON5.parse(raw);
      const s = cfg.strings || cfg;
      const before = s.EC2_HOST;
      s.EC2_HOST = ip;
      const replaceHost = (val) => typeof val === 'string' ? val.replace(/http:\/\/[0-9.]+:/g, `http://${ip}:`) : val;
      // Update common URL fields if present
      s.DEV_FRONTEND_URL = replaceHost(s.DEV_FRONTEND_URL);
      s.PROD_FRONTEND_URL = replaceHost(s.PROD_FRONTEND_URL);
      s.DEV_NEXT_PUBLIC_BACKEND_URL = replaceHost(s.DEV_NEXT_PUBLIC_BACKEND_URL);
      s.PROD_NEXT_PUBLIC_BACKEND_URL = replaceHost(s.PROD_NEXT_PUBLIC_BACKEND_URL);
      s.NEXT_PUBLIC_BACKEND_URL = replaceHost(s.NEXT_PUBLIC_BACKEND_URL);
      const banner = '// Private secrets file for syncing to GitHub Actions secrets\n// This file is ignored by git. Keep real values here.\n// Do NOT commit this file to version control!\n// cspell:disable\n';
      const out = banner + JSON5.stringify(cfg, null, 2);
      writeFileSync(file, out, 'utf8');
      console.log(`Updated EC2_HOST from ${before} to ${ip}`);
    "
  else
    warn "EC2 IP not detected from Terraform outputs; skipping secrets IP update"
  fi
else
  warn "Skipping Terraform/infra per --containers-only"
fi

# Optionally sync secrets to GitHub (keeps GH secrets aligned with local private json5)
if [[ "$sync_secrets" == true ]]; then
  log "Syncing GitHub secrets from private json5"
  npx tsx scripts/sync-github-secrets.ts BBaysinger/bb-portfolio .github-secrets.private.json5
else
  warn "Skipping GitHub secrets sync per --no-secrets-sync"
fi

ok "Infra and images complete. Handing off container restart to GitHub Actions."

need jq

IFS="," read -r -a WF_ARR <<< "$workflows"
for WF in "${WF_ARR[@]}"; do
  log "Triggering workflow '$WF' with environment=$profiles start_dev=true"
  BRANCH=$(git rev-parse --abbrev-ref HEAD)
  gh workflow run "$WF" \
    --repo "$GH_REPO" \
    --ref "$BRANCH" \
    -f environment="$profiles" \
    -f start_dev=true \
    -f refresh_env="$refresh_env" \
    -f restart_containers="$restart_containers"

  sleep 3
  RUN_ID=$(gh run list --repo "$GH_REPO" --workflow "$WF" --branch "$BRANCH" --limit 1 --json databaseId,status | jq -r '.[0].databaseId // empty')
  [[ -n "$RUN_ID" ]] || die "Failed to detect workflow run for '$WF'"

  log "Watching run $RUN_ID for '$WF'"
  if [[ "$watch_logs" == true ]]; then
    gh run watch "$RUN_ID" --repo "$GH_REPO"
    echo "\n--- Logs ($WF) ---"
    gh run view "$RUN_ID" --repo "$GH_REPO" --log || true
  else
    ok "Started workflow run $RUN_ID for '$WF' (not watching)"
  fi
done

ok "Full deploy via GitHub completed. EC2 IP: ${EC2_IP:-unknown}"

popd >/dev/null
