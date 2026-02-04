# Backend Dockerfile for Payload CMS Portfolio Application
#
# Architecture:
# - builder: compiles the app and prunes devDependencies
# - runtime: minimal production runtime
# - dev: local development with auto-restart
#
# Image choices:
# - Build/dev stages may use a standard Node base (via NODE_IMAGE arg) to retain full tooling.
# - Final runtime uses Distroless Node 22 (Debian 12) for minimal attack surface,
#   no shell/package manager, and cleaner security scan results.

# Specify Dockerfile syntax version for advanced features
# syntax=docker/dockerfile:1

#######################
# Builder Stage
#######################
# This stage compiles the Payload CMS application and prepares production dependencies

# Allow registry to be overridden per-environment; default to Docker Hub for dev/local
# Default to Alpine to reduce CVEs; can override with build arg NODE_IMAGE
ARG NODE_IMAGE=node:22-alpine3.20
FROM ${NODE_IMAGE} AS builder

# Allow selecting build-time profile (prod|dev); default prod for CI hardening
ARG BUILD_PROFILE=prod
# Explicitly set build-time ENV_PROFILE via ARG and propagate to ENV for build steps
ARG ENV_PROFILE=prod
# Required env list for env-guard (no legacy unified list)
ARG REQUIRED_ENVIRONMENT_VARIABLES_BACKEND
# Propagate into shell environment for RUN steps
ENV BUILD_PROFILE=${BUILD_PROFILE}
ENV ENV_PROFILE=${ENV_PROFILE}
ENV REQUIRED_ENVIRONMENT_VARIABLES_BACKEND=${REQUIRED_ENVIRONMENT_VARIABLES_BACKEND}

# IMPORTANT: Don't set NODE_ENV=production here because we need dev dependencies for the build process
# TypeScript compilation, bundling tools, and other build-time dependencies require devDependencies
# ENV NODE_ENV=production

# Set working directory for all subsequent commands
WORKDIR /app

# Keep base packages minimal (Alpine or Debian) to reduce CVE churn
RUN if command -v apk >/dev/null 2>&1; then \
            apk add --no-cache libc6-compat; \
        elif command -v apt-get >/dev/null 2>&1; then \
            apt-get update && rm -rf /var/lib/apt/lists/*; \
        fi

# Build-time environment remains environment-agnostic.
# We avoid baking config into the image. Sensitive values are mounted via BuildKit
# secrets in the RUN step below. Any required checks are satisfied transiently
# during that RUN without persisting env into layers.

## Skipping apt-get steps to reduce CI fragility; base image is sufficient for this project

# Copy package files first to leverage Docker layer caching
COPY package.json package-lock.json* ./

# Install ALL dependencies deterministically for builds
# Allow legacy peer deps to accommodate framework peer ranges
RUN npm ci --legacy-peer-deps

# Copy all source code and configuration files
COPY . .

# Ensure optional static directory exists so runtime COPY does not fail
RUN mkdir -p public

# Build-time configuration
ARG NODE_ENV="production"
ENV NODE_ENV=${NODE_ENV}


# Build the application with secrets available for TypeScript compilation and build
# Secrets are mounted only during this step and not persisted to image layers
## Ensure repo .env files don't override CI-provided transient env during build
RUN rm -f .env .env.local .env.development .env.production || true

RUN --mount=type=secret,id=mongodb_uri,required=false \
    --mount=type=secret,id=payload_secret,required=false \
    --mount=type=secret,id=frontend_url,required=false \
    --mount=type=secret,id=s3_bucket,required=false \
    --mount=type=secret,id=public_projects_bucket,required=false \
    --mount=type=secret,id=nda_projects_bucket,required=false \
    --mount=type=secret,id=aws_region,required=false \
    --mount=type=secret,id=security_txt_expires,required=false \
    --mount=type=secret,id=ses_from_email,required=false \
    --mount=type=secret,id=ses_to_email,required=false \
    --mount=type=secret,id=smtp_from_email,required=false \
    --mount=type=secret,id=backend_internal_url,required=false \
    --mount=type=secret,id=public_server_url,required=false \
    --mount=type=secret,id=aws_access_key_id,required=false \
    --mount=type=secret,id=aws_secret_access_key,required=false \
    <<'EOF'
set -eu

# Ensure env-guard list is provided for prod builds; non-prod builds should still provide it
# via build args for parity with CI.

PROFILE="$(printf '%s' "${ENV_PROFILE:-prod}" | tr '[:upper:]' '[:lower:]')"

to_secret_key() {
    printf '%s' "$1" | tr '[:upper:]' '[:lower:]'
}

read_profile_secret() {
    profile="$1"
    var="$2"
    key="$(to_secret_key "$var")"
    canonical_path="/run/secrets/${key}"
    secret_path="/run/secrets/${profile}_${key}"
    if [ -f "$canonical_path" ]; then
        cat "$canonical_path"
        return
    fi
    if [ -f "$secret_path" ]; then
        cat "$secret_path"
    fi
}

read_shared_secret() {
    name="$1"
    secret_path="/run/secrets/$name"
    if [ -f "$secret_path" ]; then
        cat "$secret_path"
    fi
}

assign_if_present() {
    var="$1"
    value="$2"
    if [ -n "$value" ]; then
        export "$var=$value"
    fi
}

# Load profile-scoped secrets (MONGODB_URI, etc.) by iterating the variable list
COMMON_VARS="MONGODB_URI PAYLOAD_SECRET FRONTEND_URL S3_BUCKET PUBLIC_PROJECTS_BUCKET NDA_PROJECTS_BUCKET AWS_REGION SECURITY_TXT_EXPIRES SES_FROM_EMAIL SES_TO_EMAIL SMTP_FROM_EMAIL BACKEND_INTERNAL_URL PUBLIC_SERVER_URL"
for var in $COMMON_VARS; do
    assign_if_present "$var" "$(read_profile_secret "$PROFILE" "$var")"
done

# Load shared AWS credentials if present
assign_if_present AWS_ACCESS_KEY_ID "$(read_shared_secret aws_access_key_id)"
assign_if_present AWS_SECRET_ACCESS_KEY "$(read_shared_secret aws_secret_access_key)"

# Provide safe defaults for non-prod builds so static analysis succeeds without real secrets
if [ "$PROFILE" != "prod" ]; then
    : "${MONGODB_URI:=mongodb://localhost/${PROFILE}-dummy}"
    : "${PAYLOAD_SECRET:=dev-dummy-secret}"
    : "${FRONTEND_URL:=http://localhost:3000}"
    : "${S3_BUCKET:=dummy-bucket}"
    : "${AWS_REGION:=us-east-1}"
    : "${SES_FROM_EMAIL:=dummy@example.com}"
    : "${SES_TO_EMAIL:=dummy@example.com}"
    : "${SMTP_FROM_EMAIL:=$SES_FROM_EMAIL}"
    : "${BACKEND_INTERNAL_URL:=http://localhost:3000}"
    : "${PUBLIC_SERVER_URL:=${FRONTEND_URL}}"
    : "${PUBLIC_PROJECTS_BUCKET:=dummy-public-projects-bucket}"
    : "${NDA_PROJECTS_BUCKET:=dummy-nda-projects-bucket}"
    : "${SECURITY_TXT_EXPIRES:=2099-01-01T00:00:00.000Z}"
fi

require_var() {
    var="$1"
    eval "value=\${$var-}"
    if [ -z "$value" ]; then
        echo "Missing required $var for profile $PROFILE" >&2
        exit 1
    fi
}

if [ "$PROFILE" = "prod" ]; then
    for var in $COMMON_VARS; do
        if [ "$var" = "SES_FROM_EMAIL" ]; then
            if [ -z "${SES_FROM_EMAIL:-}" ] && [ -z "${SMTP_FROM_EMAIL:-}" ]; then
                echo "Missing required SES_FROM_EMAIL or SMTP_FROM_EMAIL for profile $PROFILE" >&2
                exit 1
            fi
            continue
        fi
        if [ "$var" = "SMTP_FROM_EMAIL" ]; then
            continue
        fi
        require_var "$var"
    done
fi

npm run build
EOF

# Normalize Next standalone entrypoint for distroless runtime
# Some Next.js versions emit server at .next/server/server.js; create a stable path
RUN if [ ! -f .next/standalone/server.js ]; then \
        if [ -f .next/server/server.js ]; then \
            mkdir -p .next/standalone && cp .next/server/server.js .next/standalone/server.js; \
        fi; \
    fi

# Create a stable bootstrap that starts Next from the available build output
RUN /bin/sh -lc 'printf "%s\n" \
    "const { spawnSync } = require(\"node:child_process\");" \
    "const fs = require(\"node:fs\");" \
    "function ensureImportMap() {" \
    "  try {" \
    "    const bin = require.resolve(\"payload/dist/bin.js\");" \
    "    const res = spawnSync(process.execPath, [bin, \"generate:importmap\"], { stdio: \"inherit\" });" \
    "    if (res.error) console.error(\"importmap generation error:\", res.error);" \
    "  } catch (e) {" \
    "    console.warn(\"payload importmap generation skipped:\", e && e.message ? e.message : e);" \
    "  }" \
    "}" \
    "ensureImportMap();" \
    "try {" \
    "  const p = \"/app/.payload/import-map.json\";" \
    "  if (fs.existsSync(p)) { console.info(\"[bootstrap] import-map present:\", p); }" \
    "  else { console.warn(\"[bootstrap] import-map missing at\", p); }" \
    "} catch(_){}" \
    "try {" \
    "  require(\"/app/app/server.js\");" \
    "} catch (e) {" \
    "  console.error(\"Failed to start Next.js from /app/app/server.js:\", e && e.message ? e.message : e);" \
    "  process.exit(1);" \
    "}" > /app/bootstrap.cjs'

# Remove development dependencies to reduce final image size
# Only production dependencies will remain for the runtime stage
RUN npm prune --omit=dev

#######################
# Runtime Stage
#######################
# Minimal production image containing only the compiled application and runtime dependencies
# Implements security best practices with non-root user execution
FROM gcr.io/distroless/nodejs22-debian12 AS runtime
# Recommendation: pin by digest for reproducibility (set via CI)
# e.g. FROM public.ecr.aws/docker/library/node:22-slim@sha256:<digest> AS runtime

# Set production environment to optimize application performance and disable debug features
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1

# Distroless already runs as a non-root user and has no package manager/shell.

# Set working directory with proper ownership
WORKDIR /app

# Copy only the standalone server and static assets produced by Next.js
COPY --from=builder /app/.next/standalone ./
# Place Next static assets inside the standalone app directory where server expects them
COPY --from=builder /app/.next/static ./app/.next/static
COPY --from=builder /app/.next/server ./app/.next/server
COPY --from=builder /app/public ./public
## Payload admin import map is written during build into source tree;
## Payload runtime expects to fs.read it. Include minimal path with file.
COPY --from=builder /app/src/app/(payload)/importMap.js ./src/app/(payload)/importMap.js
COPY --from=builder /app/src/payload.config.ts ./src/payload.config.ts


# .env files are already deleted in builder stage; avoid RUN in distroless (no shell)

# Expose port 3000 for the Payload CMS server
EXPOSE 3000

# Change working directory to the Next standalone bundle and start server
WORKDIR /app
COPY --from=builder /app/bootstrap.cjs ./bootstrap.cjs
CMD ["./bootstrap.cjs"]

#######################
# Development environment with auto-restart functionality and all development tools
# Used only for local development with docker-compose

# Use same Debian slim base for consistency across all stages and with frontend
FROM ${NODE_IMAGE} AS dev

# Install basic tooling needed only for development
# Basic tooling for development (curl)
RUN if command -v apk >/dev/null 2>&1; then \
            apk add --no-cache curl; \
        else \
            apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*; \
        fi

# Set working directory for development
WORKDIR /app

# Install system dependencies for development (same as builder stage)
# Required for native module compilation during development
# System deps for native modules in dev
RUN if command -v apk >/dev/null 2>&1; then \
            apk add --no-cache python3 make g++; \
        else \
            apt-get update && apt-get install -y --no-install-recommends python3 build-essential && rm -rf /var/lib/apt/lists/*; \
        fi

# Copy package files first to leverage Docker layer caching
COPY package.json package-lock.json* ./

# Install ALL dependencies including devDependencies
# Development stage needs TypeScript, testing tools, linters, etc.
# Allow legacy peer deps to accommodate Next 16 with @payloadcms/next peer range
RUN npm install --legacy-peer-deps --install-strategy=nested

# Install nodemon globally for automatic server restarts on file changes
# Essential for development workflow - automatically restarts server when code changes
RUN npm install -g nodemon

# Copy all source code
# In docker-compose, this will typically be mounted as a volume for live code updates
COPY . .

# Expose development server port
EXPOSE 3000

# Use nodemon to watch for file changes and automatically restart the development server
# Watches multiple directories and file types that affect the application
# --delay 2 prevents rapid restarts during batch file operations
CMD ["npx", "nodemon", "--exec", "npm run dev", "--watch", "src", "--watch", "payload.config.ts", "--watch", "collections", "--delay", "2"]
