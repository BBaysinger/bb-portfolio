#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TARGET="${REPO_ROOT}/deploy-blue-green/scripts/deployment-orchestrator.sh"
if [ ! -f "$TARGET" ]; then
  echo "Lagoon orchestrator target not found: $TARGET" >&2
  exit 1
fi
exec "$TARGET" "$@"
