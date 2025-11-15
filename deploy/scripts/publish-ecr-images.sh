#!/bin/bash
set -euo pipefail

# publish-ecr-images.sh
# Builds and publishes frontend and backend production images to Amazon ECR with :latest tag
# -----------------------------------------------------------------------------------------
# Part of the deployment orchestrator flow for production deployments.
# Called by deployment-orchestrator.sh when --build-images prod or --build-images both is specified.
#
# Role in blue-green deployments:
# - Images built here are pulled by both active and candidate instances during deployment
# - ECR images are immutable once pushed; new deployments pull latest images
# - Used for both initial deployments and blue-green candidate instance provisioning
#
# Security & Build Strategy:
# - Non-sensitive config (PROD_FRONTEND_URL, PROD_AWS_REGION, PROD_S3_BUCKET) provided via
#   --build-arg for Next.js build-time validation and runtime config
# - Sensitive values (MongoDB URI, Payload secret, AWS credentials, SES emails) injected via
#   Docker BuildKit --secret mounts (ephemeral during RUN, not persisted in layers/history)
# - Source of truth: infra/terraform.tfvars (generated from .github-secrets.private.json5)
# - Images tagged as :latest for simplicity; git commit SHA tracked in CI/CD logs
#
# Architecture on EC2:
# - Nginx reverse proxy forwards to Docker Compose services
# - Production profile: bb-portfolio-frontend-prod:3000, bb-portfolio-backend-prod:3001
# - Images are Debian-based Node.js containers (node:22-slim)
#
# Requirements:
# - AWS CLI configured with ECR permissions (ecr:GetAuthorizationToken, ecr:BatchCheckLayerAvailability, etc.)
# - Docker with BuildKit support enabled
# - infra/terraform.tfvars present with production secrets
#
# Usage:
#   deploy/scripts/publish-ecr-images.sh                    # Direct invocation (rare)
#   deployment-orchestrator.sh --build-images prod          # Typical usage via orchestrator

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
