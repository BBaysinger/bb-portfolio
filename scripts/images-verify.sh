#!/usr/bin/env bash
set -euo pipefail

# Verifies image/tag counts for Docker Hub and ECR
# - Docker Hub: lists total tags and top 5 by last_updated per repo
# - ECR: prints count of tagged images per repo

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SECRETS_FILE="$ROOT_DIR/.github-secrets.private.json5"

# Defaults
DH_REPOS=("bhbaysinger/bb-portfolio-backend" "bhbaysinger/bb-portfolio-frontend")
ECR_REPOS=("bb-portfolio-backend-prod" "bb-portfolio-frontend-prod")
AWS_REGION="us-west-2"
AWS_PROFILE_ARG="" # optional, derive from --profile or env
SKIP_ECR=false
AUTO_LOGIN=false

print_help() {
  cat <<EOF
Usage: $(basename "$0") [--profile <name>] [--region <region>] [--skip-ecr] [--login] [--help]

Verifies image/tag counts for Docker Hub and ECR.

Options:
  --profile <name>   Use the specified AWS profile (also honors AWS_PROFILE env)
  --region <region>  AWS region to use for ECR (default: ${AWS_REGION})
  --skip-ecr         Skip ECR checks (Docker Hub only)
  --login            Attempt to log in to AWS SSO (if needed) and Docker/ECR automatically
  --help             Show this help and exit

Notes:
  - --login will run 'aws sso login' for the selected profile when STS is not authenticated,
    which may open your browser. It then performs a Docker login to ECR for the account/region.
  - Default behavior does not auto-login; ECR is skipped gracefully if not authenticated.
EOF
}

# Args: --profile <name> | --region <region> | --skip-ecr | --login | --help
while [[ ${1:-} ]]; do
  case "${1}" in
    --profile)
      [[ $# -lt 2 ]] && { echo "--profile requires a value" >&2; exit 1; }
      AWS_PROFILE_ARG="$2"; shift 2 ;;
    --region)
      [[ $# -lt 2 ]] && { echo "--region requires a value" >&2; exit 1; }
      AWS_REGION="$2"; shift 2 ;;
    --skip-ecr)
      SKIP_ECR=true; shift ;;
    --login|--auto-login)
      AUTO_LOGIN=true; shift ;;
    --help|-h)
      print_help; exit 0 ;;
    *)
      echo "Unknown argument: $1" >&2; echo; print_help; exit 1 ;;
  esac
done

# Respect profile from flag if provided
if [[ -n "${AWS_PROFILE_ARG}" ]]; then
  export AWS_PROFILE="${AWS_PROFILE_ARG}"
fi

have_node() { command -v node >/dev/null 2>&1; }
have_curl() { command -v curl >/dev/null 2>&1; }
have_aws()  { command -v aws  >/dev/null 2>&1; }
have_docker() { command -v docker >/dev/null 2>&1; }

ensure_aws_login() {
  # Attempts AWS SSO login (if needed) and ECR Docker login. Never exits the script.
  # Returns 0 if authenticated to STS after attempts (Docker login may still fail) else 1.
  local ok=1
  local profile_msg="${AWS_PROFILE:-default}"

  # Already authenticated?
  if aws sts get-caller-identity --region "$AWS_REGION" >/dev/null 2>&1; then
    echo "(auth) AWS already authenticated for profile: ${profile_msg}"
    ok=0
  else
    echo "(auth) AWS not authenticated. Attempting 'aws sso login' for profile: ${profile_msg}"
    if [[ -n "${AWS_PROFILE:-}" ]]; then
      if aws sso login --profile "$AWS_PROFILE"; then ok=0; else ok=1; fi
    else
      # Try default profile (may still be configured for SSO)
      if aws sso login; then ok=0; else ok=1; fi
    fi

    # Re-check after SSO
    if [[ $ok -ne 0 ]] || ! aws sts get-caller-identity --region "$AWS_REGION" >/dev/null 2>&1; then
      echo "(warn) Unable to authenticate with AWS STS after SSO attempt; ECR will be skipped."
      return 1
    fi
  fi

  # If we have STS creds now, attempt Docker login to ECR registry
  if have_docker; then
    local account
    account=$(aws sts get-caller-identity --query Account --output text --region "$AWS_REGION" 2>/dev/null || true)
    if [[ -n "$account" ]]; then
      local registry="${account}.dkr.ecr.${AWS_REGION}.amazonaws.com"
      echo "(auth) Logging Docker into ECR: ${registry}"
      if aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$registry" >/dev/null 2>&1; then
        echo "(auth) Docker login to ECR succeeded"
      else
        echo "(warn) Docker login to ECR failed; continuing"
      fi
    else
      echo "(warn) Could not resolve AWS account ID for ECR login"
    fi
  else
    echo "(skip) Docker CLI not available; skipping ECR docker login"
  fi

  return 0
}

read_secret() {
  local key="$1"
  [[ ! -f "$SECRETS_FILE" ]] && return 0
  have_node || return 0
  node -e "const fs=require('fs');const JSON5=require('json5');const o=JSON5.parse(fs.readFileSync(process.argv[1],'utf8'));const p=process.argv[2].split('.');let v=o;for(const k of p){v=v?.[k]}console.info(v??'')" "$SECRETS_FILE" "$key"
}

echo "🔍 Verifying images (Docker Hub + ECR)"

# Docker Hub
if have_curl && have_node; then
  DH_USER="${DOCKERHUB_USERNAME:-$(read_secret strings.DOCKER_HUB_USERNAME)}"
  DH_PASS="${DOCKERHUB_PASSWORD:-$(read_secret strings.DOCKER_HUB_PASSWORD)}"
  DH_TOKEN="${DOCKERHUB_TOKEN:-}"
  if [[ -z "$DH_TOKEN" && -n "$DH_USER" && -n "$DH_PASS" ]]; then
    DH_TOKEN=$(curl -sS -X POST https://hub.docker.com/v2/users/login/ -H 'Content-Type: application/json' -d "{\"username\":\"$DH_USER\",\"password\":\"$DH_PASS\"}" | node -e "const fs=require('fs');const o=JSON.parse(fs.readFileSync(0,'utf8'));console.info(o.token||'')") || true
  fi
  for repo in "${DH_REPOS[@]}"; do
    echo -e "\n🧾 Docker Hub: $repo (top 5 by last_updated)"
    if [[ -n "$DH_TOKEN" ]]; then
      curl -sS -H "Authorization: JWT $DH_TOKEN" "https://hub.docker.com/v2/repositories/${repo}/tags?page_size=100" | \
        node -e "const fs=require('fs');const o=JSON.parse(fs.readFileSync(0,'utf8'));const rows=(o.results||[]).map(r=>[r.last_updated,r.name]);rows.sort((a,b)=>a[0]<b[0]?1:-1);for(const [ts,name] of rows.slice(0,5)){console.info(ts+'\t'+name)};console.info('TOTAL:',rows.length)"
    else
      # Attempt unauthenticated listing for public repositories
      curl -sS "https://hub.docker.com/v2/repositories/${repo}/tags?page_size=100" | \
        node -e "const fs=require('fs');const o=JSON.parse(fs.readFileSync(0,'utf8'));const rows=(o.results||[]).map(r=>[r.last_updated,r.name]);rows.sort((a,b)=>a[0]<b[0]?1:-1);for(const [ts,name] of rows.slice(0,5)){console.info(ts+'\t'+name)};console.info('TOTAL:',rows.length)"
    fi
  done
else
  echo "(skip) Docker Hub verification: curl/node not available"
fi

# ECR
if [[ "${SKIP_ECR}" == "true" ]]; then
  echo "(skip) ECR verification: --skip-ecr provided"
elif have_aws; then
  if [[ "${AUTO_LOGIN}" == "true" ]]; then
    ensure_aws_login || true
  fi
  # Credential sanity check: skip ECR gracefully if not logged in/configured
  if aws sts get-caller-identity --region "$AWS_REGION" >/dev/null 2>&1; then
    PROFILE_MSG="${AWS_PROFILE:-default}"
    echo -e "\nUsing AWS profile: ${PROFILE_MSG} | region: ${AWS_REGION}"
    for repo in "${ECR_REPOS[@]}"; do
      echo -e "\n🧾 ECR: $repo"
      if ! aws ecr describe-images --repository-name "$repo" --region "$AWS_REGION" --query "length(imageDetails[?imageTags!=\`null\`])"; then
        echo "  (error) unable to query repository (verify permissions for profile '${PROFILE_MSG}')"
      fi
    done
  else
    echo "(skip) ECR verification: AWS credentials/profile not configured (set AWS_PROFILE, use --profile, pass --login, or run 'aws sso login')"
  fi
else
  echo "(skip) ECR verification: aws CLI not available"
fi

echo -e "\n✅ Verification complete"
