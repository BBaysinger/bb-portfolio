#!/bin/bash
set -euo pipefail

# Publishes frontend and backend images to ECR with :latest tag
#
# Security & rationale:
# - All config now flows through the canonical env generator so we only deal with
#   neutral keys (AWS_REGION, BACKEND_INTERNAL_URL, etc.).
# - Sensitive values (Mongo URI, Payload secret, AWS creds, SES emails) are injected
#   via Docker BuildKit secrets so they never persist in image layers/history.
# - Source of truth remains .github-secrets.private.json5 (+ profile overrides) which
#   the TypeScript generator already merges for us.
#
# Usage: ./deploy/publish-ecr-images.sh

ACCOUNT_ID="778230822028"
ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
SECRETS_FILE="$ROOT_DIR/.github-secrets.private.json5"
PROFILE="prod"

cleanup() {
	[[ -d "$TMP_ENV_DIR" ]] && rm -rf "$TMP_ENV_DIR"
}

read_json5_key() {
	local keyPath="$1"
	node -e "const fs=require('fs');const JSON5=require('json5');const o=JSON5.parse(fs.readFileSync(process.argv[1],'utf8'));const p=process.argv[2].split('.');let v=o;for (const k of p){v=v?.[k]}process.stdout.write(v??'');" "$SECRETS_FILE" "$keyPath"
}

trim() {
	local s="$1"
	s="${s#${s%%[![:space:]]*}}"
	s="${s%${s##*[![:space:]]}}"
	printf '%s' "$s"
}

load_env_file() {
	local file="$1"
	while IFS= read -r line || [[ -n "$line" ]]; do
		[[ "$line" =~ ^[[:space:]]*# ]] && continue
		[[ -z "${line// /}" ]] && continue
		[[ "$line" != *=* ]] && continue
		local key
		key="$(trim "${line%%=*}")"
		local value
		value="$(trim "${line#*=}")"
		export "$key=$value"
	done < "$file"
}

require_env() {
	local name="$1"
	if [[ -z "${!name:-}" ]]; then
		echo "❌ Missing $name in generated env bundle" >&2
		exit 1
	fi
}

add_secret() {
	local key="$1"
	local env_var="$2"
	BACKEND_SECRET_FLAGS+=(--secret "id=${key},env=${env_var}")
}

TMP_ENV_DIR="$(mktemp -d)"
trap cleanup EXIT

echo "Generating ${PROFILE} env bundle..."
(cd "$ROOT_DIR" && npx --yes tsx scripts/generate-env-files.ts --out "$TMP_ENV_DIR" --profiles "$PROFILE" --targets backend >/dev/null)

ENV_FILE="$TMP_ENV_DIR/backend.env.${PROFILE}"
[[ -f "$ENV_FILE" ]] || { echo "❌ Env file missing: $ENV_FILE" >&2; exit 1; }
load_env_file "$ENV_FILE"

for var in BACKEND_INTERNAL_URL FRONTEND_URL S3_BUCKET AWS_REGION MONGODB_URI PAYLOAD_SECRET SES_FROM_EMAIL SES_TO_EMAIL PUBLIC_SERVER_URL; do
	require_env "$var"
done

if [[ -z "${SMTP_FROM_EMAIL:-}" ]]; then
	export SMTP_FROM_EMAIL="${SES_FROM_EMAIL:-}"
fi

AWS_ACCESS_KEY_ID_VAL="$(read_json5_key strings.AWS_ACCESS_KEY_ID)"
AWS_SECRET_ACCESS_KEY_VAL="$(read_json5_key strings.AWS_SECRET_ACCESS_KEY)"
if [[ -z "$AWS_ACCESS_KEY_ID_VAL" || -z "$AWS_SECRET_ACCESS_KEY_VAL" ]]; then
	echo "❌ Missing AWS credentials in $SECRETS_FILE (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY)." >&2
	exit 1
fi

export AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID_VAL"
export AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY_VAL"

BACKEND_SECRET_FLAGS=()
for key in mongodb_uri payload_secret frontend_url s3_bucket aws_region ses_from_email ses_to_email smtp_from_email backend_internal_url public_server_url; do
	env_var="${key^^}"
	add_secret "$key" "$env_var"
done

ECR_REGION="${AWS_REGION:-us-west-2}"
FRONTEND_REPO="${ACCOUNT_ID}.dkr.ecr.${ECR_REGION}.amazonaws.com/bb-portfolio-frontend-prod"
BACKEND_REPO="${ACCOUNT_ID}.dkr.ecr.${ECR_REGION}.amazonaws.com/bb-portfolio-backend-prod"

echo "Logging into ECR..."
aws ecr get-login-password --region "$ECR_REGION" | docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${ECR_REGION}.amazonaws.com"

echo "Building frontend (${PROFILE} runner)..."
cd "$ROOT_DIR/frontend"
docker build \
	--target runner \
	--build-arg "ENV_PROFILE=$PROFILE" \
	--build-arg "BACKEND_INTERNAL_URL=$BACKEND_INTERNAL_URL" \
	--build-arg "FRONTEND_URL=$FRONTEND_URL" \
	-t "${FRONTEND_REPO}:latest" .

echo "Building backend (${PROFILE} runtime)..."
cd "$ROOT_DIR/backend"
DOCKER_BUILDKIT=1 docker build \
	--target runtime \
	--build-arg "ENV_PROFILE=$PROFILE" \
	"${BACKEND_SECRET_FLAGS[@]}" \
	--secret id=aws_access_key_id,env=AWS_ACCESS_KEY_ID \
	--secret id=aws_secret_access_key,env=AWS_SECRET_ACCESS_KEY \
	-t "${BACKEND_REPO}:latest" .

echo "Pushing images..."
docker push "${FRONTEND_REPO}:latest"
docker push "${BACKEND_REPO}:latest"

echo "✅ Published to ECR:"
echo "  - ${FRONTEND_REPO}:latest"
echo "  - ${BACKEND_REPO}:latest"
