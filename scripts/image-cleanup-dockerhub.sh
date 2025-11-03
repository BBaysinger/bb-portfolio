#!/usr/bin/env bash
# Docker Hub image cleanup utility (provider-specific)
#
# Prunes older tags in one or more Docker Hub repositories, keeping the most recent N tags by last_updated.
# Docker Hub does not have the concept of UNTAGGED images, so --include-untagged is ignored.
#
# Requirements:
# - curl, bash, coreutils, node (for lightweight JSON parsing)
# - Docker Hub credentials via environment variables:
#     DOCKERHUB_USERNAME and DOCKERHUB_PASSWORD, or DOCKERHUB_TOKEN (JWT)
#
# Usage examples:
#   ./scripts/image-cleanup-dockerhub.sh --retain 5
#   ./scripts/image-cleanup-dockerhub.sh --retain 10 --repositories bhbaysinger/bb-portfolio-backend,bhbaysinger/bb-portfolio-frontend
#   ./scripts/image-cleanup-dockerhub.sh --retain 5 --dry-run
set -euo pipefail

RETAIN_COUNT=5
# region/profile/login are accepted for interface parity but ignored
REGION=""
PROFILE=""
AUTO_LOGIN=false
REPOS_CSV="bhbaysinger/bb-portfolio-backend,bhbaysinger/bb-portfolio-frontend"
INCLUDE_UNTAGGED=false
DRY_RUN=false

usage() {
  cat <<USAGE
Docker Hub image cleanup utility

Options:
  --retain <N>            Number of most recent tags to retain per repository (default: 5)
  --repositories <csv>    Comma-separated Docker Hub repositories (e.g. namespace/repo,namespace/repo)
                          (default: ${REPOS_CSV})
  --region <region>       Ignored (for interface parity only)
  --profile <name>        Ignored (for interface parity only)
  --include-untagged      Ignored (Docker Hub has no UNTAGGED images)
  --dry-run               Show what would be deleted without deleting
  --help, -h              Show this help message

Environment:
  DOCKERHUB_USERNAME and DOCKERHUB_PASSWORD, or DOCKERHUB_TOKEN (JWT)

Examples:
  ./scripts/image-cleanup-dockerhub.sh --retain 5
  ./scripts/image-cleanup-dockerhub.sh --retain 10 --repositories bhbaysinger/bb-portfolio-backend,bhbaysinger/bb-portfolio-frontend
  ./scripts/image-cleanup-dockerhub.sh --retain 5 --dry-run
USAGE
}

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --retain)
      RETAIN_COUNT=${2:-}; shift 2 ;;
    --repositories)
      REPOS_CSV=${2:-}; shift 2 ;;
    --region)
      REGION=${2:-}; shift 2 ;;
    --profile)
      PROFILE=${2:-}; shift 2 ;;
    --login|--auto-login)
      AUTO_LOGIN=true; shift ;;
    --include-untagged)
      INCLUDE_UNTAGGED=true; shift ;;
    --dry-run)
      DRY_RUN=true; shift ;;
    --help|-h)
      usage; exit 0 ;;
    *)
      echo "Unknown argument: $1" >&2
      usage; exit 1 ;;
  esac
done

# Validate retain count is integer >= 0
if ! [[ "$RETAIN_COUNT" =~ ^[0-9]+$ ]]; then
  echo "--retain must be a non-negative integer" >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required" >&2
  exit 1
fi
if ! command -v node >/dev/null 2>&1; then
  echo "node is required for JSON parsing" >&2
  exit 1
fi

DOCKERHUB_USERNAME="${DOCKERHUB_USERNAME:-}"
DOCKERHUB_PASSWORD="${DOCKERHUB_PASSWORD:-}"
DOCKERHUB_TOKEN="${DOCKERHUB_TOKEN:-}"

# If no credentials provided via env, try to read from .github-secrets.private.json5
if [[ -z "$DOCKERHUB_TOKEN" && ( -z "$DOCKERHUB_USERNAME" || -z "$DOCKERHUB_PASSWORD" ) ]]; then
  ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
  SECRETS_FILE="$ROOT_DIR/.github-secrets.private.json5"
  if [[ -f "$SECRETS_FILE" ]]; then
    if command -v node >/dev/null 2>&1; then
      DOCKERHUB_USERNAME=$(node -e "const fs=require('fs');const JSON5=require('json5');const o=JSON5.parse(fs.readFileSync(process.argv[1],'utf8'));console.log(o?.strings?.DOCKER_HUB_USERNAME||'')" "$SECRETS_FILE")
      DOCKERHUB_PASSWORD=$(node -e "const fs=require('fs');const JSON5=require('json5');const o=JSON5.parse(fs.readFileSync(process.argv[1],'utf8'));console.log(o?.strings?.DOCKER_HUB_PASSWORD||'')" "$SECRETS_FILE")
    fi
  fi
fi

# Obtain JWT token if not provided
if [[ -z "$DOCKERHUB_TOKEN" ]]; then
  if [[ -z "$DOCKERHUB_USERNAME" || -z "$DOCKERHUB_PASSWORD" ]]; then
    echo "Provide DOCKERHUB_TOKEN, or DOCKERHUB_USERNAME and DOCKERHUB_PASSWORD (env or .github-secrets.private.json5)" >&2
    exit 1
  fi
  echo "🔐 Logging into Docker Hub to obtain token..."
  # Using v2 API login endpoint
  login_resp=$(curl -sS -X POST https://hub.docker.com/v2/users/login/ \
    -H 'Content-Type: application/json' \
    -d "{\"username\":\"$DOCKERHUB_USERNAME\",\"password\":\"$DOCKERHUB_PASSWORD\"}")
  DOCKERHUB_TOKEN=$(printf "%s" "$login_resp" | node -e "const fs=require('fs'); const o=JSON.parse(fs.readFileSync(0,'utf8')); console.log(o.token||'')")
  if [[ -z "$DOCKERHUB_TOKEN" ]]; then
    echo "Failed to obtain Docker Hub token" >&2
    exit 1
  fi
fi

AUTH_HEADER=("-H" "Authorization: JWT $DOCKERHUB_TOKEN")

IFS=',' read -r -a REPOS <<<"$REPOS_CSV"

echo "🔧 Docker Hub cleanup starting"
echo "Repositories: ${REPOS[*]}"
echo "Retain      : $RETAIN_COUNT tags per repo"
$INCLUDE_UNTAGGED && echo "Include     : UNTAGGED requested (ignored on Docker Hub)" || true
$DRY_RUN && echo "Mode        : DRY RUN (no deletions)" || echo "Mode        : APPLY (deletions will be executed)"

# Fetch all tags (name and last_updated) for a repo
fetch_tags() {
  local repo="$1"
  local url="https://hub.docker.com/v2/repositories/${repo}/tags?page_size=100"
  local tmp
  tmp=$(mktemp)
  while [[ -n "$url" ]]; do
    if ! curl -sfS "${AUTH_HEADER[@]}" -o "$tmp" "$url"; then
      echo "  ⚠️  Failed to list tags for $repo" >&2
      rm -f "$tmp"
      return 1
    fi
    # Print lines: last_updated\tname
    node -e "const fs=require('fs'); const o=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); for (const t of (o.results||[])) { console.log((t.last_updated||'')+'\t'+t.name) }" "$tmp"
    # next page
    url=$(node -e "const fs=require('fs'); const o=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); console.log(o.next||'')" "$tmp")
  done
  rm -f "$tmp"
}

# Delete a tag
delete_tag() {
  local repo="$1" tag="$2"
  local del_url="https://hub.docker.com/v2/repositories/${repo}/tags/${tag}/"
  if $DRY_RUN; then
    echo "🧪 [dry-run] Would delete tag '$tag' from $repo"
  else
    if curl -sS -X DELETE "${AUTH_HEADER[@]}" -o /dev/null -w "%{http_code}" "$del_url" | grep -qE '204|202'; then
      echo "🗑️  Deleted tag '$tag' from $repo"
    else
      echo "  ⚠️  Failed to delete tag '$tag' from $repo" >&2
    fi
  fi
}

for repo in "${REPOS[@]}"; do
  echo "\n📦 Repository: $repo"
  tag_lines=()
  while IFS= read -r line; do
    tag_lines+=("$line")
  done < <(fetch_tags "$repo" || true)
  total=${#tag_lines[@]}
  echo "  Tags found          : $total"

  if (( total > RETAIN_COUNT )); then
    delete_count=$(( total - RETAIN_COUNT ))
    echo "  Will delete oldest  : $delete_count tag(s)"
    # Sort by last_updated desc (column 1), then emit tag names after retaining top N
    # shellcheck disable=SC2002
    mapfile -t to_delete < <(printf '%s\n' "${tag_lines[@]}" | sort -r | awk -v n="$RETAIN_COUNT" 'NR>n {print $2}')
    for tag in "${to_delete[@]}"; do
      # Basic guard: skip empty or obviously important immutable tags if desired (none skipped by default)
      delete_tag "$repo" "$tag"
    done
  else
    echo "  Nothing to delete among tags (<= retain count)"
  fi

  # Untagged note
  if $INCLUDE_UNTAGGED; then
    echo "  Untagged images     : not applicable on Docker Hub (ignored)"
  fi

  echo "  ✅ Repo complete"
done

echo "\n🎉 Docker Hub cleanup finished"
