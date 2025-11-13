#!/usr/bin/env bash
set -euo pipefail

# Seed ContactInfo global for the given profile (dev|prod)
# Usage: deploy/scripts/seed-contact-info.sh dev \
#          --e164 +15092798603 --display 509-279-8603

profile="${1:-}"; shift || true
[[ "$profile" =~ ^(dev|prod)$ ]] || { echo "usage: $0 <dev|prod> [--e164 E164] [--display DISPLAY]" >&2; exit 1; }

E164="+15092798603"; DISPLAY="509-279-8603"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --e164) E164="${2:-}"; shift 2;;
    --display) DISPLAY="${2:-}"; shift 2;;
    *) echo "Unknown arg: $1" >&2; exit 1;;
  esac
done

ROOT_DIR="$(cd "$(dirname "$0")"/../.. && pwd)"
SECRETS_FILE="$ROOT_DIR/.github-secrets.private.json5"
[[ -f "$SECRETS_FILE" ]] || { echo "Secrets file not found: $SECRETS_FILE" >&2; exit 1; }

val() {
  local KEY="$1"
  # Extract single-quoted values like KEY: 'value', tolerating spaces
  sed -n "s/.*${KEY}: '\([^']*\)'.*/\1/p" "$SECRETS_FILE"
}

if [[ "$profile" == "dev" ]]; then
  ENV_PROFILE=dev \
  DEV_MONGODB_URI="$(val DEV_MONGODB_URI)" \
  DEV_PAYLOAD_SECRET="$(val DEV_PAYLOAD_SECRET)" \
  DEV_S3_BUCKET="$(val DEV_S3_BUCKET)" \
  DEV_AWS_REGION="$(val DEV_AWS_REGION)" \
  DEV_FRONTEND_URL="$(val DEV_FRONTEND_URL)" \
    npx --yes tsx "$ROOT_DIR/backend/scripts/seed-contact-info.ts" --e164 "$E164" --display "$DISPLAY"
else
  ENV_PROFILE=prod \
  PROD_MONGODB_URI="$(val PROD_MONGODB_URI)" \
  PROD_PAYLOAD_SECRET="$(val PROD_PAYLOAD_SECRET)" \
  PROD_S3_BUCKET="$(val PROD_S3_BUCKET)" \
  PROD_AWS_REGION="$(val PROD_AWS_REGION)" \
  PROD_FRONTEND_URL="$(val PROD_FRONTEND_URL)" \
    npx --yes tsx "$ROOT_DIR/backend/scripts/seed-contact-info.ts" --e164 "$E164" --display "$DISPLAY"
fi

echo "Seed complete for profile: $profile"
