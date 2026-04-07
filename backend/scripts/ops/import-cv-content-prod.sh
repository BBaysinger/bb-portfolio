#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
REPO_ROOT="$(cd "${BACKEND_DIR}/.." && pwd)"
PROFILE="prod"

if [[ "${ALLOW_PROD_WRITE:-}" != "true" ]]; then
  echo "Refusing to run: set ALLOW_PROD_WRITE=true to continue."
  echo "Example: ALLOW_PROD_WRITE=true ./scripts/ops/import-cv-content-prod.sh"
  exit 1
fi

read -r -p "Type 'import-cv-prod' to confirm production write: " confirm
if [[ "${confirm}" != "import-cv-prod" ]]; then
  echo "Confirmation failed. Aborting."
  exit 1
fi

if [[ ! -f "${REPO_ROOT}/.github-secrets.private.json5" && ! -f "${REPO_ROOT}/.github-secrets.private.${PROFILE}.json5" ]]; then
  echo "Missing GitHub secrets files. Expected one of:"
  echo "  ${REPO_ROOT}/.github-secrets.private.json5"
  echo "  ${REPO_ROOT}/.github-secrets.private.${PROFILE}.json5"
  exit 1
fi

cd "${BACKEND_DIR}"
USE_GITHUB_SECRETS=true npm run import:cv-content -- --env "${PROFILE}"