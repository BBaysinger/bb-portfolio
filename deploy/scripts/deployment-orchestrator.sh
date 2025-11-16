#!/usr/bin/env bash
################################################################################
# BB Portfolio Deployment Orchestrator
################################################################################
# Blue-Green deployment pipeline that orchestrates the full deployment lifecycle:
#
# 1. Infrastructure Provisioning (Terraform)
#    - Always creates/taints blue (candidate) instance for fresh deployments
#    - Green (production) serves live traffic via production Elastic IP
#    - Blue gets separate Elastic IP for validation before promotion
#
# 2. Container Image Builds (Docker/ECR/Docker Hub)
#    - Builds prod images (ECR: bb-portfolio-backend-prod, frontend-dev)
#    - Builds dev images (Docker Hub: backend:dev, frontend:dev)
#    - Both profiles built together by default
#
# 3. Application Deployment (GitHub Actions)
#    - Triggers redeploy.yml workflow for container deployment
#    - Generates runtime .env files on EC2 from GitHub Secrets
#    - Falls back to SSH if GitHub Actions unavailable
#
# 4. Configuration Sync
#    - Deploys nginx reverse proxy config to blue instance
#    - Blue instance accessible via IP (nginx server_name includes BLUE_IP)
#    - SSL cert provisioning (if configured)
#
# 5. Optional Promotion (--promote flag)
#    - Calls scripts/orchestrator-promote.sh for blue → green handover
#    - Performs health checks before and after EIP swap
#    - Updates instance Role tags (active/candidate)
#    - Supports --auto-promote to skip confirmation prompt
#
# Usage:
#   npm run orchestrate                # Deploy to blue candidate only
#   npm run orchestrate:auto-promote   # Deploy + auto-promote (no manual test)
#   npm run candidate-promote          # Promote existing blue (separate script)
#
# Automation note:
# - Prefer invoking via npm scripts (above) instead of calling this file
#   directly so flags like --promote/--auto-promote/--refresh-env remain
#   consistent across operators and AI tools.
#
# Workflow:
#   1. orchestrate                     → Blue deployed at http://52.37.142.50
#   2. Test blue manually              → Validate application works
#   3. candidate-promote               → Swap IPs, blue becomes production
################################################################################
# - Falls back to SSH-based deployment if GitHub workflow dispatch fails
# - First-time friendly: if no EC2 exists yet, Terraform apply bootstraps it
# - By default, existing instances preserved; use --destroy to recreate from scratch
#
# Blue-green deployment support:
# - Deploy candidate instance: --target candidate --profiles prod
# - Validate candidate manually or via health checks
# - Promote to active: --promote (triggers EIP handover with health checks)
# - Auto-promote for CI/CD: --auto-promote (skips confirmation prompt)
# - Retention management: --prune-after-promotion (cleanup old previous instances)
#
# Runtime architecture on EC2:
# - Reverse proxy: Nginx on host forwards traffic to Docker Compose services
# - Containers: four Node.js containers based on Debian (node:22-slim) images
#   managed by Docker Compose using two profiles:
#   • prod:   bb-portfolio-frontend-prod (host:3000 → container:3000)
#             bb-portfolio-backend-prod  (host:3001 → container:3000)
#   • dev:    bb-portfolio-frontend-dev  (host:4000 → container:3000)
#             bb-portfolio-backend-dev   (host:4001 → container:3000)
# - DNS/routing (typical):
#   • bbaysinger.com        → prod frontend:3000 + backend:3001 (via production EIP)
#   • dev.bbaysinger.com    → dev frontend:4000 + backend:4001
# - Blue-green: candidate instance has separate EIP until promoted
#
# Security model — Secrets and env files:
# - .env.dev/.env.prod NOT committed; generated on EC2 by GitHub workflow from Secrets
# - Local development uses .env only (not .env.prod/.env.dev)
# - This script can generate env files from .github-secrets.private.json5 for SSH fallback
# - Production secrets stored in GitHub (encrypted at rest) and AWS (SSM Parameter Store)
#
# Usage examples:
#   # Standard production deployment
#   deploy/scripts/deployment-orchestrator.sh --profiles prod
#
#   # Blue-green candidate deployment
#   deploy/scripts/deployment-orchestrator.sh --target candidate --profiles prod
#
#   # Blue-green promotion with automated handover
#   # --auto-promote implies --promote
#   deploy/scripts/deployment-orchestrator.sh --target candidate --auto-promote
#
#   # Container-only update (skip Terraform)
#   deploy/scripts/deployment-orchestrator.sh --containers-only --profiles both
#
#   # Development environment update
#   deploy/scripts/deployment-orchestrator.sh --profiles dev
#
# Requirements:
# - aws CLI configured with EC2/ECR/IAM permissions
# - terraform >= 1.x for infrastructure provisioning
# - node/npm for secrets sync utilities
# - docker with BuildKit support (if building images)
# - gh CLI authenticated with repo workflow permissions
# - .github-secrets.private.json5 present locally for Terraform var generation

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
baseline_reset=false  # When true, perform snapshot & stricter confirmation before destroy
baseline_snapshot_id=""
taint_blue=true     # Default: recreate blue instance for fresh state; use --reuse-blue to skip
profiles="both"   # prod|dev|both
workflows="redeploy.yml" # comma-separated list of workflow names or filenames to trigger (e.g., 'Redeploy' or 'redeploy.yml')
refresh_env=false   # whether GH workflow should regenerate/upload env files
restart_containers=true # whether GH workflow should restart containers
watch_logs=true     # whether to watch GH workflow logs
sync_secrets=true   # whether to sync local secrets to GitHub
discover_only=false # perform discovery and exit without changes
plan_only=false     # run terraform plan (summary) and exit (no apply)
prune_after_promotion=false # if true, invoke retention pruning for old instances (Role=red/previous)
retention_count=2            # how many previous instances to keep when pruning
retention_days=""           # if set, only prune those older than this many days
promote=false                # if true, run Elastic IP handover (blue → green) before optional pruning
auto_approve_handover=false  # if true, skip confirmation prompt for handover
handover_rollback=true       # attempt rollback on post-swap failure
handover_snapshot=false      # snapshot active root volume before swap
REMOTE_USER="ec2-user"      # SSH login user (supports Ubuntu images); override via --remote-user
REMOTE_HOME="/home/${REMOTE_USER}"  # recomputed after arg parsing if REMOTE_USER changes
REMOTE_REPO="${REMOTE_HOME}/bb-portfolio"

usage() {
  cat <<USAGE
Full deploy via GitHub (infra/images local; containers via GH Actions)

Options:
  --force                 Skip confirmation for Terraform destroy
  --profiles [val]        Which profiles to start in GH: prod|dev|both (default: both)
  --destroy               Destroy and recreate EC2 infra (default: preserve existing)
  --reuse-blue            Reuse existing blue instance instead of recreating (faster, but may have stale state)
  --containers-only       Skip all Terraform/infra steps (no destroy/apply)
  --baseline-reset        Snapshot root volume then targeted destroy (requires CONFIRM_BASELINE=YES)
  --target [role]         Target instance role for container deploy: active|candidate (default: active)
  --prune-after-promotion Prune old previous instances after successful deploy (blue-green retention)
  --retention-count [n]   Retention: keep newest N previous instances (default: 2)
  --retention-days [n]    Retention: only prune if demoted age >= N days (optional)
  --promote               After deploying to candidate, perform EIP handover (promote candidate → active)
  --auto-promote          Imply --promote and auto-approve handover after health checks (no prompt)
  --auto-approve          Deprecated alias for --auto-promote
  --handover-no-rollback  Disable rollback on failed post-swap health
  --handover-snapshot     Snapshot current active root volume before handover
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
    --profiles)
      profiles="${2:-}"; [[ "$profiles" =~ ^(prod|dev|both)$ ]] || die "--profiles must be prod|dev|both"; shift 2 ;;
    --destroy) do_destroy=true; shift ;;
    --reuse-blue) taint_blue=false; shift ;;
    --containers-only) do_infra=false; shift ;;
  --baseline-reset) baseline_reset=true; do_destroy=true; shift ;;
    --gh-workflows)
      workflows="${2:-}"; [[ -n "$workflows" ]] || die "--gh-workflows requires at least one name"; shift 2 ;;
    --refresh-env) refresh_env=true; shift ;;
    --no-restart) restart_containers=false; shift ;;
    --no-watch) watch_logs=false; shift ;;
    --no-secrets-sync) sync_secrets=false; shift ;;
    --discover-only) discover_only=true; shift ;;
    --plan-only) plan_only=true; shift ;;
    --prune-after-promotion) prune_after_promotion=true; shift ;;
    --retention-count)
      retention_count="${2:-}"; [[ "$retention_count" =~ ^[0-9]+$ ]] || die "--retention-count must be integer"; shift 2 ;;
    --retention-days)
      retention_days="${2:-}"; [[ "$retention_days" =~ ^[0-9]+$ ]] || die "--retention-days must be integer"; shift 2 ;;
    --promote) promote=true; shift ;;
    --auto-promote) auto_approve_handover=true; promote=true; shift ;;
    --auto-approve) warn "--auto-approve is deprecated; use --auto-promote"; auto_approve_handover=true; shift ;;
    --handover-no-rollback) handover_rollback=false; shift ;;
    --handover-snapshot) handover_snapshot=true; shift ;;
    --remote-user)
      REMOTE_USER="${2:-}"; [[ -n "$REMOTE_USER" ]] || die "--remote-user requires a username"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) die "Unknown option: $1" ;;
  esac
done

# Recompute derived remote paths after potential --remote-user override
REMOTE_HOME="/home/${REMOTE_USER}"
REMOTE_REPO="${REMOTE_HOME}/bb-portfolio"

# Prereqs
need() { command -v "$1" >/dev/null 2>&1 || die "$1 is required"; }
need aws; need terraform; need node; need npm; need gh
need docker
ensure_blue_ip() {
  if [[ -n "${BLUE_INSTANCE_IP:-}" ]]; then return 0; fi
  # Try terraform outputs first (best-effort)
  if command -v terraform >/dev/null 2>&1 && [ -d "$INFRA_DIR" ]; then
    pushd "$INFRA_DIR" >/dev/null || true
    set +e
    BLUE_INSTANCE_IP=$(terraform output -raw blue_elastic_ip 2>/dev/null)
    [[ -z "$BLUE_INSTANCE_IP" ]] && BLUE_INSTANCE_IP=$(terraform output -raw blue_instance_public_ip 2>/dev/null)
    set -e
    popd >/dev/null || true
    if [[ -n "$BLUE_INSTANCE_IP" ]]; then export BLUE_INSTANCE_IP; return 0; fi
  fi
  # Fallback to AWS CLI by tag Role=candidate
  if command -v aws >/dev/null 2>&1; then
    set +e
    BLUE_INSTANCE_IP=$(aws ec2 describe-instances \
      --filters "Name=tag:Project,Values=bb-portfolio" "Name=tag:Role,Values=candidate" "Name=instance-state-name,Values=running" \
      --query 'Reservations[].Instances[].PublicIpAddress' --output text 2>/dev/null | awk 'NF' | head -n1)
    set -e
    if [[ -n "$BLUE_INSTANCE_IP" ]]; then export BLUE_INSTANCE_IP; return 0; fi
  fi
  # Last resort: use resolved host if it looks like an IP
  if [[ -n "${EC2_HOST_RESOLVE:-}" && "$EC2_HOST_RESOLVE" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]; then
    BLUE_INSTANCE_IP="$EC2_HOST_RESOLVE"; export BLUE_INSTANCE_IP; return 0;
  fi
  return 1
}

# Early confirmation if promotion requested (always prompt here).
if [[ "$promote" == true ]]; then
  if [[ "$auto_approve_handover" == true ]]; then
    warn "Auto-promote enabled: if health checks pass, handover will proceed without an additional prompt."
  else
    warn "Promotion requested (--promote): handover will prompt again just before EIP swap."
  fi
  echo "This run will:"
  echo "  1) Deploy to blue (candidate)"
  echo "  2) Run health checks on the candidate"
  if [[ "$auto_approve_handover" == true ]]; then
    echo "  3) Perform EIP handover automatically (no prompt)"
  else
    echo "  3) Ask for confirmation before performing EIP handover"
  fi
  echo ""
  printf "Type 'yes' to proceed with deploy + promotion plan: "
  read -r ans
  [[ "$ans" == yes ]] || die "Cancelled before deployment"
fi

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
  log "Initializing Terraform..."
  set +e
  terraform init -input=false >/dev/null 2>&1
  log "Reading Terraform state..."
  STATE=$(terraform state list 2>/dev/null)
  INIT_STATUS=$?
  set -e
  if [[ $INIT_STATUS -ne 0 ]]; then
    warn "Discovery: terraform state not initialized yet"
    STATE=""
  fi
  log "Checking for instances and resources..."
  # Check for specific blue/green instances
  has_green_inst=false
  if echo "$STATE" | grep -Eq '^aws_instance\\.bb_portfolio_green'; then
    has_green_inst=true
  fi
  has_blue_inst=false
  if echo "$STATE" | grep -Eq '^aws_instance\\.bb_portfolio_blue'; then
    has_blue_inst=true
  fi
  
  has_sg=$(echo "$STATE" | grep -Ec '^aws_security_group\\.bb_portfolio_sg$' || true)
  has_eip=$(echo "$STATE" | grep -Ec '^aws_eip\\.bb_portfolio_ip$' || true)
  has_eip_assoc=$(echo "$STATE" | grep -Ec '^aws_eip_association\\.' || true)
  has_s3_dev=$(echo "$STATE" | grep -Ec '^aws_s3_bucket\\.media\["dev"\]$' || true)
  has_s3_prod=$(echo "$STATE" | grep -Ec '^aws_s3_bucket\\.media\["prod"\]$' || true)
  has_ecr_fe=$(echo "$STATE" | grep -Ec '^aws_ecr_repository\\.frontend$' || true)
  has_ecr_be=$(echo "$STATE" | grep -Ec '^aws_ecr_repository\.backend$' || true)

  log "Retrieving instance IPs from Terraform outputs..."
  # Outputs (best-effort) - get both green and blue IPs
  set +e
  GREEN_EIP=$(terraform output -raw green_elastic_ip 2>/dev/null)
  GREEN_PUB=$(terraform output -raw green_instance_public_ip 2>/dev/null)
  BLUE_EIP=$(terraform output -raw blue_elastic_ip 2>/dev/null)
  BLUE_PUB=$(terraform output -raw blue_instance_public_ip 2>/dev/null)
  # Legacy fallback for old output names
  [[ -z "$GREEN_EIP" ]] && GREEN_EIP=$(terraform output -raw bb_portfolio_elastic_ip 2>/dev/null)
  [[ -z "$GREEN_PUB" ]] && GREEN_PUB=$(terraform output -raw bb_portfolio_instance_ip 2>/dev/null)
  set -e

  echo ""
  echo "===== Discovery Summary ====="
  echo "Terraform state initialized:    $([[ $INIT_STATUS -eq 0 ]] && echo yes || echo no)"
  echo ""
  echo "--- Green (Active) Instance ---"
  echo "Green instance present:         $([[ "$has_green_inst" == true ]] && echo yes || echo no)"
  [[ -n "$GREEN_EIP" ]] && echo "Green elastic IP:               $GREEN_EIP" || true
  [[ -n "$GREEN_PUB" ]] && echo "Green public IP:                $GREEN_PUB" || true
  echo ""
  echo "--- Blue (Candidate) Instance ---"
  echo "Blue instance present:          $([[ "$has_blue_inst" == true ]] && echo yes || echo no)"
  [[ -n "$BLUE_EIP" ]] && echo "Blue elastic IP:                $BLUE_EIP" || true
  [[ -n "$BLUE_PUB" ]] && echo "Blue public IP:                 $BLUE_PUB" || true
  echo ""
  echo "--- Shared Resources ---"
  echo "Security group present:         $([[ $has_sg -gt 0 ]] && echo yes || echo no)"
  echo "Elastic IP present:             $([[ $has_eip -gt 0 ]] && echo yes || echo no)"
  echo "EIP association present:        $([[ $has_eip_assoc -gt 0 ]] && echo yes || echo no)"
  echo "S3 buckets (dev/prod):          $([[ $has_s3_dev -gt 0 ]] && echo dev || echo - ) / $([[ $has_s3_prod -gt 0 ]] && echo prod || echo - )"
  echo "ECR repos (fe/be):              $([[ $has_ecr_fe -gt 0 ]] && echo yes || echo no) / $([[ $has_ecr_be -gt 0 ]] && echo yes || echo no)"
  echo ""
  log "Running connectivity checks..."
  echo "--- Connectivity Checks ---"
  if [[ -n "$GREEN_EIP" ]]; then
    if nc -vz -G 2 "$GREEN_EIP" 22 >/dev/null 2>&1; then
      echo "Green SSH (22) reachable:       yes"
    else
      echo "Green SSH (22) reachable:       no"
    fi
    if curl -s -I --connect-timeout 3 --max-time 5 "http://$GREEN_EIP" 2>/dev/null | head -1 | grep -q "200"; then
      echo "Green HTTP (80) responding:     yes"
    else
      echo "Green HTTP (80) responding:     no"
    fi
  fi
  if [[ -n "$BLUE_EIP" ]]; then
    if nc -vz -G 2 "$BLUE_EIP" 22 >/dev/null 2>&1; then
      echo "Blue SSH (22) reachable:        yes"
    else
      echo "Blue SSH (22) reachable:        no"
    fi
    if curl -s -I --connect-timeout 3 --max-time 5 "http://$BLUE_EIP" 2>/dev/null | head -1 | grep -q "200"; then
      echo "Blue HTTP (80) responding:      yes"
    else
      echo "Blue HTTP (80) responding:      no"
    fi
  fi
  echo "=============================="
  echo ""
  echo "--- Next Steps ---"
  if [[ "$do_infra" == true ]]; then
    echo "1. Run Terraform plan/apply       (~2-3 min for new infrastructure)"
  else
    echo "1. Skip Terraform                 (containers-only mode)"
  fi
  echo "2. Build Docker images            (~5-10 min depending on cache)"
  echo "3. Deploy containers to instance  (~2-3 min for pull + startup)"
  echo "4. Health checks and validation   (~30 sec)"
  echo ""
  echo "⏱️  Expected total time: 10-20 minutes"
  echo "💡 You can monitor progress by tailing: tail -f /tmp/orchestrator-output.log"
  echo "=============================="
  echo ""
  popd >/dev/null
}

tf_plan_summary() {
  pushd "$INFRA_DIR" >/dev/null
  log "Running terraform plan (summary)"
  
  # Blue (candidate) is always created
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
  # Get blue instance IP from Terraform outputs (source of truth)
  pushd "$INFRA_DIR" >/dev/null
  BLUE_INSTANCE_IP=$(terraform output -raw blue_elastic_ip 2>/dev/null || echo "52.37.142.50")
  GREEN_INSTANCE_IP=$(terraform output -raw green_elastic_ip 2>/dev/null || echo "44.246.43.116")
  popd >/dev/null
  # Export for legacy scripts that still use EC2_INSTANCE_IP (TODO: refactor those)
  export EC2_INSTANCE_IP="$BLUE_INSTANCE_IP"
  export BLUE_INSTANCE_IP
  export GREEN_INSTANCE_IP
  log "Blue instance IP: $BLUE_INSTANCE_IP"
  log "Green instance IP: $GREEN_INSTANCE_IP"
  npx tsx ./deploy/scripts/generate-terraform-vars.ts
fi

# Set AWS profile for image push operations
export AWS_PROFILE="${AWS_PROFILE:-bb-portfolio-user}"

# Optional image build/push (delegates to existing npm scripts)
log "Building & pushing container images (frontend + backend)"
log "Building & pushing production images to ECR"
npm run ecr:build-push
ok "Pushed prod images"
log "Building & pushing development images to Docker Hub"
npm run docker:build-push
ok "Pushed dev images"

# Terraform: optional targeted destroy preserving S3/ECR/EIP, then apply
if [[ "$do_infra" == true ]]; then
  pushd "$INFRA_DIR" >/dev/null
  log "Initializing Terraform"
  terraform init -input=false

  # If a blue (candidate) instance already exists and we are about to recreate it,
  # prompt the operator to confirm replacement or choose reuse.
  if [[ "$taint_blue" == true ]]; then
    set +e
    EXISTING_CANDIDATE_ID=$(aws ec2 describe-instances \
      --filters "Name=tag:Project,Values=bb-portfolio" "Name=tag:Role,Values=candidate" "Name=instance-state-name,Values=running" \
      --query 'Reservations[].Instances[].InstanceId' --output text 2>/dev/null | awk 'NF' | head -n1)
    set -e
    if [[ -n "$EXISTING_CANDIDATE_ID" ]]; then
      warn "An existing blue (candidate) instance is running: $EXISTING_CANDIDATE_ID"
      echo "You are about to replace it with a fresh blue instance (Terraform taint)."
      echo "Options:"
      echo "  - Type 'replace' to destroy+recreate blue (default)"
      echo "  - Type 'reuse'   to keep current blue and deploy onto it"
      echo "  - Type 'cancel'  to abort this run"
      printf "Your choice [replace/reuse/cancel]: "
      read -r CHOICE
      case "$CHOICE" in
        reuse|REUSE)
          taint_blue=false
          ok "Reusing existing blue (candidate); skipping taint/recreate"
          ;;
        cancel|CANCEL)
          die "Cancelled before Terraform apply"
          ;;
        * )
          warn "Proceeding with replacement of blue (candidate)"
          ;;
      esac
    fi
  fi

  # Baseline reset safeguard & snapshot
  if [[ "$baseline_reset" == true ]]; then
    if [[ "${CONFIRM_BASELINE:-}" != "YES" ]]; then
      die "Baseline reset requested; export CONFIRM_BASELINE=YES to proceed"
    fi
    log "Baseline reset enabled: attempting pre-destroy snapshot of root volume"
    instance_id=$(terraform output -raw bb_portfolio_instance_id 2>/dev/null || true)
    if [[ -n "$instance_id" && "$instance_id" != "null" ]]; then
      root_vol=$(aws ec2 describe-instances --instance-ids "$instance_id" --query "Reservations[0].Instances[0].BlockDeviceMappings[?DeviceName=='/dev/xvda'].Ebs.VolumeId" --output text 2>/dev/null || true)
      if [[ -n "$root_vol" && "$root_vol" != "None" ]]; then
        desc="bb-portfolio baseline pre-destroy $(date -u +%Y-%m-%dT%H:%M:%SZ)"
        baseline_snapshot_id=$(aws ec2 create-snapshot --volume-id "$root_vol" --description "$desc" --tag-specifications 'ResourceType=snapshot,Tags=[{Key=Name,Value=bb-portfolio-baseline}]' --query 'SnapshotId' --output text 2>/dev/null || true)
        if [[ -n "$baseline_snapshot_id" ]]; then
          ok "Created snapshot $baseline_snapshot_id for volume $root_vol"
        else
          warn "Snapshot creation failed; continuing without snapshot"
        fi
      else
        warn "Root volume not found for instance $instance_id"
      fi
    else
      warn "Instance ID output missing; cannot snapshot"
    fi
  fi

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
        prompt="Type 'yes' to confirm destroy"; [[ "$baseline_reset" == true ]] && prompt="Type 'yes' to confirm baseline reset destroy (snapshot: ${baseline_snapshot_id:-none})"
        echo "$prompt:"; read -r ans; [[ "$ans" == yes ]] || die "Cancelled"
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
  
  # Taint blue instance by default for fresh state (skip with --reuse-blue)
  if [[ "$taint_blue" == true ]]; then
    log "Tainting blue instance for recreation (use --reuse-blue to skip)"
    terraform taint aws_instance.bb_portfolio_blue 2>/dev/null || warn "Blue instance not in state or already tainted"
  else
    warn "Reusing existing blue instance (faster but may have stale state)"
  fi
  
  # Blue (candidate) is always created
  log "Creating blue (candidate) instance"
  
  terraform plan -out=tfplan
  terraform apply -input=false tfplan
  rm -f tfplan
  
  # Mark that Terraform ran so we can wait for new instances to launch
  RAN_TERRAFORM="true"

  # Detect EIP for info/logs (GH workflow uses EC2_HOST secret at runtime)
  EC2_IP=$(terraform output -raw bb_portfolio_elastic_ip 2>/dev/null || terraform output -raw bb_portfolio_instance_ip 2>/dev/null || true)
  popd >/dev/null

  # Regenerate tfvars in case IP-based URLs in secrets changed locally
  log "Regenerating terraform vars after apply"
  npx tsx ./deploy/scripts/generate-terraform-vars.ts
  
  # Note: IP update happens AFTER promotion when blue becomes green
  # For now, skip updating EC2_HOST since we're deploying to blue candidate
  warn "Deploying to blue candidate - EC2_HOST will be updated after promotion"
  # Defer enforcement/HTTPS until functions are defined below
  POST_ENFORCE_HOST="${EC2_IP:-}"
else
  warn "Skipping Terraform/infra per --containers-only"
fi

# Optionally sync secrets to GitHub (keeps GH secrets aligned with local private json5)
if [[ "$sync_secrets" == true ]]; then
  log "Syncing GitHub secrets from private json5"
  # Note: sync-github-secrets reads EC2_HOST from .github-secrets.private.json5
  # We'll override it below after determining the candidate IP
  npx tsx ./scripts/sync-github-secrets.ts BBaysinger/bb-portfolio .github-secrets.private.json5
else
  warn "Skipping GitHub secrets sync per --no-secrets-sync"
fi

# ---------------------------
# Target instance resolution (active|candidate)
# ---------------------------
discover_instance_public_ip_by_role() {
  local role="$1"
  aws ec2 describe-instances \
    --filters "Name=tag:Project,Values=bb-portfolio" "Name=tag:Role,Values=$role" "Name=instance-state-name,Values=running" \
    --query 'Reservations[].Instances[].PublicIpAddress' --output text 2>/dev/null | awk 'NF'
}

# Resolve blue (candidate) IP for containers-only or when Terraform outputs are unavailable
ensure_blue_ip || true
# Fallback via AWS if still empty
if [[ -z "${BLUE_INSTANCE_IP:-}" ]]; then
  BLUE_INSTANCE_IP=$(discover_instance_public_ip_by_role candidate | head -n1 || true)
  [[ -n "$BLUE_INSTANCE_IP" ]] && export BLUE_INSTANCE_IP || true
fi
# Last resort: try resolved host
if [[ -z "${BLUE_INSTANCE_IP:-}" && -n "${EC2_HOST_RESOLVE:-}" ]]; then
  BLUE_INSTANCE_IP="$EC2_HOST_RESOLVE"; export BLUE_INSTANCE_IP || true
fi

CANDIDATE_IP="${BLUE_INSTANCE_IP:-}"

if [[ -z "$CANDIDATE_IP" ]]; then
  die "No blue (candidate) instance IP could be determined."
fi
warn "Deploying to candidate instance at $CANDIDATE_IP"

# Update EC2_HOST secret to point to blue candidate before dispatching GitHub Actions
log "Updating EC2_HOST secret to blue candidate IP: $CANDIDATE_IP"
gh secret set EC2_HOST --body "$CANDIDATE_IP" --repo BBaysinger/bb-portfolio || warn "Failed to update EC2_HOST secret"

# Mandatory SSH connectivity check to candidate before proceeding
log "Verifying SSH connectivity to candidate ($CANDIDATE_IP)"
SSH_KEY="${HOME}/.ssh/bb-portfolio-site-key.pem"
if [[ ! -f "$SSH_KEY" ]]; then
  die "SSH key not found at $SSH_KEY; cannot validate candidate connectivity."
fi
set +e
ssh -i "$SSH_KEY" -o ConnectTimeout=12 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ec2-user@"$CANDIDATE_IP" "echo CANDIDATE_SSH_OK" 2>/dev/null | grep -q CANDIDATE_SSH_OK
SSH_STATUS=$?
set -e
if [[ $SSH_STATUS -ne 0 ]]; then
  die "SSH connectivity to candidate $CANDIDATE_IP failed. Aborting before container/nginx steps. Verify instance security group, key, and public IP." 
else
  ok "SSH connectivity to candidate confirmed."
fi

# Override POST_ENFORCE_HOST for controller enforcement
POST_ENFORCE_HOST="$CANDIDATE_IP"

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
echo ""
warn "Blue candidate deployed at $CANDIDATE_IP (EIP: ${BLUE_INSTANCE_IP:-$CANDIDATE_IP})"
warn "Promotion to production is MANUAL. After validating the candidate:"
warn "  Run: npm run candidate-promote"
echo ""

need jq

BRANCH=$(git rev-parse --abbrev-ref HEAD)
WF_CANDIDATES=("$workflows" "Redeploy" ".github/workflows/redeploy.yml" "redeploy.yml" ".github/workflows/redeploy-manual.yml" "redeploy-manual.yml")

# Ensure only a single controller manages containers on EC2.
# - Disable/remove legacy systemd unit 'portfolio.service'
# - Archive legacy compose file '/home/ec2-user/bb-portfolio/docker-compose.yml'
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
  log "Enforcing single controller on $host (disable legacy service, archive legacy compose) as $REMOTE_USER"
  ssh -i "$key" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "${REMOTE_USER}"@"$host" bash -lc $'set -e
    # Disable and remove legacy systemd unit if present
    if systemctl list-unit-files | grep -q "^portfolio.service"; then
      sudo systemctl disable --now portfolio.service || true
      sudo rm -f /etc/systemd/system/portfolio.service || true
      sudo systemctl daemon-reload || true
    fi
    # Archive legacy compose file in project root if present (ec2-user historical path)
    if [ -f "/home/ec2-user/bb-portfolio/docker-compose.yml" ]; then
      mv -f /home/ec2-user/bb-portfolio/docker-compose.yml /home/ec2-user/bb-portfolio/docker-compose.legacy.yml || true
    fi
    # Archive legacy compose file in REMOTE_REPO if present
    if [ -f "${REMOTE_REPO}/docker-compose.yml" ]; then
      mv -f "${REMOTE_REPO}/docker-compose.yml" "${REMOTE_REPO}/docker-compose.legacy.yml" || true
    fi
    chmod -x "${REMOTE_REPO}/generate-env-files.sh" 2>/dev/null || true
  '
}

# Sync nginx configuration to EC2 instance with blue IP substitution
# Args: $1=host (ec2-user@ip), $2=blue_ip (optional)
sync_nginx_config() {
  local host="$1"
  local blue_ip="${2:-}"
  local key="${HOME}/.ssh/bb-portfolio-site-key.pem"
  
  if [[ -z "$host" ]]; then
    warn "sync_nginx_config: host required"
    return 1
  fi
  
  local nginx_template="${REPO_ROOT}/deploy/nginx/bb-portfolio.conf.template"
  if [[ ! -f "$nginx_template" ]]; then
    warn "Nginx template not found: $nginx_template"
    return 1
  fi
  
  # Prepare config with IP substitution if needed
  local temp_conf="/tmp/bb-portfolio-nginx-$$.conf"
  if [[ -n "$blue_ip" ]]; then
    log "Substituting BLUE_IP_PLACEHOLDER with $blue_ip in nginx config"
    sed "s/BLUE_IP_PLACEHOLDER/$blue_ip/g" "$nginx_template" > "$temp_conf"
  else
    cp "$nginx_template" "$temp_conf"
  fi
  
  # Clear known_hosts entry to tolerate EC2 host key changes on recreate
  local host_only
  host_only="${host##*@}"
  ssh-keygen -R "$host_only" >/dev/null 2>&1 || true

  log "Uploading nginx config to $host"
  scp -i "$key" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$temp_conf" "$host:/tmp/bb-portfolio.conf" || { rm -f "$temp_conf"; return 1; }
  rm -f "$temp_conf"
  
  log "Applying nginx config on $host"
  ssh -i "$key" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$host" 'sudo bash -s' <<'REMOTE_CMDS'
set -euo pipefail
ts=$(date +%Y%m%d_%H%M%S)
TARGET="/etc/nginx/conf.d/bb-portfolio.conf"
LEGACY="/etc/nginx/conf.d/portfolio.conf"

if [[ -f "$TARGET" ]]; then
  cp "$TARGET" "$TARGET.bak.$ts"
  echo "Backup created: $TARGET.bak.$ts"
fi
if [[ -f "$LEGACY" ]]; then
  cp "$LEGACY" "$LEGACY.bak.$ts"
  echo "Legacy backup created: $LEGACY.bak.$ts"
  rm -f "$LEGACY"
fi
mv /tmp/bb-portfolio.conf "$TARGET"
# WebSocket upgrade now handled with static Connection header; legacy map removed if present
if [ -f /etc/nginx/conf.d/00-websocket-upgrade.conf ]; then
  rm -f /etc/nginx/conf.d/00-websocket-upgrade.conf || true
fi
if nginx -t; then
  systemctl reload nginx && echo "Nginx reloaded successfully."
else
  echo "Nginx config test FAILED" >&2
  exit 1
fi
REMOTE_CMDS
  
  log "Nginx config sync complete"
}

# Verify port 80 responds with 2xx/3xx; return nonzero if not
verify_http80() {
  local ip="$1"; local attempts=${HEALTH_RETRY_ATTEMPTS:-6}; local delay=${HEALTH_RETRY_DELAY:-5}
  local i=0 code=""
  while [ $i -lt $attempts ]; do
    code=$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 5 --max-time 10 "http://$ip/" -L || echo "000")
    if [[ "$code" == 2* || "$code" == 3* ]]; then
      ok "HTTP :80 on $ip responded ($code, attempt $((i+1)))"
      return 0
    fi
    i=$((i+1))
    if [[ "$code" == "000" && $i -lt $attempts ]]; then
      warn "Transient HTTP 000 on $ip (attempt $i/$attempts)"
      sleep "$delay"; continue
    fi
    warn "Attempt $i/$attempts :80 on $ip code=$code"
    sleep "$delay"
  done
  err "HTTP :80 on $ip unhealthy after $attempts attempts (last code=$code)"
  return 1
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
  log "Ensuring HTTPS certificates present on $host (user=${REMOTE_USER})"
  ssh -i "$key" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "${REMOTE_USER}"@"$host" bash -lc $'set -e
    # Legacy websocket map cleanup (no longer needed)
    if [ -f /etc/nginx/conf.d/00-websocket-upgrade.conf ]; then
      sudo rm -f /etc/nginx/conf.d/00-websocket-upgrade.conf || true
    fi
    
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

# If infra step was skipped and EC2_IP is unknown, optionally resolve host for nginx/certs.
# In --containers-only mode we deliberately skip host enforcement and nginx sync to avoid
# unintended SSH attempts to the production EIP. This keeps a pure "images + GH Actions" flow.
if [[ -z "${EC2_IP:-}" ]]; then
  if [[ "$do_infra" == true ]]; then
    EC2_HOST_RESOLVE=$(resolve_ec2_host || true)
    if [[ -n "$EC2_HOST_RESOLVE" ]]; then
      log "Resolved EC2 host: $EC2_HOST_RESOLVE"
      enforce_single_controller "$EC2_HOST_RESOLVE"
      # Deploy nginx configuration
      ensure_blue_ip || warn "Could not determine BLUE_INSTANCE_IP; proceeding without substitution"
      log "Syncing nginx configuration to $EC2_HOST_RESOLVE"
      if ! sync_nginx_config "ec2-user@$EC2_HOST_RESOLVE" "${BLUE_INSTANCE_IP:-}"; then
        die "Nginx config sync failed (host $EC2_HOST_RESOLVE). Check SSH connectivity and try again."
      fi
      ensure_https_certs "$EC2_HOST_RESOLVE" "${ACME_EMAIL:-}"
      POST_HTTP_VERIFY_HOST="$EC2_HOST_RESOLVE"
    else
      warn "Single-controller guard: no host resolved (infra flow), skipping"
    fi
  else
    warn "Containers-only mode: skipping host enforcement, nginx sync, and cert ensure"
  fi
fi

# If infra ran earlier and provided EC2_IP, enforce controller and ensure HTTPS now
if [[ -n "${POST_ENFORCE_HOST:-}" ]]; then
  enforce_single_controller "${POST_ENFORCE_HOST}"
  
  # Deploy nginx configuration
  ensure_blue_ip || warn "Could not determine BLUE_INSTANCE_IP; proceeding without substitution"
  log "Syncing nginx configuration to $POST_ENFORCE_HOST"
  if ! sync_nginx_config "ec2-user@$POST_ENFORCE_HOST" "${BLUE_INSTANCE_IP:-}"; then
    die "Nginx config sync failed (host $POST_ENFORCE_HOST). Check SSH connectivity and try again."
  fi
  ensure_https_certs "${POST_ENFORCE_HOST}" "${ACME_EMAIL:-}"
  POST_HTTP_VERIFY_HOST="${POST_ENFORCE_HOST}"
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

# Promotion health gate (production only). Ensures backend/container readiness & HTTP success before EIP handover.
gate_promotion_health() {
  local host="$1"; local attempts=${HEALTH_RETRY_ATTEMPTS:-6}; local delay=${HEALTH_RETRY_DELAY:-5}
  [[ -n "$host" ]] || die "Promotion gate: host required"
  log "Running promotion health gate on $host (attempts=$attempts delay=${delay}s)"
  local be_name="bb-portfolio-backend-prod" fe_name="bb-portfolio-frontend-prod"
  local tries=0 be_status="" fe_status="" be_ready=false fe_ready=false
  while [ $tries -lt $attempts ]; do
    be_status=$(ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "${REMOTE_USER}"@"$host" "docker ps --filter name=$be_name --format '{{.Status}}'" || true)
    fe_status=$(ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "${REMOTE_USER}"@"$host" "docker ps --filter name=$fe_name --format '{{.Status}}'" || true)
    [[ $be_status =~ healthy ]] && be_ready=true || true
    [[ $fe_status =~ ^Up ]] && fe_ready=true || true
    if [[ $be_ready == true && $fe_ready == true ]]; then
      ok "Containers healthy pre-promotion (backend='$be_status' frontend='$fe_status')"
      break
    fi
    tries=$((tries+1))
    warn "Pre-promotion not ready attempt $tries/$attempts (backend='$be_status' frontend='$fe_status')"
    sleep "$delay"
  done
  if [[ $be_ready != true ]]; then die "Promotion gate failed: backend container not healthy"; fi
  # HTTP endpoint checks with retry (simplified)
  local http_retry
  http_retry() {
    local url="$1"; local label="$2"; local i=0 code
    while [ $i -lt $attempts ]; do
      code=$(ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "${REMOTE_USER}"@"$host" "curl -s -o /dev/null -w '%{http_code}' -L '$url'" || echo 000)
      if [[ $code == 2* || $code == 3* ]]; then ok "$label responded $code (attempt $((i+1)))"; return 0; fi
      i=$((i+1))
      if [[ $code == 000 && $i -lt $attempts ]]; then warn "Transient 000 $label (attempt $i/$attempts)"; sleep "$delay"; continue; fi
      warn "$label code=$code attempt $i/$attempts"; sleep "$delay"
    done
    die "Promotion gate failed: $label unhealthy (last code=$code)"
  }
  http_retry "http://localhost:3001/api/health" "backend prod health"
  http_retry "http://localhost:3000/" "frontend prod"
  ok "Promotion health gate passed"
}

# Decide how to dispatch based on --profiles
case "$profiles" in
  prod)
    # Prefer main for prod, fallback to current branch
    if dispatch_redeploy prod main "$BRANCH"; then
      ok "Prod redeploy dispatched via GitHub Actions. Candidate IP: ${CANDIDATE_IP:-unknown}"
      # If promotion was requested (implied by --auto-promote), run handover now (GA logs not watched here).
      if [[ "$promote" == true ]]; then
        log "Running promotion health gate before handover (prod profile)"
        gate_promotion_health "$CANDIDATE_IP"
        HANDOVER_SCRIPT="${REPO_ROOT}/scripts/orchestrator-promote.sh"
        # Capture current active IP before handover (may be empty in null-green scenario)
        PRE_ACTIVE_IP=$(discover_instance_public_ip_by_role active | head -n1 || echo "")
        if [[ -f "$HANDOVER_SCRIPT" ]]; then
          log "Initiating Elastic IP handover (--promote)"
          set +e
          HANDOVER_CMD=("$HANDOVER_SCRIPT" --region us-west-2)
          [[ "$auto_approve_handover" == true ]] && HANDOVER_CMD+=(--auto-promote) || true
          [[ "$handover_rollback" == true ]] && HANDOVER_CMD+=(--rollback-on-fail) || true
          [[ "$handover_snapshot" == true ]] && HANDOVER_CMD+=(--snapshot-before) || true
          HANDOVER_CMD+=(--max-retries 10 --interval 6)
          echo "Running: ${HANDOVER_CMD[*]}"
          "${HANDOVER_CMD[@]}"
          HS=$?
          set -e
          if [[ $HS -ne 0 ]]; then
            err "Elastic IP handover failed (exit $HS)."
            if [[ "$handover_rollback" == true ]]; then
              warn "Rollback attempted or performed by handover script; continuing."
            else
              die "Promotion aborted; not proceeding to pruning."
            fi
          else
            ACTIVE_AFTER=$(discover_instance_public_ip_by_role active | head -n1 || echo "")
            [[ -z "$PRE_ACTIVE_IP" ]] && PRE_ACTIVE_IP="none (null-green activation)" || true
            if [[ -n "$ACTIVE_AFTER" ]]; then
              ok "Elastic IP handover completed successfully (previous: $PRE_ACTIVE_IP, new: $ACTIVE_AFTER)."
              # Post-handover reachability check; set flag for pruning safety
              if verify_http80 "$ACTIVE_AFTER"; then
                PROMOTION_POST_HTTP_HEALTH=true
              else
                PROMOTION_POST_HTTP_HEALTH=false
                err "Post-handover active IP $ACTIVE_AFTER unreachable on :80 (previous: $PRE_ACTIVE_IP). Previous active instance will be retained (skip pruning)."
              fi
            else
              ok "Elastic IP handover completed successfully (active IP: unknown)."
              err "Could not resolve new active IP after handover (previous: $PRE_ACTIVE_IP)."
              PROMOTION_POST_HTTP_HEALTH=false
            fi
          fi
        else
          warn "orchestrator-promote.sh not found at $HANDOVER_SCRIPT; cannot promote."
        fi
      fi
      popd >/dev/null; exit 0
    fi
    ;;
  dev)
    # Prefer current branch for dev, fallback to 'dev' then main
    if dispatch_redeploy dev "$BRANCH" dev main; then
      ok "Dev redeploy dispatched via GitHub Actions. Candidate IP: ${CANDIDATE_IP:-unknown}"
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
        ok "Prod and Dev redeploys dispatched via GitHub Actions. Candidate IP: ${CANDIDATE_IP:-unknown}"
      elif [[ "$PROD_OK" == true ]]; then
        warn "Prod redeploy dispatched, but dev dispatch failed. You can re-run dev via: gh workflow run redeploy.yml -f environment=dev --ref ${BRANCH}"
      else
        warn "Dev redeploy dispatched, but prod dispatch failed. You can re-run prod via: gh workflow run redeploy.yml -f environment=prod --ref main"
      fi
      # If promotion was requested (implied by --auto-promote), run handover now after dispatch
      if [[ "$promote" == true ]]; then
        log "Running promotion health gate before handover (both profiles)"
        gate_promotion_health "$CANDIDATE_IP"
        HANDOVER_SCRIPT="${REPO_ROOT}/scripts/orchestrator-promote.sh"
        PRE_ACTIVE_IP=$(discover_instance_public_ip_by_role active | head -n1 || echo "")
        if [[ -f "$HANDOVER_SCRIPT" ]]; then
          log "Initiating Elastic IP handover (--promote)"
          set +e
          HANDOVER_CMD=("$HANDOVER_SCRIPT" --region us-west-2)
          [[ "$auto_approve_handover" == true ]] && HANDOVER_CMD+=(--auto-promote) || true
          [[ "$handover_rollback" == true ]] && HANDOVER_CMD+=(--rollback-on-fail) || true
          [[ "$handover_snapshot" == true ]] && HANDOVER_CMD+=(--snapshot-before) || true
          HANDOVER_CMD+=(--max-retries 10 --interval 6)
          echo "Running: ${HANDOVER_CMD[*]}"
          "${HANDOVER_CMD[@]}"
          HS=$?
          set -e
          if [[ $HS -ne 0 ]]; then
            err "Elastic IP handover failed (exit $HS)."
            if [[ "$handover_rollback" == true ]]; then
              warn "Rollback attempted or performed by handover script; continuing."
            else
              die "Promotion aborted; not proceeding to pruning."
            fi
          else
            ACTIVE_AFTER=$(discover_instance_public_ip_by_role active | head -n1 || echo "")
            [[ -z "$PRE_ACTIVE_IP" ]] && PRE_ACTIVE_IP="none (null-green activation)" || true
            if [[ -n "$ACTIVE_AFTER" ]]; then
              ok "Elastic IP handover completed successfully (previous: $PRE_ACTIVE_IP, new: $ACTIVE_AFTER)."
              if verify_http80 "$ACTIVE_AFTER"; then
                PROMOTION_POST_HTTP_HEALTH=true
              else
                PROMOTION_POST_HTTP_HEALTH=false
                err "Post-handover active IP $ACTIVE_AFTER unreachable on :80 (previous: $PRE_ACTIVE_IP). Previous active instance will be retained (skip pruning)."
              fi
            else
              ok "Elastic IP handover completed successfully (active IP: unknown)."
              err "Could not resolve new active IP after handover (previous: $PRE_ACTIVE_IP)."
              PROMOTION_POST_HTTP_HEALTH=false
            fi
          fi
        else
          warn "orchestrator-promote.sh not found at $HANDOVER_SCRIPT; cannot promote."
        fi
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
# Always deploy to candidate (blue) instance
EC2_HOST="${CANDIDATE_IP}"
if [[ -n "$EC2_HOST" ]]; then
  log "Deploying to blue candidate instance: $EC2_HOST"
else
  die "Candidate (blue) instance IP unknown"
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
  ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "${REMOTE_USER}"@"$EC2_HOST" "mkdir -p ${REMOTE_REPO}/backend ${REMOTE_REPO}/frontend"
  scp -i "$SSH_KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$TMP_DIR/backend.env.prod"  "${REMOTE_USER}"@"$EC2_HOST":"${REMOTE_REPO}/backend/.env.prod"
  scp -i "$SSH_KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$TMP_DIR/backend.env.dev"   "${REMOTE_USER}"@"$EC2_HOST":"${REMOTE_REPO}/backend/.env.dev"
  scp -i "$SSH_KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$TMP_DIR/frontend.env.prod" "${REMOTE_USER}"@"$EC2_HOST":"${REMOTE_REPO}/frontend/.env.prod"
  scp -i "$SSH_KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$TMP_DIR/frontend.env.dev"  "${REMOTE_USER}"@"$EC2_HOST":"${REMOTE_REPO}/frontend/.env.dev"
fi

log "Logging into ECR and restarting compose profiles via SSH"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "${REMOTE_USER}"@"$EC2_HOST" "aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin 778230822028.dkr.ecr.us-west-2.amazonaws.com >/dev/null 2>&1 || true"
ssh -i "$SSH_KEY" -tt -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "${REMOTE_USER}"@"$EC2_HOST" bash -lc $'set -e
cd "'"${REMOTE_REPO}"'"
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

# Poll container health before proceeding with summary/HTTP verification (SSH fallback path)
poll_containers_health() {
  local env="$1"; local attempts=${HEALTH_RETRY_ATTEMPTS:-6}; local delay=${HEALTH_RETRY_DELAY:-5}; local tries=0
  local be_name fe_name
  case "$env" in
    prod) be_name="bb-portfolio-backend-prod"; fe_name="bb-portfolio-frontend-prod";;
    dev)  be_name="bb-portfolio-backend-dev";  fe_name="bb-portfolio-frontend-dev";;
  esac
  log "Polling container health ($env) attempts=$attempts delay=${delay}s"
  local be_status fe_status
  while [ $tries -lt $attempts ]; do
    be_status=$(ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "${REMOTE_USER}"@"$EC2_HOST" "docker ps --filter name=$be_name --format '{{.Status}}'" || true)
    fe_status=$(ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "${REMOTE_USER}"@"$EC2_HOST" "docker ps --filter name=$fe_name --format '{{.Status}}'" || true)
    be_ready=false; fe_ready=false
    if echo "$be_status" | grep -qi 'healthy'; then be_ready=true; fi
    if echo "$fe_status" | grep -qi '^Up '; then fe_ready=true; fi
    if [[ "$be_ready" == true && "$fe_ready" == true ]]; then
      ok "Containers healthy ($env) backend='$be_status' frontend='$fe_status'"
      return 0
    fi
    tries=$((tries+1))
    warn "Not ready yet ($env) attempt $tries/$attempts (backend='$be_status' frontend='$fe_status')"
    sleep "$delay"
  done
  warn "Containers not healthy after $attempts attempts ($env) (backend='$be_status' frontend='$fe_status')"
  return 1
}

# Poll for each profile requested
case "$profiles" in
  prod) poll_containers_health prod || true ;;
  dev)  poll_containers_health dev  || true ;;
  both) poll_containers_health prod || true; poll_containers_health dev || true ;;
esac

# Optional promotion (Elastic IP handover blue → green)
if [[ "$promote" == true ]]; then
  HANDOVER_SCRIPT="${REPO_ROOT}/scripts/orchestrator-promote.sh"
    if [[ -f "$HANDOVER_SCRIPT" ]]; then
      PRE_ACTIVE_IP=$(discover_instance_public_ip_by_role active | head -n1 || echo "")
      log "Running promotion health gate before handover (SSH fallback)"
      gate_promotion_health "$EC2_HOST"
      log "Initiating Elastic IP handover (--promote)"
      set +e
      HANDOVER_CMD=("$HANDOVER_SCRIPT" --region us-west-2)
      [[ "$auto_approve_handover" == true ]] && HANDOVER_CMD+=(--auto-promote) || true
      [[ "$handover_rollback" == true ]] && HANDOVER_CMD+=(--rollback-on-fail) || true
      [[ "$handover_snapshot" == true ]] && HANDOVER_CMD+=(--snapshot-before) || true
      HANDOVER_CMD+=(--max-retries 10 --interval 6)
      echo "Running: ${HANDOVER_CMD[*]}"
      "${HANDOVER_CMD[@]}"
      HS=$?
      set -e
      if [[ $HS -ne 0 ]]; then
        err "Elastic IP handover failed (exit $HS)."
        if [[ "$handover_rollback" == true ]]; then
          warn "Rollback attempted or performed by handover script; continuing." 
        else
          die "Promotion aborted; not proceeding to pruning."
        fi
      else
        ACTIVE_AFTER=$(discover_instance_public_ip_by_role active | head -n1 || echo "")
        [[ -z "$PRE_ACTIVE_IP" ]] && PRE_ACTIVE_IP="none (null-green activation)" || true
        if [[ -n "$ACTIVE_AFTER" ]]; then
          ok "Elastic IP handover completed successfully (previous: $PRE_ACTIVE_IP, new: $ACTIVE_AFTER)."
          if verify_http80 "$ACTIVE_AFTER"; then
            PROMOTION_POST_HTTP_HEALTH=true
          else
            PROMOTION_POST_HTTP_HEALTH=false
            err "Post-handover active IP $ACTIVE_AFTER unreachable on :80 (previous: $PRE_ACTIVE_IP). Previous active instance will be retained (skip pruning)."
          fi
        else
          ok "Elastic IP handover completed successfully (active IP: unknown)."
          err "Could not resolve new active IP after handover (previous: $PRE_ACTIVE_IP)."
          PROMOTION_POST_HTTP_HEALTH=false
        fi
      fi
    else
      warn "orchestrator-promote.sh not found at $HANDOVER_SCRIPT; cannot promote."
    fi
fi

# Retention pruning block (after optional promotion)
if [[ "$prune_after_promotion" == true ]]; then
  if [[ "${PROMOTION_POST_HTTP_HEALTH:-true}" == true ]]; then
    log "Retention pruning requested (--prune-after-promotion) and post-handover health OK. Invoking instance-retention.sh"
    RETENTION_SCRIPT="${REPO_ROOT}/scripts/instance-retention.sh"
    if [[ -f "$RETENTION_SCRIPT" ]]; then
      set +e
      if [[ -n "$retention_days" ]]; then
        "$RETENTION_SCRIPT" --retain-count "$retention_count" --retain-days "$retention_days" --force || warn "Retention script encountered errors"
      else
        "$RETENTION_SCRIPT" --retain-count "$retention_count" --force || warn "Retention script encountered errors"
      fi
      set -e
    else
      warn "Retention script not found at $RETENTION_SCRIPT; skipping prune"
    fi
  else
    warn "Skipping retention pruning: post-handover active IP failed health. Previous active instance retained for investigation."
  fi
fi
# Friendly summary with safe fallbacks
ACTIVE_IP="${GREEN_INSTANCE_IP:-}"
if [[ -z "$ACTIVE_IP" ]]; then
  ACTIVE_IP=$(discover_instance_public_ip_by_role active | head -n1 || true)
fi
ok "Blue candidate deployment completed. Test at $CANDIDATE_IP (http://$CANDIDATE_IP) then run with --promote to make it live at ${ACTIVE_IP:-the active address}."

# Deferred HTTP:80 verification (after workflows & potential container start)
if [[ -n "${POST_HTTP_VERIFY_HOST:-}" ]]; then
  log "Verifying HTTP :80 after container workflow dispatch (host=${POST_HTTP_VERIFY_HOST})"
  if ! verify_http80 "${POST_HTTP_VERIFY_HOST}"; then
    warn "HTTP :80 still not healthy (host=${POST_HTTP_VERIFY_HOST}). Containers may still be starting or upstream config invalid."
    warn "You can tail logs or rerun verification later."
  else
    ok "HTTP :80 healthy on ${POST_HTTP_VERIFY_HOST} after deployment."
  fi
fi


popd >/dev/null
