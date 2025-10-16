#!/bin/bash

# Trigger and watch the GitHub Actions Redeploy workflow without making a commit.
#
# Prereqs:
# - gh CLI installed and authenticated: gh auth login
# - Repo permissions to run workflows
# - GitHub Secrets configured (see .github/workflows/redeploy.yml)
#
# Usage examples:
#   scripts/iac/gh-redeploy.sh                # default: environment=both start_dev=true
#   scripts/iac/gh-redeploy.sh prod           # prod only
#   scripts/iac/gh-redeploy.sh dev false      # dev only, do not force start dev (no-op)
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
WORKFLOW_NAME="Redeploy"

ENVIRONMENT="${1:-both}"      # prod|dev|both
START_DEV="${2:-true}"        # true|false

case "$ENVIRONMENT" in
  prod|dev|both) ;;
  *) echo "Invalid environment: $ENVIRONMENT (use prod|dev|both)" >&2; exit 1 ;;
esac

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI is required. Install from https://cli.github.com/" >&2
  exit 1
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required. Install with 'brew install jq' on macOS." >&2
  exit 1
fi

pushd "$REPO_ROOT" >/dev/null

BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "▶️  Triggering GitHub Actions workflow '$WORKFLOW_NAME' on branch $BRANCH with environment=$ENVIRONMENT start_dev=$START_DEV"
gh workflow run "$WORKFLOW_NAME" \
  --ref "$BRANCH" \
  -f environment="$ENVIRONMENT" \
  -f start_dev="$START_DEV"

sleep 3
RUN_ID=$(gh run list --workflow "$WORKFLOW_NAME" --branch "$BRANCH" --limit 1 --json databaseId,status | jq -r '.[0].databaseId // empty')
if [[ -z "$RUN_ID" ]]; then
  echo "Failed to detect triggered run. Verify workflow name and branch." >&2
  exit 1
fi

echo "⏳ Watching run $RUN_ID ..."
gh run watch "$RUN_ID"

echo "📄 Workflow logs:"
gh run view "$RUN_ID" --log

popd >/dev/null
echo "✅ Done."
