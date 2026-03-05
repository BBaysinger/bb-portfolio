#!/usr/bin/env bash
set -euo pipefail

# Guarded development runner for CV experience seeding.
# Intentionally kept OUT of package.json so environment writes stay explicit.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

if [[ "${ALLOW_DEV_WRITE:-}" != "true" ]]; then
  echo "Refusing to run: set ALLOW_DEV_WRITE=true to continue."
  echo "Example: ALLOW_DEV_WRITE=true ./scripts/ops/seed-cv-experience-dev.sh"
  exit 1
fi

read -r -p "Type 'seed-dev' to confirm dev write: " confirm
if [[ "${confirm}" != "seed-dev" ]]; then
  echo "Confirmation failed. Aborting."
  exit 1
fi

cd "${BACKEND_DIR}"
npm run seed:cv-experience -- --env dev
