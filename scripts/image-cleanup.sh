#!/usr/bin/env bash
# Image cleanup orchestrator
#
# Runs provider-specific cleanup scripts for both Docker Hub and Amazon ECR using a unified interface.
# All flags/parameters are forwarded as-is to each provider script so they share the same contract.
#
# Provider scripts:
#   - scripts/image-cleanup-dockerhub.sh
#   - scripts/image-cleanup-ecr.sh
#
# Usage examples:
#   ./scripts/image-cleanup.sh --retain 5
#   ./scripts/image-cleanup.sh --retain 10 --repositories repo1,repo2 --dry-run
#   ./scripts/image-cleanup.sh --retain 5 --include-untagged
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

DOCKERHUB_SCRIPT="$SCRIPT_DIR/image-cleanup-dockerhub.sh"
ECR_SCRIPT="$SCRIPT_DIR/image-cleanup-ecr.sh"

echo "🧹 Starting image cleanup (Docker Hub + ECR)"

status=0

if [[ -x "$DOCKERHUB_SCRIPT" ]]; then
  echo "\n➡️  Docker Hub cleanup"
  if ! "$DOCKERHUB_SCRIPT" "$@"; then
    echo "Docker Hub cleanup failed" >&2
    status=1
  fi
else
  echo "Skipping Docker Hub cleanup: $DOCKERHUB_SCRIPT not found or not executable"
fi

if [[ -x "$ECR_SCRIPT" ]]; then
  echo "\n➡️  ECR cleanup"
  if ! "$ECR_SCRIPT" "$@"; then
    echo "ECR cleanup failed" >&2
    status=1
  fi
else
  echo "Skipping ECR cleanup: $ECR_SCRIPT not found or not executable"
fi

if [[ $status -eq 0 ]]; then
  echo "\n✅ Image cleanup completed"
else
  echo "\n⚠️  Image cleanup completed with errors"
fi

exit $status
