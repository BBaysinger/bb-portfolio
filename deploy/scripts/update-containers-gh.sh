#!/bin/bash
# Build/push and optionally (re)start selected containers via GitHub Actions
# - Does NOT touch Terraform/EC2 instance
# - Uses local build/push (current setup) and hands off restart to GH workflow
#
# Usage examples:
#   deploy/scripts/update-containers-gh.sh --target prod --build prod
#   deploy/scripts/update-containers-gh.sh --target dev --build dev --refresh-env
#   deploy/scripts/update-containers-gh.sh --target both --build both
#   deploy/scripts/update-containers-gh.sh --target none                 # build none, restart none
#
# Flags:
#   --target [prod|dev|both|none]   Which compose profiles to restart (default: both)
#   --build  [prod|dev|both|none]   Which images to build/push locally (default: none)
#   --refresh-env                   Ask GH workflow to regenerate & upload env files
#   --no-watch                      Don't tail GH run output
#   -h|--help                       Show help

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

usage() {
  cat <<USAGE
Build/push and optionally restart containers via GitHub Actions

Options:
  --target [prod|dev|both|none]   Restart which profiles (default: both)
  --build  [prod|dev|both|none]   Build/push which images locally (default: none)
  --refresh-env                   Regenerate & upload env files on EC2 (via GH)
  --no-watch                      Don't watch GH run logs
  -h|--help                       Show this help
USAGE
}

target="both"
build="none"
refresh_env=false
watch_logs=true

while [[ $# -gt 0 ]]; do
  case "$1" in
    --target) target="${2:-}"; shift 2 ;
    --build)  build="${2:-}"; shift 2 ;
    --refresh-env) refresh_env=true; shift ;
    --no-watch) watch_logs=false; shift ;
    -h|--help) usage; exit 0 ;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;
  esac
done

case "$target" in prod|dev|both|none) ; * ) echo "--target must be prod|dev|both|none" >&2; exit 1 ; esac
case "$build"  in prod|dev|both|none) ; * ) echo "--build must be prod|dev|both|none" >&2; exit 1 ; esac

need() { command -v "$1" >/dev/null 2>&1 || { echo "$1 is required" >&2; exit 1; }; }
need gh

# Ensure gh is authenticated and repo is accessible
if ! gh auth status >/dev/null 2>&1; then
  echo "GitHub CLI is not authenticated. Run 'gh auth login' first." >&2
  exit 1
fi
GH_REPO="BBaysinger/bb-portfolio"
if ! gh repo view "$GH_REPO" >/dev/null 2>&1; then
  echo "Cannot access repo $GH_REPO via gh CLI" >&2
  exit 1
fi

pushd "$REPO_ROOT" >/dev/null

# Optional local builds (current pattern)
if [[ "$build" == "prod" || "$build" == "both" ]]; then
  npm run ecr:build-push
fi
if [[ "$build" == "dev" || "$build" == "both" ]]; then
  npm run docker:build-push
fi

restart_containers=true
if [[ "$target" == "none" ]]; then
  restart_containers=false
  # Choose a harmless value; workflow ignores restart when restart_containers=false
  target="both"
fi

# Trigger existing Redeploy workflow by filename to avoid name ambiguity
RUN_JSON=$(gh workflow run redeploy.yml \
  --repo "$GH_REPO" \
  --ref "$(git rev-parse --abbrev-ref HEAD)" \
  -f environment="$target" \
  -f start_dev=true \
  -f refresh_env="$refresh_env" \
  -f restart_containers="$restart_containers" \
  --json run,id)
RUN_ID=$(echo "$RUN_JSON" | jq -r '.id')

if [[ -z "$RUN_ID" || "$RUN_ID" == null ]]; then
  echo "Failed to start GitHub workflow" >&2
  exit 1
fi

if [[ "$watch_logs" == true ]]; then
  gh run watch "$RUN_ID"
  gh run view "$RUN_ID" --log || true
else
  echo "Started workflow run: $RUN_ID"
fi

popd >/dev/null
