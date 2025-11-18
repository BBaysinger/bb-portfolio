#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="$(mktemp -d)"

s_val() { [ -n "${!1:-}" ] && echo "${!1}" || echo "${2:-}"; }

# Backend prod
printf "%s\n" \
  "NODE_ENV=production" \
  "ENV_PROFILE=prod" \
  "" \
  "# Env-guard definition list for prod profile" \
  "PROD_REQUIRED_ENVIRONMENT_VARIABLES=$(s_val PROD_REQUIRED_ENVIRONMENT_VARIABLES)" \
  "" \
  "PROD_AWS_REGION=$(s_val PROD_AWS_REGION "$S3_REGION")" \
  "" \
  "PROD_MONGODB_URI=$(s_val PROD_MONGODB_URI)" \
  "PROD_PAYLOAD_SECRET=$(s_val PROD_PAYLOAD_SECRET)" \
  "" \
  "PROD_S3_BUCKET=$(s_val PROD_S3_BUCKET)" \
  "PUBLIC_PROJECTS_BUCKET=$(s_val PUBLIC_PROJECTS_BUCKET)" \
  "NDA_PROJECTS_BUCKET=$(s_val NDA_PROJECTS_BUCKET)" \
  "S3_REGION=$(s_val S3_REGION "$PROD_AWS_REGION")" \
  "" \
  "PROD_FRONTEND_URL=$(s_val PROD_FRONTEND_URL)" \
  "PROD_BACKEND_INTERNAL_URL=$(s_val PROD_BACKEND_INTERNAL_URL 'http://bb-portfolio-backend-prod:3000')" \
  "" \
  "SECURITY_TXT_EXPIRES=$(s_val SECURITY_TXT_EXPIRES)" \
  "" \
  "PROD_SES_FROM_EMAIL=$(s_val PROD_SES_FROM_EMAIL)" \
  "PROD_SES_TO_EMAIL=$(s_val PROD_SES_TO_EMAIL)" \
  > "$OUT_DIR/backend.env.prod"

# Backend dev
printf "%s\n" \
  "NODE_ENV=development" \
  "ENV_PROFILE=dev" \
  "PORT=3000" \
  "" \
  "# Env-guard definition list for dev profile" \
  "DEV_REQUIRED_ENVIRONMENT_VARIABLES=$(s_val DEV_REQUIRED_ENVIRONMENT_VARIABLES)" \
  "" \
  "DEV_AWS_REGION=$(s_val DEV_AWS_REGION "$S3_REGION")" \
  "" \
  "DEV_MONGODB_URI=$(s_val DEV_MONGODB_URI)" \
  "DEV_PAYLOAD_SECRET=$(s_val DEV_PAYLOAD_SECRET)" \
  "" \
  "DEV_S3_BUCKET=$(s_val DEV_S3_BUCKET)" \
  "PUBLIC_PROJECTS_BUCKET=$(s_val PUBLIC_PROJECTS_BUCKET)" \
  "NDA_PROJECTS_BUCKET=$(s_val NDA_PROJECTS_BUCKET)" \
  "S3_REGION=$(s_val S3_REGION "$DEV_AWS_REGION")" \
  "" \
  "DEV_FRONTEND_URL=$(s_val DEV_FRONTEND_URL)" \
  "DEV_BACKEND_INTERNAL_URL=$(s_val DEV_BACKEND_INTERNAL_URL 'http://bb-portfolio-backend-dev:3000')" \
  "" \
  "SECURITY_TXT_EXPIRES=$(s_val SECURITY_TXT_EXPIRES)" \
  "" \
  "DEV_SES_FROM_EMAIL=$(s_val DEV_SES_FROM_EMAIL)" \
  "DEV_SES_TO_EMAIL=$(s_val DEV_SES_TO_EMAIL)" \
  > "$OUT_DIR/backend.env.dev"

# Frontend prod
printf "%s\n" \
  "NODE_ENV=production" \
  "ENV_PROFILE=prod" \
  "" \
  "PROD_BACKEND_INTERNAL_URL=$(s_val PROD_BACKEND_INTERNAL_URL 'http://bb-portfolio-backend-prod:3000')" \
  "" \
  "PUBLIC_PROJECTS_BUCKET=$(s_val PUBLIC_PROJECTS_BUCKET)" \
  "NDA_PROJECTS_BUCKET=$(s_val NDA_PROJECTS_BUCKET)" \
  > "$OUT_DIR/frontend.env.prod"

# Frontend dev
printf "%s\n" \
  "NODE_ENV=development" \
  "ENV_PROFILE=dev" \
  "" \
  "DEV_BACKEND_INTERNAL_URL=$(s_val DEV_BACKEND_INTERNAL_URL 'http://bb-portfolio-backend-dev:3000')" \
  "" \
  "PUBLIC_PROJECTS_BUCKET=$(s_val PUBLIC_PROJECTS_BUCKET)" \
  "NDA_PROJECTS_BUCKET=$(s_val NDA_PROJECTS_BUCKET)" \
  > "$OUT_DIR/frontend.env.dev"

echo "dir=$OUT_DIR" >> "$GITHUB_OUTPUT"
