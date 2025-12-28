#!/usr/bin/env bash
set -euo pipefail

PROFILE="${1:?profile (dev|prod|stage) required}"
RAW_FRONTEND="${2:-}"
RAW_BACKEND="${3:-$RAW_FRONTEND}"

if [ -z "${RAW_FRONTEND}" ]; then
  echo "RAW_FRONTEND env list required as 2nd arg" >&2
  exit 1
fi
if [ -z "${RAW_BACKEND}" ]; then
  echo "RAW_BACKEND env list required as 3rd arg (or omit to reuse frontend)" >&2
  exit 1
fi

normalize_list() {
  printf "%s" "$1" | sed -E 's/,\s*,+/,/g; s/^,|,$//g'
}

FRONTEND_BASE="$(normalize_list "$RAW_FRONTEND")"
BACKEND_BASE="$(normalize_list "$RAW_BACKEND")"

FRONTEND_REQ="$FRONTEND_BASE"
# Backend drops SECURITY_TXT_EXPIRES (not needed for build-time checks)
BACKEND_REQ=$(printf "%s" "$BACKEND_BASE" | sed -E 's/(^|,)(SECURITY_TXT_EXPIRES)(,|$)/\1\3/g' | sed -E 's/,\s*,+/,/g; s/^,|,$//g')
# Emit outputs
case "$PROFILE" in
  dev)
    echo "dev_req_frontend=$FRONTEND_REQ" >> "$GITHUB_OUTPUT"
    echo "dev_req_backend=$BACKEND_REQ" >> "$GITHUB_OUTPUT"
    ;;
  prod)
    echo "prod_req_frontend=$FRONTEND_REQ" >> "$GITHUB_OUTPUT"
    echo "prod_req_backend=$BACKEND_REQ" >> "$GITHUB_OUTPUT"
    ;;
  stage)
    echo "stage_req_frontend=$FRONTEND_REQ" >> "$GITHUB_OUTPUT"
    echo "stage_req_backend=$BACKEND_REQ" >> "$GITHUB_OUTPUT"
    ;;
  *)
    echo "Unsupported profile: $PROFILE" >&2; exit 1;
    ;;
esac
