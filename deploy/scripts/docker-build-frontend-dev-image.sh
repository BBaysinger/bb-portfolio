#!/usr/bin/env bash
set -euo pipefail

: "${REQUIRED_ENVIRONMENT_VARIABLES_FRONTEND:?}"
: "${NEXT_PUBLIC_ENV_PROFILE:?}"
: "${BACKEND_INTERNAL_URL:?}"
: "${PUBLIC_PROJECTS_BUCKET:?}"
: "${NDA_PROJECTS_BUCKET:?}"
: "${NEXT_PUBLIC_RUM_APP_MONITOR_ID:?}"
: "${NEXT_PUBLIC_RUM_IDENTITY_POOL_ID:?}"
: "${NEXT_PUBLIC_RUM_GUEST_ROLE_ARN:?}"
: "${NEXT_PUBLIC_RUM_REGION:?}"
: "${NEXT_PUBLIC_RUM_DEBUG:?}"

_tmp_dir="$(mktemp -d)"
cleanup() {
  rm -rf "${_tmp_dir}"
}
trap cleanup EXIT

printf %s "$REQUIRED_ENVIRONMENT_VARIABLES_FRONTEND" >"${_tmp_dir}/required_environment_variables_frontend"
printf %s "$NEXT_PUBLIC_ENV_PROFILE" >"${_tmp_dir}/next_public_env_profile"
printf %s "$BACKEND_INTERNAL_URL" >"${_tmp_dir}/backend_internal_url"
printf %s "$PUBLIC_PROJECTS_BUCKET" >"${_tmp_dir}/public_projects_bucket"
printf %s "$NDA_PROJECTS_BUCKET" >"${_tmp_dir}/nda_projects_bucket"
printf %s "$NEXT_PUBLIC_RUM_APP_MONITOR_ID" >"${_tmp_dir}/next_public_rum_app_monitor_id"
printf %s "$NEXT_PUBLIC_RUM_IDENTITY_POOL_ID" >"${_tmp_dir}/next_public_rum_identity_pool_id"
printf %s "$NEXT_PUBLIC_RUM_GUEST_ROLE_ARN" >"${_tmp_dir}/next_public_rum_guest_role_arn"
printf %s "$NEXT_PUBLIC_RUM_REGION" >"${_tmp_dir}/next_public_rum_region"
printf %s "$NEXT_PUBLIC_RUM_DEBUG" >"${_tmp_dir}/next_public_rum_debug"

DOCKER_BUILDKIT=1 docker build \
  --target runner \
  --build-arg ENV_PROFILE=dev \
  --secret id=required_environment_variables_frontend,src="${_tmp_dir}/required_environment_variables_frontend" \
  --secret id=next_public_env_profile,src="${_tmp_dir}/next_public_env_profile" \
  --secret id=backend_internal_url,src="${_tmp_dir}/backend_internal_url" \
  --secret id=public_projects_bucket,src="${_tmp_dir}/public_projects_bucket" \
  --secret id=nda_projects_bucket,src="${_tmp_dir}/nda_projects_bucket" \
  --secret id=next_public_rum_app_monitor_id,src="${_tmp_dir}/next_public_rum_app_monitor_id" \
  --secret id=next_public_rum_identity_pool_id,src="${_tmp_dir}/next_public_rum_identity_pool_id" \
  --secret id=next_public_rum_guest_role_arn,src="${_tmp_dir}/next_public_rum_guest_role_arn" \
  --secret id=next_public_rum_region,src="${_tmp_dir}/next_public_rum_region" \
  --secret id=next_public_rum_debug,src="${_tmp_dir}/next_public_rum_debug" \
  -t bhbaysinger/bb-portfolio-frontend:dev \
  ./frontend
