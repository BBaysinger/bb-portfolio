#!/bin/bash
set -euo pipefail

# Publishes frontend and backend images to ECR with :latest tag
#
# Security & rationale:
# - Non-sensitive config required at build-time (PROD_FRONTEND_URL, PROD_AWS_REGION, PROD_S3_BUCKET)
#   is provided via --build-arg so Next.js build and runtime config validation can succeed.
# - Sensitive values (Mongo URI, Payload secret, AWS creds, SES emails) are injected via Docker
#   BuildKit --secret mounts so they are ephemeral during RUN and not persisted in layers/history.
# - Source of truth for prod values is infra/terraform.tfvars, which is generated from your
#   .github-secrets.private.json5 during the deploy flow.
#
# Usage: ./deploy/publish-ecr-images.sh

REGION="us-west-2"
ACCOUNT_ID="778230822028"
FRONTEND_REPO="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/bb-portfolio-frontend-prod"
BACKEND_REPO="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/bb-portfolio-backend-prod"

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
TFVARS="$ROOT_DIR/infra/terraform.tfvars"

get_tf_var() {
	local key="$1"
	# Extract quoted value for key from terraform.tfvars
	grep -E "^${key}[[:space:]]*=" "$TFVARS" | sed -E 's/^[^=]+=[[:space:]]*"(.*)".*/\1/'
}

export PROD_MONGODB_URI="$(get_tf_var prod_mongodb_uri)"
export PROD_PAYLOAD_SECRET="$(get_tf_var prod_payload_secret)"
export AWS_ACCESS_KEY_ID="$(get_tf_var aws_access_key_id)"
export AWS_SECRET_ACCESS_KEY="$(get_tf_var aws_secret_access_key)"
export PROD_SES_FROM_EMAIL="$(get_tf_var prod_ses_from_email)"
export PROD_SES_TO_EMAIL="$(get_tf_var prod_ses_to_email)"
PROD_AWS_REGION_VAL="$(get_tf_var prod_aws_region)"
PROD_S3_BUCKET_VAL="$(get_tf_var prod_s3_bucket)"
PROD_FRONTEND_URL_VAL="$(get_tf_var prod_frontend_url)"

echo "Logging into ECR..."
aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

echo "Building frontend (production runner)..."
cd "$ROOT_DIR/frontend"
# Build the production image using the correct target and required build args
docker build \
	--target runner \
	--build-arg ENV_PROFILE=prod \
	--build-arg PROD_BACKEND_INTERNAL_URL="http://bb-portfolio-backend-prod:3000" \
	-t "${FRONTEND_REPO}:latest" .

echo "Building backend (production runtime)..."
cd "$ROOT_DIR/backend"
# Build the production image using the correct target; build-time secrets are optional here
DOCKER_BUILDKIT=1 docker build \
	--target runtime \
	--build-arg ENV_PROFILE=prod \
	--build-arg PROD_AWS_REGION="$PROD_AWS_REGION_VAL" \
	--build-arg PROD_S3_BUCKET="$PROD_S3_BUCKET_VAL" \
	--build-arg PROD_FRONTEND_URL="$PROD_FRONTEND_URL_VAL" \
	--secret id=prod_mongodb_uri,env=PROD_MONGODB_URI \
	--secret id=prod_payload_secret,env=PROD_PAYLOAD_SECRET \
	--secret id=aws_access_key_id,env=AWS_ACCESS_KEY_ID \
	--secret id=aws_secret_access_key,env=AWS_SECRET_ACCESS_KEY \
	--secret id=prod_ses_from_email,env=PROD_SES_FROM_EMAIL \
	--secret id=prod_ses_to_email,env=PROD_SES_TO_EMAIL \
	-t "${BACKEND_REPO}:latest" .

echo "Pushing images..."
docker push "${FRONTEND_REPO}:latest"
docker push "${BACKEND_REPO}:latest"

echo "✅ Published to ECR:"
echo "  - ${FRONTEND_REPO}:latest"
echo "  - ${BACKEND_REPO}:latest"
