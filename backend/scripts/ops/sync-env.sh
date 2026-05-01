#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

usage() {
  cat >&2 <<'EOF'
Usage: backend/scripts/ops/sync-env.sh <source> <target> [--apply|--dry-run] [--output-dir <path>]

Examples:
  backend/scripts/ops/sync-env.sh local dev --dry-run
  ALLOW_DEV_WRITE=true backend/scripts/ops/sync-env.sh local dev --apply
  ALLOW_PROD_WRITE=true backend/scripts/ops/sync-env.sh dev prod --apply
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" || "${1:-}" == "help" ]]; then
  usage
  exit 0
fi

SOURCE_PROFILE="${1:-}"
TARGET_PROFILE="${2:-}"

if [[ -z "${SOURCE_PROFILE}" || -z "${TARGET_PROFILE}" ]]; then
  usage
  exit 1
fi

shift 2

case "${SOURCE_PROFILE}" in
  local | dev | prod) ;;
  *)
    echo "Invalid source profile: ${SOURCE_PROFILE}" >&2
    usage
    exit 1
    ;;
esac

case "${TARGET_PROFILE}" in
  local | dev | prod) ;;
  *)
    echo "Invalid target profile: ${TARGET_PROFILE}" >&2
    usage
    exit 1
    ;;
esac

if [[ "${SOURCE_PROFILE}" == "${TARGET_PROFILE}" ]]; then
  echo "Source and target must be different environments." >&2
  exit 1
fi

if printf '%s\n' "$@" | grep -qx -- '--apply'; then
  if [[ "${TARGET_PROFILE}" == "dev" && "${ALLOW_DEV_WRITE:-}" != "true" ]]; then
    echo "Refusing to run: set ALLOW_DEV_WRITE=true to continue." >&2
    echo "Example: ALLOW_DEV_WRITE=true backend/scripts/ops/sync-env.sh ${SOURCE_PROFILE} dev --apply" >&2
    exit 1
  fi

  if [[ "${TARGET_PROFILE}" == "prod" && "${ALLOW_PROD_WRITE:-}" != "true" ]]; then
    echo "Refusing to run: set ALLOW_PROD_WRITE=true to continue." >&2
    echo "Example: ALLOW_PROD_WRITE=true backend/scripts/ops/sync-env.sh ${SOURCE_PROFILE} prod --apply" >&2
    exit 1
  fi

  read -r -p "Type 'sync-${SOURCE_PROFILE}-to-${TARGET_PROFILE}' to confirm overwrite: " confirm
  if [[ "${confirm}" != "sync-${SOURCE_PROFILE}-to-${TARGET_PROFILE}" ]]; then
    echo "Confirmation failed. Aborting." >&2
    exit 1
  fi
fi

cd "${BACKEND_DIR}"
USE_GITHUB_SECRETS=true npx tsx ./scripts/ops/ops-db-sync-env.ts --source "${SOURCE_PROFILE}" --target "${TARGET_PROFILE}" "$@"
