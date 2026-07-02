#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
REPO_ROOT="$(cd "${BACKEND_DIR}/.." && pwd)"
PROFILE="prod"

if [[ "${ALLOW_PROD_WRITE:-}" != "true" ]]; then
  echo "Refusing to run: set ALLOW_PROD_WRITE=true to continue."
  echo "Example: ALLOW_PROD_WRITE=true ./scripts/ops/update-contact-info-prod.sh me@example.com"
  exit 1
fi

EMAIL="${1:-}"
if [[ -z "${EMAIL}" ]]; then
  echo "Missing email argument."
  echo "Usage: ALLOW_PROD_WRITE=true ./scripts/ops/update-contact-info-prod.sh <email>"
  exit 1
fi

read -r -p "Type 'update-contact-prod' to confirm production write: " confirm
if [[ "${confirm}" != "update-contact-prod" ]]; then
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
ALLOW_PROD_WRITE=true PROD_WRITE_CONFIRMATION='update-contact-info-prod' USE_GITHUB_SECRETS=true npm run update:contact-info -- --env "${PROFILE}" --email "${EMAIL}" --confirm-prod-write
