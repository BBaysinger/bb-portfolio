#!/usr/bin/env bash
set -euo pipefail

# Guarded production runner for CV experience seeding.
# Intentionally kept OUT of package.json so prod writes are explicit.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

if [[ "${ALLOW_PROD_WRITE:-}" != "true" ]]; then
  echo "Refusing to run: set ALLOW_PROD_WRITE=true to continue."
  echo "Example: ALLOW_PROD_WRITE=true ./scripts/ops/seed-cv-experience-prod.sh"
  exit 1
fi

read -r -p "Type 'seed-prod' to confirm production write: " confirm
if [[ "${confirm}" != "seed-prod" ]]; then
  echo "Confirmation failed. Aborting."
  exit 1
fi

cd "${BACKEND_DIR}"
npm run seed:cv-experience -- --env prod
