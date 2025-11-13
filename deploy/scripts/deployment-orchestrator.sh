#!/usr/bin/env bash
# Deployment Orchestrator — EC2 + Docker Compose (4 Debian-based containers)
# -------------------------------------------------------------------------
# What this does (high level):
# - Provisions/updates an AWS EC2 instance via Terraform.
# - Builds and publishes images (optional) to ECR (prod) and Docker Hub (dev).
# - Hands off container (re)starts to the GitHub Actions "Redeploy" workflow
#   so runtime env files are generated on EC2 from GitHub Secrets.
# - If the workflow dispatch fails, falls back to a safe SSH path to restart
#   Compose profiles directly on the instance.
# - First-time friendly: if no EC2 exists yet, Terraform apply will create it.
#   By default, existing instances are preserved; use --destroy to recreate; use --containers-only to skip infra entirely.
#
# Runtime architecture on EC2:
# - Reverse proxy: Nginx on the host forwards traffic to Compose services.
# - Containers: four Node.js containers based on Debian (node:22-slim) images
#   managed by Docker Compose using two profiles:
#   • prod:   bb-portfolio-frontend-prod (host:3000 → container:3000)
#             bb-portfolio-backend-prod  (host:3001 → container:3000)
#   • dev:    bb-portfolio-frontend-dev  (host:4000 → container:3000)
#             bb-portfolio-backend-dev   (host:4001 → container:3000)
# - DNS/routing (typical):
#   • bbaysinger.com        → bb-portfolio-frontend-prod:3000 and bb-portfolio-backend-prod:3001
#   • dev.bbaysinger.com    → bb-portfolio-frontend-dev:4000 and bb-portfolio-backend-dev:4001
#
# Secrets and env files:
# - .env.dev / .env.prod are not committed; they are generated on EC2 by the
#   GitHub workflow from repository secrets. Local dev only uses .env.
# - This script can also generate env files from .github-secrets.private.json5
#   for the SSH fallback path when requested.
#
# Usage examples:
#   deploy/scripts/deployment-orchestrator.sh --force --build-images both --profiles both
#   deploy/scripts/deployment-orchestrator.sh --build-images prod --profiles prod
#   deploy/scripts/deployment-orchestrator.sh --no-build --profiles dev
#
# Requirements:
# - aws, terraform, node/npm, docker (if building images), gh CLI (auth'd)
# - .github-secrets.private.json5 present locally for terraform var generation

# Ensure we're running under bash even if invoked via sh
if [ -z "${BASH_VERSION:-}" ]; then
  exec /bin/bash "$0" "$@"
fi

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
do_destroy=false    # Changed: preserve EC2 by default
do_infra=true       # allow containers-only mode
build_images=""   # prod|dev|both|""
profiles="both"   # prod|dev|both
workflows="redeploy.yml" # comma-separated list of workflow names or filenames to trigger (e.g., 'Redeploy' or 'redeploy.yml')
refresh_env=false   # whether GH workflow should regenerate/upload env files
restart_containers=true # whether GH workflow should restart containers
watch_logs=true     # whether to watch GH workflow logs
sync_secrets=true   # whether to sync local secrets to GitHub
discover_only=false # perform discovery and exit without changes
plan_only=false     # run terraform plan (summary) and exit (no apply)

usage() {
  cat <<USAGE
Full deploy via GitHub (infra/images local; containers via GH Actions)

Options:
  --force                 Skip confirmation for Terraform destroy
  --build-images [val]    Rebuild/push images: prod|dev|both (default: none)
  --no-build              Disable image build/push
  --profiles [val]        Which profiles to start in GH: prod|dev|both (default: both)
  --destroy               Destroy and recreate EC2 infra (default: preserve existing)
  --containers-only       Skip all Terraform/infra steps (no destroy/apply)
  --gh-workflows [names]  Comma-separated workflow names to trigger (default: Redeploy)
  --refresh-env           Ask GH workflow to regenerate & upload .env files (default: false)
  --no-restart            Do not restart containers in GH workflow (default: restart)
  --no-watch              Do not watch GH workflow logs (default: watch)
  --no-secrets-sync       Do not sync local secrets to GitHub
  --discover-only         Only print discovery summary of current infra and exit
  --plan-only             Print terraform plan summary and exit (no apply)
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
    --destroy) do_destroy=true; shift ;;
    --containers-only) do_infra=false; shift ;;
    --gh-workflows)
      workflows="${2:-}"; [[ -n "$workflows" ]] || die "--gh-workflows requires at least one name"; shift 2 ;;
    --refresh-env) refresh_env=true; shift ;;
    --no-restart) restart_containers=false; shift ;;
    --no-watch) watch_logs=false; shift ;;
    --no-secrets-sync) sync_secrets=false; shift ;;
    --discover-only) discover_only=true; shift ;;
    --plan-only) plan_only=true; shift ;;
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
pushd "$REPO_ROOT" >/dev/null

log "Installing npm deps if needed"
[[ -d node_modules ]] || npm install

# Extract ACME / Let's Encrypt registration email (best-effort)
ACME_EMAIL="$(node -e "try{const JSON5=require('json5');const fs=require('fs');const raw=fs.readFileSync('.github-secrets.private.json5','utf8');const cfg=JSON5.parse(raw);const s=cfg.strings||cfg;process.stdout.write((s.ACME_REGISTRATION_EMAIL||s.ACME_EMAIL||'').trim());}catch(e){process.stdout.write('');}")"
if [[ -n "$ACME_EMAIL" ]]; then
  log "ACME email detected: $ACME_EMAIL"
else
  warn "No ACME_REGISTRATION_EMAIL / ACME_EMAIL found in secrets (HTTPS auto-issue may be skipped)"
fi

# ---------------------------
# Discovery helpers
# ---------------------------
tf_discovery() {
  if [[ "$do_infra" != true ]]; then
    warn "Discovery: skipping Terraform (containers-only mode)"
    return 0
  fi
  pushd "$INFRA_DIR" >/dev/null
  log "Discovery: reading Terraform state and outputs"
  set +e
  terraform init -input=false >/dev/null 2>&1
  STATE=$(terraform state list 2>/dev/null)
  INIT_STATUS=$?
  set -e
  if [[ $INIT_STATUS -ne 0 ]]; then
    warn "Discovery: terraform state not initialized yet"
    STATE=""
  fi
  has_inst=false
  if echo "$STATE" | grep -Eq '^(aws_instance\\.bb_portfolio|aws_instance\\.portfolio)$|^aws_instance\\.(bb_portfolio|portfolio)'; then
    has_inst=true
  fi
  has_sg=$(echo "$STATE" | grep -Ec '^aws_security_group\\.bb_portfolio_sg$' || true)
  has_eip=$(echo "$STATE" | grep -Ec '^aws_eip\\.bb_portfolio_ip$' || true)
  has_eip_assoc=$(echo "$STATE" | grep -Ec '^aws_eip_association\\.' || true)
  has_s3_dev=$(echo "$STATE" | grep -Ec '^aws_s3_bucket\\.media\["dev"\]$' || true)
  has_s3_prod=$(echo "$STATE" | grep -Ec '^aws_s3_bucket\\.media\["prod"\]$' || true)
  has_ecr_fe=$(echo "$STATE" | grep -Ec '^aws_ecr_repository\\.frontend$' || true)
  has_ecr_be=$(echo "$STATE" | grep -Ec '^aws_ecr_repository\\.backend$' || true)

  # Outputs (best-effort)
  set +e
  EIP=$(terraform output -raw bb_portfolio_elastic_ip 2>/dev/null)
  PUB=$(terraform output -raw bb_portfolio_instance_ip 2>/dev/null)
  set -e

  echo ""
  echo "===== Discovery Summary ====="
  echo "Terraform state initialized: $([[ $INIT_STATUS -eq 0 ]] && echo yes || echo no)"
  echo "EC2 instance present:       $([[ "$has_inst" == true ]] && echo yes || echo no)"
  echo "Security group present:     $([[ $has_sg -gt 0 ]] && echo yes || echo no)"
  echo "Elastic IP present:         $([[ $has_eip -gt 0 ]] && echo yes || echo no)"
  echo "EIP association present:    $([[ $has_eip_assoc -gt 0 ]] && echo yes || echo no)"
  echo "S3 buckets (dev/prod):      $([[ $has_s3_dev -gt 0 ]] && echo dev || echo - ) / $([[ $has_s3_prod -gt 0 ]] && echo prod || echo - )"
  echo "ECR repos (fe/be):          $([[ $has_ecr_fe -gt 0 ]] && echo yes || echo no) / $([[ $has_ecr_be -gt 0 ]] && echo yes || echo no)"
  [[ -n "$EIP" ]] && echo "Elastic IP output:          $EIP" || true
  [[ -n "$PUB" ]] && echo "Instance public IP:         $PUB" || true
  if [[ -n "$EIP" ]]; then
    if nc -vz -G 2 "$EIP" 22 >/dev/null 2>&1; then
      echo "SSH (22) reachable at EIP:  yes"
    else
      echo "SSH (22) reachable at EIP:  no"
    fi
    if curl -s -I "http://$EIP" | head -1 | grep -q "200"; then
      echo "HTTP (80) responding at EIP: yes"
    else
      echo "HTTP (80) responding at EIP: no"
    fi
  fi
  echo "=============================="
  echo ""
  popd >/dev/null
}

tf_plan_summary() {
  pushd "$INFRA_DIR" >/dev/null
  log "Running terraform plan (summary)"
  # Run plan and extract the Plan: X to add, Y to change, Z to destroy line
  local plan_out
  set +e
  plan_out=$(terraform plan -input=false -no-color 2>&1)
  local status=$?
  set -e
  echo "$plan_out" | tail -n 40 | sed -n '/^Plan:/p'
  if [[ $status -ne 0 ]]; then
    err "terraform plan failed"
    echo "$plan_out" | tail -n 80
    popd >/dev/null
    return $status
  fi
  popd >/dev/null
}

# Always do a discovery pass first so the operator knows what will happen
tf_discovery
if [[ "$discover_only" == true ]]; then
  ok "Discovery completed (no changes requested)."
  popd >/dev/null
  exit 0
fi
if [[ "$plan_only" == true ]]; then
  tf_plan_summary || die "Plan failed"
  ok "Plan summary printed (no apply)."
  popd >/dev/null
  exit 0
fi

if [[ "$do_infra" == true ]]; then
  log "Generating terraform.tfvars from private secrets"
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
  # Avoid IAM churn under least-priv users: do not attempt to detach/destroy IAM
  [[ "$r" =~ ^aws_iam_role(\.|$) ]] && continue
  [[ "$r" =~ ^aws_iam_instance_profile(\.|$) ]] && continue
  [[ "$r" =~ ^aws_iam_role_policy_attachment(\.|$) ]] && continue
  [[ "$r" =~ ^aws_iam_policy(\.|$) ]] && continue
  [[ "$r" =~ ^aws_iam_user_policy(\.|$) ]] && continue
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
    warn "Skipping destroy (default behavior - use --destroy to recreate EC2)"
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
    // Update common URL fields if present
    s.DEV_FRONTEND_URL = replaceHost(s.DEV_FRONTEND_URL);
    s.PROD_FRONTEND_URL = replaceHost(s.PROD_FRONTEND_URL);
    // NEXT_PUBLIC_BACKEND_URL values are deprecated; proxy-relative /api is used now.
      const banner = "// Private secrets file for syncing to GitHub Actions secrets\n// This file is ignored by git. Keep real values here.\n// Do NOT commit this file to version control!\n// cspell:disable\n";
      const out = banner + JSON5.stringify(cfg, null, 2);
      writeFileSync(file, out, "utf8");
      console.info(`Updated EC2_HOST from ${before} to ${ip}`);
    '
  else
    warn "EC2 IP not detected from Terraform outputs; skipping secrets IP update"
  fi
  # Defer enforcement/HTTPS until functions are defined below
  POST_ENFORCE_HOST="${EC2_IP:-}"
else
  warn "Skipping Terraform/infra per --containers-only"
fi

# Optionally sync secrets to GitHub (keeps GH secrets aligned with local private json5)
if [[ "$sync_secrets" == true ]]; then
  log "Syncing GitHub secrets from private json5"
  npx tsx ./scripts/sync-github-secrets.ts BBaysinger/bb-portfolio .github-secrets.private.json5
else
  warn "Skipping GitHub secrets sync per --no-secrets-sync"
fi

# Resolve EC2 host without relying on viewing GitHub Secrets values
resolve_ec2_host() {
  local host=""
  # 1) Terraform outputs (prefer Elastic IP)
  if command -v terraform >/dev/null 2>&1 && [ -d "$INFRA_DIR" ]; then
    pushd "$INFRA_DIR" >/dev/null || true
    set +e
    host=$(terraform output -raw bb_portfolio_elastic_ip 2>/dev/null)
    if [[ -z "$host" ]]; then
      host=$(terraform output -raw bb_portfolio_instance_ip 2>/dev/null)
    fi
    set -e
    popd >/dev/null || true
    if [[ -n "$host" ]]; then
      echo "$host"; return 0
    fi
  fi
  # 2) Local private secrets
  if [ -f "$REPO_ROOT/.github-secrets.private.json5" ]; then
    host=$(node -e "try{const JSON5=require('json5');const fs=require('fs');const raw=fs.readFileSync('.github-secrets.private.json5','utf8');const cfg=JSON5.parse(raw);const s=cfg.strings||cfg;process.stdout.write((s.EC2_HOST||'').trim());}catch(e){process.stdout.write('');}")
    if [[ -n "$host" ]]; then
      echo "$host"; return 0
    fi
  fi
  # 3) DNS fallback (best-effort): derive apex from URLs in secrets and resolve A record
  local apex=""
  if [ -f "$REPO_ROOT/.github-secrets.private.json5" ]; then
    apex=$(node -e "try{const JSON5=require('json5');const fs=require('fs');const raw=fs.readFileSync('.github-secrets.private.json5','utf8');const cfg=JSON5.parse(raw);const s=cfg.strings||cfg;const u=(s.PROD_FRONTEND_URL||s.DEV_FRONTEND_URL||'').trim();if(u){try{const h=new URL(u).hostname;process.stdout.write(h);}catch(e){}}}catch(e){}");
  fi
  if [[ -n "$apex" ]] && command -v dig >/dev/null 2>&1; then
    host=$(dig +short A "$apex" | head -n1)
    if [[ -n "$host" ]]; then
      echo "$host"; return 0
    fi
  fi
  echo ""; return 1
}

ok "Infra and images complete. Handing off container restart to GitHub Actions."

need jq

BRANCH=$(git rev-parse --abbrev-ref HEAD)
WF_CANDIDATES=("$workflows" "Redeploy" ".github/workflows/redeploy.yml" "redeploy.yml" ".github/workflows/redeploy-manual.yml" "redeploy-manual.yml")

# Ensure only a single controller manages containers on EC2.
# - Disable/remove legacy systemd unit 'portfolio.service'
# - Archive legacy compose file '/home/ec2-user/portfolio/docker-compose.yml'
# This is idempotent and safe to run on every deploy.
enforce_single_controller() {
  local host="$1"
  local key="$HOME/.ssh/bb-portfolio-site-key.pem"
  if [[ -z "$host" ]]; then
    warn "Single-controller guard: EC2 host unknown, skipping"
    return 0
  fi
  if [[ ! -f "$key" ]]; then
    warn "Single-controller guard: SSH key not found at $key, skipping"
    return 0
  fi
  log "Enforcing single controller on $host (disable legacy service, archive legacy compose)"
  ssh -i "$key" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ec2-user@"$host" $'set -e
    # Disable and remove legacy systemd unit if present
    if systemctl list-unit-files | grep -q "^portfolio.service"; then
      sudo systemctl disable --now portfolio.service || true
      sudo rm -f /etc/systemd/system/portfolio.service || true
      sudo systemctl daemon-reload || true
    fi
    # Archive legacy compose file in project root if present
    if [ -f "/home/ec2-user/portfolio/docker-compose.yml" ]; then
      mv -f /home/ec2-user/portfolio/docker-compose.yml /home/ec2-user/portfolio/docker-compose.legacy.yml
    fi
    # Neutralize bootstrap helper if it exists (kept for reference)
    chmod -x /home/ec2-user/portfolio/generate-env-files.sh 2>/dev/null || true
  '
}

# Ensure HTTPS certificates exist (idempotent). Requires certbot on host.
ensure_https_certs() {
  local host="$1"; shift || true
  local email="$1"; shift || true
  [[ -n "$host" && -n "$email" ]] || return 0
  local key="$HOME/.ssh/bb-portfolio-site-key.pem"
  if [[ ! -f "$key" ]]; then
    warn "HTTPS cert ensure skipped: SSH key not found at $key"
    return 0
  fi
  log "Ensuring HTTPS certificates present on $host"
  ssh -i "$key" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ec2-user@"$host" $'set -e
    # Install certbot if missing
    if ! command -v certbot >/dev/null 2>&1; then
      echo "Installing certbot on host..."
      sudo yum install -y certbot python3-certbot-nginx || true
    fi
    if command -v certbot >/dev/null 2>&1; then
      if [ ! -d /etc/letsencrypt/live/bbaysinger.com ]; then
        echo "Issuing initial certificates via certbot";
        sudo certbot --nginx -n --agree-tos --email '"$email"' \
          -d bbaysinger.com -d www.bbaysinger.com \
          -d dev.bbaysinger.com --redirect || echo "Certbot issuance failed";
        sudo systemctl reload nginx || true
      else
        echo "Certificates already present; attempting quiet renewal";
        sudo certbot renew --quiet || echo "Renewal run failed (will retry on timer)";
      fi
    else
      echo "certbot not installed on host; skipping HTTPS ensure";
    fi'
}

# If infra step was skipped and EC2_IP is unknown, try to resolve host now and enforce single controller once
if [[ -z "${EC2_IP:-}" ]]; then
  EC2_HOST_RESOLVE=$(resolve_ec2_host || true)
  if [[ -n "$EC2_HOST_RESOLVE" ]]; then
    log "Resolved EC2 host: $EC2_HOST_RESOLVE"
    enforce_single_controller "$EC2_HOST_RESOLVE"
    ensure_https_certs "$EC2_HOST_RESOLVE" "${ACME_EMAIL:-}"
  else
    warn "Single-controller guard: no host resolved (containers-only), skipping"
  fi
fi

# If infra ran earlier and provided EC2_IP, enforce controller and ensure HTTPS now
if [[ -n "${POST_ENFORCE_HOST:-}" ]]; then
  enforce_single_controller "${POST_ENFORCE_HOST}"
  ensure_https_certs "${POST_ENFORCE_HOST}" "${ACME_EMAIL:-}"
fi

# Helper to dispatch a single Redeploy run for a specific environment (prod|dev)
dispatch_redeploy() {
  local ENV_IN=$1; shift
  local -a REFS=("$@")
  local DISPATCHED=false
  local RUN_ID="" RUN_URL=""
  for WF in "${WF_CANDIDATES[@]}"; do
    [[ -n "$WF" ]] || continue
    for REF in "${REFS[@]}"; do
      [[ -n "$REF" ]] || continue
      log "Attempting dispatch of workflow '$WF' on ref $REF (env=$ENV_IN, refresh_env=$refresh_env, restart=$restart_containers)"
      set +e
      OUT=$(gh workflow run "$WF" \
        --repo "$GH_REPO" \
        --ref "$REF" \
        -f environment="$ENV_IN" \
        -f start_dev=false \
        -f refresh_env="$refresh_env" \
        -f restart_containers="$restart_containers" 2>&1)
      STATUS=$?
      set -e
      if [[ $STATUS -eq 0 ]]; then
        sleep 3
        RUN_ID=$(gh run list --repo "$GH_REPO" --workflow "$WF" --branch "$REF" --limit 10 \
          --json databaseId,event,status,createdAt,url | jq -r '[.[] | select(.event=="workflow_dispatch")] | .[0].databaseId // empty') || true
        RUN_URL=$(gh run list --repo "$GH_REPO" --workflow "$WF" --branch "$REF" --limit 10 \
          --json databaseId,event,status,createdAt,url | jq -r '[.[] | select(.event=="workflow_dispatch")] | .[0].url // empty') || true
        if [[ -n "$RUN_ID" ]]; then
          DISPATCHED=true
          ok "Dispatch succeeded for '$WF' on '$REF' (run id: $RUN_ID)"
          if [[ "$watch_logs" == true ]]; then
            log "Watching run $RUN_ID ($ENV_IN)"
            if ! gh run watch "$RUN_ID" --repo "$GH_REPO" --exit-status; then
              warn "Run $RUN_ID ($ENV_IN) concluded with failure. ${RUN_URL:+See: $RUN_URL}"
            fi
            echo "\n--- Logs ($ENV_IN) ---"
            attempts=0
            until gh run view "$RUN_ID" --repo "$GH_REPO" --log >/dev/null 2>&1 || [[ $attempts -ge 5 ]]; do
              attempts=$((attempts+1))
              sleep 2
            done
            gh run view "$RUN_ID" --repo "$GH_REPO" --log || warn "failed to get run log after retries ($ENV_IN)"
            if gh run view "$RUN_ID" --repo "$GH_REPO" --json conclusion,status,jobs --jq '.conclusion' 2>/dev/null | grep -qi failure; then
              warn "Job summary ($ENV_IN):"
              gh run view "$RUN_ID" --repo "$GH_REPO" --json jobs --jq '.jobs[] | {name: .name, conclusion: .conclusion, startedAt: .startedAt, completedAt: .completedAt}' || true
            fi
          else
            ok "Started workflow run $RUN_ID ($ENV_IN) (not watching)"
          fi
          echo "$RUN_URL"
          return 0
        else
          warn "Dispatch returned success but could not resolve run id for '$WF' on '$REF' ($ENV_IN)"
        fi
      else
        warn "Dispatch failed for '$WF' on '$REF' ($ENV_IN) (status $STATUS): ${OUT//$'\n'/  }"
      fi
    done
  done
  return 1
}

# Decide how to dispatch based on --profiles
case "$profiles" in
  prod)
    # Prefer main for prod, fallback to current branch
    if dispatch_redeploy prod main "$BRANCH"; then
      ok "Prod redeploy dispatched via GitHub Actions. EC2 IP: ${EC2_IP:-unknown}"
      popd >/dev/null; exit 0
    fi
    ;;
  dev)
    # Prefer current branch for dev, fallback to 'dev' then main
    if dispatch_redeploy dev "$BRANCH" dev main; then
      ok "Dev redeploy dispatched via GitHub Actions. EC2 IP: ${EC2_IP:-unknown}"
      popd >/dev/null; exit 0
    fi
    ;;
  both)
    # Always dispatch two separate runs: prod (main) then dev (current/dev)
    PROD_OK=false
    DEV_OK=false
    if dispatch_redeploy prod main "$BRANCH"; then PROD_OK=true; fi
    if dispatch_redeploy dev "$BRANCH" dev main; then DEV_OK=true; fi
    if [[ "$PROD_OK" == true || "$DEV_OK" == true ]]; then
      if [[ "$PROD_OK" == true && "$DEV_OK" == true ]]; then
        ok "Prod and Dev redeploys dispatched via GitHub Actions. EC2 IP: ${EC2_IP:-unknown}"
      elif [[ "$PROD_OK" == true ]]; then
        warn "Prod redeploy dispatched, but dev dispatch failed. You can re-run dev via: gh workflow run redeploy.yml -f environment=dev --ref ${BRANCH}"
      else
        warn "Dev redeploy dispatched, but prod dispatch failed. You can re-run prod via: gh workflow run redeploy.yml -f environment=prod --ref main"
      fi
      popd >/dev/null; exit 0
    fi
    ;;
esac

warn "All GitHub workflow dispatch attempts failed for requested profiles. Falling back to direct SSH restart from this script."

# SSH fallback: generate env files locally if requested and upload, then restart compose profiles
SSH_KEY="$HOME/.ssh/bb-portfolio-site-key.pem"
[[ -f "$SSH_KEY" ]] || die "SSH key not found at $SSH_KEY"

# Determine EC2_HOST (prefer Terraform outputs; fallback to local private secrets)
EC2_HOST="${EC2_IP:-}"
if [[ -z "$EC2_HOST" ]]; then
  EC2_HOST=$(resolve_ec2_host || true)
fi
if [[ -n "$EC2_HOST" ]]; then
  log "Using EC2 host: $EC2_HOST"
else
  die "EC2 host unknown for SSH fallback"
fi

if [[ "$refresh_env" == true ]]; then
  log "Generating env files locally from .github-secrets.private.json5 for upload"
  [[ -f "$REPO_ROOT/.github-secrets.private.json5" ]] || die ".github-secrets.private.json5 missing for env generation"
  TMP_DIR="$(mktemp -d)"
  (
    cd "$REPO_ROOT"
    EC2_ENV_OUT_DIR="$TMP_DIR" npx tsx -e '
      import { readFileSync, writeFileSync, mkdirSync } from "fs";
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const JSON5 = require("json5");
      const outDir = process.env.EC2_ENV_OUT_DIR as string;
      const raw = readFileSync(".github-secrets.private.json5", "utf8");
      const cfg = JSON5.parse(raw);
      const s = (cfg.strings || cfg);
      const sVal = (k: string, def?: string) => (s[k] ?? def ?? "");
      const S3_REGION = sVal("S3_REGION", "");
    // Security & env-guard inputs
      const SECURITY_TXT_EXPIRES = sVal("SECURITY_TXT_EXPIRES", "");
      const PROD_REQUIRED_ENVIRONMENT_VARIABLES = sVal("PROD_REQUIRED_ENVIRONMENT_VARIABLES", "");
      const DEV_REQUIRED_ENVIRONMENT_VARIABLES = sVal("DEV_REQUIRED_ENVIRONMENT_VARIABLES", "");
      const beProd = [
        "NODE_ENV=production",
        "ENV_PROFILE=prod",
        `PROD_AWS_REGION=${sVal("PROD_AWS_REGION", S3_REGION)}`,
        `PROD_MONGODB_URI=${sVal("PROD_MONGODB_URI")}`,
        `PROD_PAYLOAD_SECRET=${sVal("PROD_PAYLOAD_SECRET")}`,
        `PROD_S3_BUCKET=${sVal("PROD_S3_BUCKET")}`,
        `PUBLIC_PROJECTS_BUCKET=${sVal("PUBLIC_PROJECTS_BUCKET")}`,
        `NDA_PROJECTS_BUCKET=${sVal("NDA_PROJECTS_BUCKET")}`,
        `S3_REGION=${sVal("S3_REGION", sVal("PROD_AWS_REGION", ""))}`,
  `PROD_FRONTEND_URL=${sVal("PROD_FRONTEND_URL")}`,
  `PROD_BACKEND_INTERNAL_URL=${sVal("PROD_BACKEND_INTERNAL_URL", "http://bb-portfolio-backend-prod:3000")}`,
    // Security & env guard
        `SECURITY_TXT_EXPIRES=${SECURITY_TXT_EXPIRES}`,
        `PROD_REQUIRED_ENVIRONMENT_VARIABLES=${PROD_REQUIRED_ENVIRONMENT_VARIABLES}`,
        `PROD_SES_FROM_EMAIL=${sVal("PROD_SES_FROM_EMAIL")}`,
        `PROD_SES_TO_EMAIL=${sVal("PROD_SES_TO_EMAIL")}`,
      ].join("\n") + "\n";
      const beDev = [
        "NODE_ENV=development",
        "ENV_PROFILE=dev",
        "PORT=3000",
        `DEV_AWS_REGION=${sVal("DEV_AWS_REGION", S3_REGION)}`,
        `DEV_MONGODB_URI=${sVal("DEV_MONGODB_URI")}`,
        `DEV_PAYLOAD_SECRET=${sVal("DEV_PAYLOAD_SECRET")}`,
        `DEV_S3_BUCKET=${sVal("DEV_S3_BUCKET")}`,
        `PUBLIC_PROJECTS_BUCKET=${sVal("PUBLIC_PROJECTS_BUCKET")}`,
        `NDA_PROJECTS_BUCKET=${sVal("NDA_PROJECTS_BUCKET")}`,
        `S3_REGION=${sVal("S3_REGION", sVal("DEV_AWS_REGION", ""))}`,
  `DEV_FRONTEND_URL=${sVal("DEV_FRONTEND_URL")}`,
  `DEV_BACKEND_INTERNAL_URL=${sVal("DEV_BACKEND_INTERNAL_URL", "http://bb-portfolio-backend-dev:3000")}`,
    // Security & env guard
        `SECURITY_TXT_EXPIRES=${SECURITY_TXT_EXPIRES}`,
        `DEV_REQUIRED_ENVIRONMENT_VARIABLES=${DEV_REQUIRED_ENVIRONMENT_VARIABLES}`,
        `DEV_SES_FROM_EMAIL=${sVal("DEV_SES_FROM_EMAIL")}`,
        `DEV_SES_TO_EMAIL=${sVal("DEV_SES_TO_EMAIL")}`,
      ].join("\n") + "\n";
      const feProd = [
        "NODE_ENV=production",
        "ENV_PROFILE=prod",
        // Internal URL used by Next.js SSR/server for rewrites/fetches
        `PROD_BACKEND_INTERNAL_URL=${sVal("PROD_BACKEND_INTERNAL_URL", "http://bb-portfolio-backend-prod:3000")}`,
      ].join("\n") + "\n";
      const feDev = [
        "NODE_ENV=development",
        "ENV_PROFILE=dev",
        // Internal URL used by Next.js SSR/server inside the compose network
        `DEV_BACKEND_INTERNAL_URL=${sVal("DEV_BACKEND_INTERNAL_URL", "http://bb-portfolio-backend-dev:3000")}`,
      ].join("\n") + "\n";
      mkdirSync(outDir, { recursive: true });
      writeFileSync(`${outDir}/backend.env.prod`, beProd, "utf8");
      writeFileSync(`${outDir}/backend.env.dev`, beDev, "utf8");
      writeFileSync(`${outDir}/frontend.env.prod`, feProd, "utf8");
      writeFileSync(`${outDir}/frontend.env.dev`, feDev, "utf8");
    '
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
