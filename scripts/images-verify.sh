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

have_node() { command -v node >/dev/null 2>&1; }
have_curl() { command -v curl >/dev/null 2>&1; }
have_aws()  { command -v aws  >/dev/null 2>&1; }

read_secret() {
  local key="$1"
  [[ ! -f "$SECRETS_FILE" ]] && return 0
  have_node || return 0
  node -e "const fs=require('fs');const JSON5=require('json5');const o=JSON5.parse(fs.readFileSync(process.argv[1],'utf8'));const p=process.argv[2].split('.');let v=o;for(const k of p){v=v?.[k]}console.log(v??'')" "$SECRETS_FILE" "$key"
}

echo "🔍 Verifying images (Docker Hub + ECR)"

# Docker Hub
if have_curl && have_node; then
  DH_USER="${DOCKERHUB_USERNAME:-$(read_secret strings.DOCKER_HUB_USERNAME)}"
  DH_PASS="${DOCKERHUB_PASSWORD:-$(read_secret strings.DOCKER_HUB_PASSWORD)}"
  DH_TOKEN="${DOCKERHUB_TOKEN:-}"
  if [[ -z "$DH_TOKEN" && -n "$DH_USER" && -n "$DH_PASS" ]]; then
    DH_TOKEN=$(curl -sS -X POST https://hub.docker.com/v2/users/login/ -H 'Content-Type: application/json' -d "{\"username\":\"$DH_USER\",\"password\":\"$DH_PASS\"}" | node -e "const fs=require('fs');const o=JSON.parse(fs.readFileSync(0,'utf8'));console.log(o.token||'')") || true
  fi
  if [[ -n "$DH_TOKEN" ]]; then
    for repo in "${DH_REPOS[@]}"; do
      echo -e "\n🧾 Docker Hub: $repo (top 5 by last_updated)"
      curl -sS -H "Authorization: JWT $DH_TOKEN" "https://hub.docker.com/v2/repositories/${repo}/tags?page_size=100" | \
        node -e "const fs=require('fs');const o=JSON.parse(fs.readFileSync(0,'utf8'));const rows=(o.results||[]).map(r=>[r.last_updated,r.name]);rows.sort((a,b)=>a[0]<b[0]?1:-1);for(const [ts,name] of rows.slice(0,5)){console.log(ts+'\t'+name)};console.log('TOTAL:',rows.length)"
    done
  else
    echo "(skip) Docker Hub verification: no credentials/token available"
  fi
else
  echo "(skip) Docker Hub verification: curl/node not available"
fi

# ECR
if have_aws; then
  for repo in "${ECR_REPOS[@]}"; do
    echo -e "\n🧾 ECR: $repo"
    if ! aws ecr describe-images --repository-name "$repo" --region "$AWS_REGION" --query "length(imageDetails[?imageTags!=\`null\`])"; then
      echo "  (error) unable to query repository (check AWS credentials/profile)"
    fi
  done
else
  echo "(skip) ECR verification: aws CLI not available"
fi

echo -e "\n✅ Verification complete"
