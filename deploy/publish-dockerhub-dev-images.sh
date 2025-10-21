#!/bin/bash
set -euo pipefail

# Builds and pushes development-tagged images to Docker Hub using production-like stages (no hot reload)
#
# Security & rationale:
# - Non-sensitive config (DEV_FRONTEND_URL, DEV_S3_BUCKET, DEV_AWS_REGION) is passed via --build-arg.
#   These are required for strict config validation and page-data collection during Next.js build.
# - Sensitive values (Mongo URI, Payload secret, AWS creds, SES emails) are injected via Docker BuildKit secrets
#   using --secret mounts. BuildKit secrets are ephemeral for the RUN instruction and are NOT baked into layers,
#   NOT present in image history, and NOT pushed to the registry.
# - Source of truth for values is .github-secrets.private.json5 to keep local build/dev consistent with CI.
#
# Usage: ./deploy/publish-dockerhub-dev-images.sh

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SECRETS_FILE="$ROOT_DIR/.github-secrets.private.json5"

# Helper to read values from JSON5 via node + json5 package
read_json5_key() {
  local keyPath="$1" # e.g., strings.DEV_AWS_REGION
  node -e "const fs=require('fs');const JSON5=require('json5');const o=JSON5.parse(fs.readFileSync(process.argv[1],'utf8'));const p=process.argv[2].split('.');let v=o;for(const k of p){v=v?.[k]}console.log(v??'')" "$SECRETS_FILE" "$keyPath"
}

DEV_AWS_REGION_VAL="$(read_json5_key strings.DEV_AWS_REGION)"
DOCKER_HUB_USER="$(read_json5_key strings.DOCKER_HUB_USERNAME)"
DOCKER_HUB_PASS="$(read_json5_key strings.DOCKER_HUB_PASSWORD)"
# Public, non-sensitive dev URL used by backend during build for CORS/CSRF config
DEV_FRONTEND_URL_VAL="$(read_json5_key strings.DEV_FRONTEND_URL)"
DEV_S3_BUCKET_VAL="$(read_json5_key strings.DEV_S3_BUCKET)"
# Backend build-time secrets for dev
AWS_ACCESS_KEY_ID_VAL="$(read_json5_key strings.AWS_ACCESS_KEY_ID)"
AWS_SECRET_ACCESS_KEY_VAL="$(read_json5_key strings.AWS_SECRET_ACCESS_KEY)"
DEV_SES_FROM_EMAIL_VAL="$(read_json5_key strings.DEV_SES_FROM_EMAIL)"
DEV_SES_TO_EMAIL_VAL="$(read_json5_key strings.DEV_SES_TO_EMAIL)"
DEV_MONGODB_URI_VAL="$(read_json5_key strings.DEV_MONGODB_URI)"
DEV_PAYLOAD_SECRET_VAL="$(read_json5_key strings.DEV_PAYLOAD_SECRET)"

if [[ -z "${DEV_AWS_REGION_VAL}" ]]; then
  echo "❌ Could not resolve strings.DEV_AWS_REGION from .github-secrets.private.json5" >&2
  exit 1
fi
if [[ -z "${DEV_FRONTEND_URL_VAL}" ]]; then
  echo "❌ Could not resolve strings.DEV_FRONTEND_URL from .github-secrets.private.json5" >&2
  exit 1
fi
if [[ -z "${DEV_S3_BUCKET_VAL}" ]]; then
  echo "❌ Could not resolve strings.DEV_S3_BUCKET from .github-secrets.private.json5" >&2
  exit 1
fi

# Preflight: ensure required AWS creds exist for backend dev build
if [[ -z "${AWS_ACCESS_KEY_ID_VAL}" || -z "${AWS_SECRET_ACCESS_KEY_VAL}" ]]; then
  echo "❌ Missing AWS credentials in .github-secrets.private.json5 (strings.AWS_ACCESS_KEY_ID / strings.AWS_SECRET_ACCESS_KEY)." >&2
  echo "   These are required at build-time for backend (dev) image to collect page data." >&2
  exit 1
fi

FRONTEND_IMAGE="bhbaysinger/portfolio-frontend:dev"
BACKEND_IMAGE="bhbaysinger/portfolio-backend:dev"

echo "Building frontend (dev runner stage, no hot reload)..."
cd "$ROOT_DIR/frontend"
docker build \
  --target runner \
  --build-arg ENV_PROFILE=dev \
  --build-arg DEV_BACKEND_INTERNAL_URL="http://bb-portfolio-backend-dev:3000" \
  -t "$FRONTEND_IMAGE" .

echo "Building backend (dev runtime stage, no hot reload)..."
cd "$ROOT_DIR/backend"
# Export env vars for BuildKit secret env sources (values are not logged)
export AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID_VAL"
export AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY_VAL"
export DEV_SES_FROM_EMAIL="$DEV_SES_FROM_EMAIL_VAL"
export DEV_SES_TO_EMAIL="$DEV_SES_TO_EMAIL_VAL"
export DEV_MONGODB_URI="$DEV_MONGODB_URI_VAL"
export DEV_PAYLOAD_SECRET="$DEV_PAYLOAD_SECRET_VAL"
DOCKER_BUILDKIT=1 docker build \
  --target runtime \
  --build-arg ENV_PROFILE=dev \
  --build-arg DEV_FRONTEND_URL="$DEV_FRONTEND_URL_VAL" \
  --build-arg DEV_S3_BUCKET="$DEV_S3_BUCKET_VAL" \
  --build-arg DEV_AWS_REGION="$DEV_AWS_REGION_VAL" \
  --secret id=aws_access_key_id,env=AWS_ACCESS_KEY_ID \
  --secret id=aws_secret_access_key,env=AWS_SECRET_ACCESS_KEY \
  --secret id=dev_ses_from_email,env=DEV_SES_FROM_EMAIL \
  --secret id=dev_ses_to_email,env=DEV_SES_TO_EMAIL \
  --secret id=dev_mongodb_uri,env=DEV_MONGODB_URI \
  --secret id=dev_payload_secret,env=DEV_PAYLOAD_SECRET \
  -t "$BACKEND_IMAGE" .

if [[ -n "$DOCKER_HUB_USER" && -n "$DOCKER_HUB_PASS" ]]; then
  echo "Logging into Docker Hub..."
  echo "$DOCKER_HUB_PASS" | docker login -u "$DOCKER_HUB_USER" --password-stdin >/dev/null
fi

echo "Pushing dev images to Docker Hub..."
docker push "$BACKEND_IMAGE"
docker push "$FRONTEND_IMAGE"

echo "✅ Published to Docker Hub (dev):"
echo "  - $FRONTEND_IMAGE"
echo "  - $BACKEND_IMAGE"
