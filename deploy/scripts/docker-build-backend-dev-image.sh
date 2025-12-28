#!/usr/bin/env bash
set -euo pipefail

: "${REQUIRED_ENVIRONMENT_VARIABLES_BACKEND:?}"
: "${MONGODB_URI:?}"
: "${PAYLOAD_SECRET:?}"
: "${AWS_ACCESS_KEY_ID:?}"
: "${AWS_SECRET_ACCESS_KEY:?}"
: "${SES_FROM_EMAIL:?}"
: "${SES_TO_EMAIL:?}"
: "${FRONTEND_URL:?}"
: "${PUBLIC_SERVER_URL:?}"
: "${S3_BUCKET:?}"
: "${AWS_REGION:?}"
: "${BACKEND_INTERNAL_URL:?}"
: "${PUBLIC_PROJECTS_BUCKET:?}"
: "${NDA_PROJECTS_BUCKET:?}"

_tmp_dir="$(mktemp -d)"
cleanup() {
  rm -rf "${_tmp_dir}"
}
trap cleanup EXIT

printf %s "$REQUIRED_ENVIRONMENT_VARIABLES_BACKEND" >"${_tmp_dir}/required_environment_variables_backend"
printf %s "$MONGODB_URI" >"${_tmp_dir}/mongodb_uri"
printf %s "$PAYLOAD_SECRET" >"${_tmp_dir}/payload_secret"
printf %s "$AWS_ACCESS_KEY_ID" >"${_tmp_dir}/aws_access_key_id"
printf %s "$AWS_SECRET_ACCESS_KEY" >"${_tmp_dir}/aws_secret_access_key"
printf %s "$SES_FROM_EMAIL" >"${_tmp_dir}/ses_from_email"
printf %s "$SES_TO_EMAIL" >"${_tmp_dir}/ses_to_email"
printf %s "${SMTP_FROM_EMAIL:-}" >"${_tmp_dir}/smtp_from_email"
printf %s "$FRONTEND_URL" >"${_tmp_dir}/frontend_url"
printf %s "$PUBLIC_SERVER_URL" >"${_tmp_dir}/public_server_url"
printf %s "$S3_BUCKET" >"${_tmp_dir}/s3_bucket"
printf %s "$AWS_REGION" >"${_tmp_dir}/aws_region"
printf %s "$BACKEND_INTERNAL_URL" >"${_tmp_dir}/backend_internal_url"
printf %s "$PUBLIC_PROJECTS_BUCKET" >"${_tmp_dir}/public_projects_bucket"
printf %s "$NDA_PROJECTS_BUCKET" >"${_tmp_dir}/nda_projects_bucket"

DOCKER_BUILDKIT=1 docker build \
  --target runtime \
  --build-arg ENV_PROFILE=dev \
  --build-arg REQUIRED_ENVIRONMENT_VARIABLES_BACKEND="$REQUIRED_ENVIRONMENT_VARIABLES_BACKEND" \
  --secret id=mongodb_uri,src="${_tmp_dir}/mongodb_uri" \
  --secret id=payload_secret,src="${_tmp_dir}/payload_secret" \
  --secret id=aws_access_key_id,src="${_tmp_dir}/aws_access_key_id" \
  --secret id=aws_secret_access_key,src="${_tmp_dir}/aws_secret_access_key" \
  --secret id=ses_from_email,src="${_tmp_dir}/ses_from_email" \
  --secret id=ses_to_email,src="${_tmp_dir}/ses_to_email" \
  --secret id=smtp_from_email,src="${_tmp_dir}/smtp_from_email" \
  --secret id=public_server_url,src="${_tmp_dir}/public_server_url" \
  --secret id=frontend_url,src="${_tmp_dir}/frontend_url" \
  --secret id=s3_bucket,src="${_tmp_dir}/s3_bucket" \
  --secret id=public_projects_bucket,src="${_tmp_dir}/public_projects_bucket" \
  --secret id=nda_projects_bucket,src="${_tmp_dir}/nda_projects_bucket" \
  --secret id=aws_region,src="${_tmp_dir}/aws_region" \
  --secret id=backend_internal_url,src="${_tmp_dir}/backend_internal_url" \
  -t bhbaysinger/bb-portfolio-backend:dev \
  ./backend
