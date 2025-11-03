#!/usr/bin/env bash
set -euo pipefail

# Ensures specified Docker Hub repositories are private.
# - Reads credentials from env (DOCKERHUB_TOKEN or DOCKERHUB_USERNAME/DOCKERHUB_PASSWORD)
# - Falls back to .github-secrets.private.json5 (strings.DOCKER_HUB_USERNAME/PASSWORD)
# - Default repos: bhbaysinger/bb-portfolio-backend, bhbaysinger/bb-portfolio-frontend

REPOS_CSV="bhbaysinger/bb-portfolio-backend,bhbaysinger/bb-portfolio-frontend"

usage(){
  cat <<USAGE
Ensure Docker Hub repositories are private

Options:
  --repositories <csv>   Comma-separated list (namespace/name) (default: ${REPOS_CSV})
  --help, -h             Show this help

Examples:
  ./scripts/dockerhub-ensure-private.sh
  ./scripts/dockerhub-ensure-private.sh --repositories ns/app1,ns/app2
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repositories)
      REPOS_CSV=${2:-}; shift 2 ;;
    --help|-h)
      usage; exit 0 ;;
    *)
      echo "Unknown argument: $1" >&2; usage; exit 1 ;;
  esac
done

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SECRETS_FILE="$ROOT_DIR/.github-secrets.private.json5"

have_node(){ command -v node >/dev/null 2>&1; }

read_secret(){
  local key="$1"
  [[ ! -f "$SECRETS_FILE" ]] && return 0
  have_node || return 0
  node -e "const fs=require('fs');const JSON5=require('json5');const o=JSON5.parse(fs.readFileSync(process.argv[1],'utf8'));const p=process.argv[2].split('.');let v=o;for(const k of p){v=v?.[k]}console.log(v??'')" "$SECRETS_FILE" "$key"
}

DOCKERHUB_USERNAME="${DOCKERHUB_USERNAME:-$(read_secret strings.DOCKER_HUB_USERNAME)}"
DOCKERHUB_PASSWORD="${DOCKERHUB_PASSWORD:-$(read_secret strings.DOCKER_HUB_PASSWORD)}"
DOCKERHUB_TOKEN="${DOCKERHUB_TOKEN:-}"

if [[ -z "$DOCKERHUB_TOKEN" ]]; then
  if [[ -z "$DOCKERHUB_USERNAME" || -z "$DOCKERHUB_PASSWORD" ]]; then
    echo "❌ Provide DOCKERHUB_TOKEN or DOCKERHUB_USERNAME/DOCKERHUB_PASSWORD (env or .github-secrets.private.json5)." >&2
    exit 1
  fi
  echo "🔐 Logging into Docker Hub..."
  DOCKERHUB_TOKEN=$(curl -sS -X POST https://hub.docker.com/v2/users/login/ -H 'Content-Type: application/json' \
    -d "{\"username\":\"$DOCKERHUB_USERNAME\",\"password\":\"$DOCKERHUB_PASSWORD\"}")
  DOCKERHUB_TOKEN=$(printf "%s" "$DOCKERHUB_TOKEN" | node -e "const fs=require('fs');const o=JSON.parse(fs.readFileSync(0,'utf8'));console.log(o.token||'')")
  if [[ -z "$DOCKERHUB_TOKEN" ]]; then
    echo "❌ Failed to obtain Docker Hub token" >&2
    exit 1
  fi
fi

IFS=',' read -r -a REPOS <<<"$REPOS_CSV"
AUTH_HEADER=("-H" "Authorization: JWT $DOCKERHUB_TOKEN")

echo "🔧 Ensuring Docker Hub repos are private: ${REPOS[*]}"

for repo in "${REPOS[@]}"; do
  echo -e "\n📦 Repo: $repo"
  body=$(mktemp); code=0
  code=$(curl -sS -o "$body" -w "%{http_code}" "${AUTH_HEADER[@]}" "https://hub.docker.com/v2/repositories/${repo}/" || echo 000)
  if [[ "$code" == "404" ]]; then
    # Create repository as private
    ns="${repo%%/*}"; name="${repo##*/}"
    echo "  ℹ️  Repo not found. Creating $ns/$name as private..."
    create_code=$(curl -sS -o /dev/null -w "%{http_code}" -X POST "${AUTH_HEADER[@]}" -H 'Content-Type: application/json' \
      -d '{"name":"'"$name"'","namespace":"'"$ns"'","is_private":true}' "https://hub.docker.com/v2/repositories/")
    if [[ "$create_code" =~ ^20[01]$ ]]; then
      echo "  ✅ Created private repository"
      rm -f "$body"
      continue
    else
      echo "  ❌ Failed to create repository (HTTP $create_code)." >&2
      rm -f "$body"
      continue
    fi
  elif [[ "$code" =~ ^20[0-9]$ ]]; then
    is_private=$(node -e "const fs=require('fs');const o=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));console.log(o.is_private===true?'true':'false')" "$body" 2>/dev/null || echo "unknown")
    if [[ "$is_private" == "true" ]]; then
      echo "  ✅ Already private"
      rm -f "$body"
      continue
    fi
    echo "  ⏳ Setting private..."
    patch_code=$(curl -sS -o /dev/null -w "%{http_code}" -X PATCH "${AUTH_HEADER[@]}" -H 'Content-Type: application/json' \
      -d '{"is_private": true}' "https://hub.docker.com/v2/repositories/${repo}/")
    if [[ "$patch_code" =~ ^20[04]$ ]]; then
      echo "  ✅ Set to private"
    else
      echo "  ❌ Failed to set private (HTTP $patch_code)." >&2
    fi
    rm -f "$body"
  else
    echo "  ❌ Unexpected response (HTTP $code)." >&2
    rm -f "$body"
  fi
done

echo -e "\n🎉 Done"
