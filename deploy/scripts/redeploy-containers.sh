#!/usr/bin/env bash
set -euo pipefail

# redeploy-containers.sh
# Restart containers on EC2 using GitHub Actions (preferred) or SSH fallback.
# Does not touch Terraform or rebuild the EC2 instance.

PROFILES="both"       # prod|dev|both
REFRESH_ENV="false"   # true|false
WORKFLOW_FILE=".github/workflows/redeploy-manual.yml"
AWS_REGION="${AWS_REGION:-us-west-2}"

# Repo root
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

source "$REPO_ROOT/scripts/lib/repo-env.sh"
bb_load_repo_env "$REPO_ROOT"

AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-}"

# Validate required environment variables
if [ -z "$AWS_ACCOUNT_ID" ]; then
    echo "❌ Error: AWS_ACCOUNT_ID environment variable is required"
    echo "   Please set it in .env or .env.local"
    exit 1
fi

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

Options:
  --profiles <prod|dev|both>  Which compose profiles to restart (default: both)
  --refresh-env               Regenerate and upload .env files via GH workflow (default: false)
  --workflow <path|name>      Workflow to dispatch (default: .github/workflows/redeploy-manual.yml)
  --no-color                  Disable ANSI colors in output
  -h, --help                  Show this help
EOF
}

COLOR=true
for arg in "$@"; do [ "$arg" = "--no-color" ] && COLOR=false; done
if $COLOR; then RED='\033[0;31m'; GRN='\033[0;32m'; YEL='\033[0;33m'; BLU='\033[0;34m'; NC='\033[0m'; else RED=''; GRN=''; YEL=''; BLU=''; NC=''; fi
say() { printf "%b\n" "$1"; }
info() { say "${BLU}INFO${NC} $1"; }
ok()   { say "${GRN}OK${NC}   $1"; }
warn() { say "${YEL}WARN${NC} $1"; }
err()  { say "${RED}ERR${NC}  $1"; }

# Parse args
while [ $# -gt 0 ]; do
  case "$1" in
    --profiles) PROFILES="${2:-}"; shift 2;
    --refresh-env) REFRESH_ENV="true"; shift;
    --workflow) WORKFLOW_FILE="${2:-}"; shift 2;
    -h|--help) usage; exit 0;
    --no-color) shift;
    *) err "Unknown argument: $1"; usage; exit 1;;
  esac
done

need_cmd() { command -v "$1" >/dev/null 2>&1 || { err "Missing required command: $1"; exit 1; }; }
need_cmd ssh; need_cmd scp; need_cmd aws; need_cmd docker

SSH_KEY="${HOME}/.ssh/bb-portfolio-site-key.pem"
if [ ! -f "$SSH_KEY" ]; then
  err "SSH key not found at $SSH_KEY"
  exit 1
fi

EC2_HOST="${EC2_HOST:-${EC2_INSTANCE_IP:-${EC2_IP:-}}}"
# Try terraform outputs
if command -v terraform >/dev/null 2>&1 && [ -d "$(cd "$(dirname "$0")/../../infra" && pwd)" ]; then
  pushd "$(cd "$(dirname "$0")/../../infra" && pwd)" >/dev/null
  if [ -z "$EC2_HOST" ] && terraform output -json >/dev/null 2>&1; then EC2_HOST=$(terraform output -raw elastic_ip || true); fi
  popd >/dev/null
fi
# Try GH secret as fallback
if [ -z "$EC2_HOST" ] && command -v gh >/dev/null 2>&1; then
  EC2_HOST=$(gh secret view EC2_HOST -q .value 2>/dev/null || true)
fi
[ -n "$EC2_HOST" ] || { err "EC2 host unknown. Set EC2_INSTANCE_IP in repo-root .env, or ensure terraform outputs / GH secret EC2_HOST is available."; exit 1; }

info "Attempting GitHub Actions dispatch…"
DISPATCHED=false
if command -v gh >/dev/null 2>&1; then
  set +e
  gh workflow run "$WORKFLOW_FILE" -f environment="$PROFILES" -f start_dev=true -f refresh_env="$REFRESH_ENV" -f restart_containers=true
  [ $? -eq 0 ] && DISPATCHED=true
  set -e
fi

if [ "$DISPATCHED" = "true" ]; then
  ok "Dispatch created. Monitor from Actions UI."
  exit 0
fi

warn "GH dispatch failed; using SSH fallback."

# When requested, generate env files locally from private JSON5 and upload to EC2
if [ "$REFRESH_ENV" = "true" ]; then
  if [ ! -f "$REPO_ROOT/.github-secrets.private.json5" ]; then
    err "Cannot refresh env: $REPO_ROOT/.github-secrets.private.json5 missing"
    exit 1
  fi
  info "Generating env files locally from .github-secrets.private.json5"
  TMP_DIR="$(mktemp -d)"
  ( cd "$REPO_ROOT" && npx --yes tsx scripts/generate-env-files.ts --out "$TMP_DIR" )
  info "Uploading env files to EC2"
  ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ec2-user@"$EC2_HOST" "mkdir -p /home/ec2-user/portfolio/backend /home/ec2-user/portfolio/frontend"
  scp -i "$SSH_KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$TMP_DIR/backend.env.prod"  ec2-user@"$EC2_HOST":/home/ec2-user/portfolio/backend/.env.prod
  scp -i "$SSH_KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$TMP_DIR/backend.env.dev"   ec2-user@"$EC2_HOST":/home/ec2-user/portfolio/backend/.env.dev
  scp -i "$SSH_KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$TMP_DIR/frontend.env.prod" ec2-user@"$EC2_HOST":/home/ec2-user/portfolio/frontend/.env.prod
  scp -i "$SSH_KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$TMP_DIR/frontend.env.dev"  ec2-user@"$EC2_HOST":/home/ec2-user/portfolio/frontend/.env.dev
fi
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ec2-user@"$EC2_HOST" "aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com >/dev/null 2>&1 || true"
ssh -i "$SSH_KEY" -tt -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ec2-user@"$EC2_HOST" bash -lc $'set -e
cd /home/ec2-user/portfolio
docker-compose down || true
case '"$PROFILES"' in
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

ok "Containers restarted via SSH."
