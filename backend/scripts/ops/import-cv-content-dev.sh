#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
REPO_ROOT="$(cd "${BACKEND_DIR}/.." && pwd)"
PROFILE="dev"

if [[ "${ALLOW_DEV_WRITE:-}" != "true" ]]; then
  echo "Refusing to run: set ALLOW_DEV_WRITE=true to continue."
  echo "Example: ALLOW_DEV_WRITE=true ./scripts/ops/import-cv-content-dev.sh"
  exit 1
fi

read -r -p "Type 'import-cv-dev' to confirm dev write: " confirm
if [[ "${confirm}" != "import-cv-dev" ]]; then
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