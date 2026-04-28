#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

if [[ "${ALLOW_DEV_WRITE:-}" != "true" ]]; then
  echo "Refusing to run: set ALLOW_DEV_WRITE=true to continue."
  echo "Example: ALLOW_DEV_WRITE=true ./scripts/ops/sync-prod-to-dev.sh"
  exit 1
fi

read -r -p "Type 'sync-prod-to-dev' to confirm dev overwrite from prod: " confirm
if [[ "${confirm}" != "sync-prod-to-dev" ]]; then
  echo "Confirmation failed. Aborting."
  exit 1
fi

cd "${BACKEND_DIR}"
USE_GITHUB_SECRETS=true npx tsx ./scripts/ops/ops-db-sync-prod-to-dev.ts --apply
