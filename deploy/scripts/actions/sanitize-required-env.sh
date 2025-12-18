#!/usr/bin/env bash
set -euo pipefail
PROFILE="${1:?profile (dev|prod) required}"; RAW="${2:-}"
if [ -z "${RAW}" ]; then echo "RAW env list required as 2nd arg" >&2; exit 1; fi
# Normalize commas
BASE=$(printf "%s" "$RAW" | sed -E 's/,\s*,+/,/g; s/^,|,$//g')
FRONTEND_REQ="$BASE"
# Backend drops SECURITY_TXT_EXPIRES
BACKEND_REQ=$(printf "%s" "$BASE" | sed -E 's/(^|,)(SECURITY_TXT_EXPIRES)(,|$)/\1\3/g' | sed -E 's/,\s*,+/,/g; s/^,|,$//g')
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
