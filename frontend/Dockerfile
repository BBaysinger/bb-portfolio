# Multi-stage Dockerfile for frontend (dev and prod)
# Image choices:
# - Build stages default to Chainguard/Wolfi Node 22 for a minimal, frequently-patched base
#   with full Node tooling (npm). Override via --build-arg NODE_IMAGE=<image>.
# - Final runtime uses Distroless Node 22 (Debian 12) by default. Override via --build-arg RUNNER_IMAGE=<image>.

# Allow overriding base and runner images via build args
# Default to Docker Hub/ECR Node 22 slim to avoid registry availability issues
ARG NODE_IMAGE="public.ecr.aws/docker/library/node:22-slim"
ARG RUNNER_IMAGE="gcr.io/distroless/nodejs22-debian12"

FROM ${NODE_IMAGE} AS base
# Recommendation: pin by digest for reproducibility (set via CI)
# e.g. FROM cgr.dev/chainguard/node:22@sha256:<digest> AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Keep base minimal; Debian slim avoids Alpine CVEs and libc6-compat not required
# Chainguard/Wolfi base is minimal and routinely patched; no extra packages

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

FROM base AS dev
ENV NODE_ENV=development
COPY --from=deps /app/node_modules /app/node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

FROM base AS builder
ENV NODE_ENV=production
# Deployment profile (e.g. local/dev/prod). Used at build-time so client bundles can gate dev-only UI.
ARG ENV_PROFILE
ENV ENV_PROFILE=$ENV_PROFILE
COPY --from=deps /app/node_modules /app/node_modules
COPY . .

# Build with BuildKit secrets mounted; values are exported only for this RUN.
# This keeps build-time inputs out of layer history and enforces a single source.
RUN --mount=type=secret,id=required_environment_variables_frontend,required=false \
		--mount=type=secret,id=next_public_env_profile,required=false \
		--mount=type=secret,id=backend_internal_url,required=false \
		--mount=type=secret,id=public_projects_bucket,required=false \
		--mount=type=secret,id=nda_projects_bucket,required=false \
		--mount=type=secret,id=next_public_rum_app_monitor_id,required=false \
		--mount=type=secret,id=next_public_rum_identity_pool_id,required=false \
		--mount=type=secret,id=next_public_rum_guest_role_arn,required=false \
		--mount=type=secret,id=next_public_rum_region,required=false \
		--mount=type=secret,id=next_public_rum_debug,required=false \
		<<'EOF'
set -eu

read_secret() {
	name="$1"
	p="/run/secrets/$name"
	if [ -f "$p" ]; then
		cat "$p"
	fi
}

assign_if_present() {
	var="$1"
	value="$2"
	if [ -n "$value" ]; then
		export "$var=$value"
	fi
}

# Required list definition for env-guard
assign_if_present REQUIRED_ENVIRONMENT_VARIABLES_FRONTEND "$(read_secret required_environment_variables_frontend)"

# Profile used by app code; NEXT_PUBLIC_ENV_PROFILE is explicitly mounted (not inferred)
assign_if_present NEXT_PUBLIC_ENV_PROFILE "$(read_secret next_public_env_profile)"

# App build-time config
assign_if_present BACKEND_INTERNAL_URL "$(read_secret backend_internal_url)"
assign_if_present PUBLIC_PROJECTS_BUCKET "$(read_secret public_projects_bucket)"
assign_if_present NDA_PROJECTS_BUCKET "$(read_secret nda_projects_bucket)"

# RUM build-time config
assign_if_present NEXT_PUBLIC_RUM_APP_MONITOR_ID "$(read_secret next_public_rum_app_monitor_id)"
assign_if_present NEXT_PUBLIC_RUM_IDENTITY_POOL_ID "$(read_secret next_public_rum_identity_pool_id)"
assign_if_present NEXT_PUBLIC_RUM_GUEST_ROLE_ARN "$(read_secret next_public_rum_guest_role_arn)"
assign_if_present NEXT_PUBLIC_RUM_REGION "$(read_secret next_public_rum_region)"
assign_if_present NEXT_PUBLIC_RUM_DEBUG "$(read_secret next_public_rum_debug)"

npm run build:webpack
EOF

# Distroless production runtime to reduce CVEs
# Name the final stage `runner` to match CI build target
FROM ${RUNNER_IMAGE} AS runner
# Recommendation: pin by digest for reproducibility (set via CI)
# e.g. FROM gcr.io/distroless/nodejs22-debian12@sha256:<digest> AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Include package.json metadata
COPY package.json .

# Copy Next standalone server output and static assets
COPY --from=builder /app/.next/standalone .
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

# Start the Next standalone server; distroless sets entrypoint to node
CMD ["server.js"]
