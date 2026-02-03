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
# Prefer Debian Slim for Node builds unless Alpine is explicitly required
ARG NODE_IMAGE=node:22-slim
FROM ${NODE_IMAGE} AS builder

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
# Install dependencies deterministically for builds
RUN npm ci

# Copy all source code and configuration files
COPY . .

# Ensure optional static directory exists so runtime COPY does not fail
RUN mkdir -p public

# Build the application with transient env only (no config baked into layers)
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

read_secret() {
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

# Satisfy the required env guard transiently during build only.
export REQUIRED_ENVIRONMENT_VARIABLES_BACKEND="DUMMY_OK"
export DUMMY_OK=1

# Prefer secrets when provided; fall back to safe build-time defaults.
assign_if_present MONGODB_URI "$(read_secret mongodb_uri)"
assign_if_present PAYLOAD_SECRET "$(read_secret payload_secret)"
assign_if_present FRONTEND_URL "$(read_secret frontend_url)"
assign_if_present S3_BUCKET "$(read_secret s3_bucket)"
assign_if_present PUBLIC_PROJECTS_BUCKET "$(read_secret public_projects_bucket)"
assign_if_present NDA_PROJECTS_BUCKET "$(read_secret nda_projects_bucket)"
assign_if_present AWS_REGION "$(read_secret aws_region)"
assign_if_present SECURITY_TXT_EXPIRES "$(read_secret security_txt_expires)"
assign_if_present SES_FROM_EMAIL "$(read_secret ses_from_email)"
assign_if_present SES_TO_EMAIL "$(read_secret ses_to_email)"
assign_if_present SMTP_FROM_EMAIL "$(read_secret smtp_from_email)"
assign_if_present BACKEND_INTERNAL_URL "$(read_secret backend_internal_url)"
assign_if_present PUBLIC_SERVER_URL "$(read_secret public_server_url)"
assign_if_present AWS_ACCESS_KEY_ID "$(read_secret aws_access_key_id)"
assign_if_present AWS_SECRET_ACCESS_KEY "$(read_secret aws_secret_access_key)"

: "${MONGODB_URI:=mongodb://localhost/build-dummy}"
: "${PAYLOAD_SECRET:=build-dummy-secret}"
: "${FRONTEND_URL:=http://localhost:3000}"
: "${S3_BUCKET:=build-dummy-bucket}"
: "${PUBLIC_PROJECTS_BUCKET:=build-dummy-public-projects}"
: "${NDA_PROJECTS_BUCKET:=build-dummy-nda-projects}"
: "${AWS_REGION:=us-east-1}"
: "${SECURITY_TXT_EXPIRES:=2099-01-01T00:00:00.000Z}"
: "${SES_FROM_EMAIL:=build-dummy@example.com}"
: "${SES_TO_EMAIL:=build-dummy@example.com}"
: "${SMTP_FROM_EMAIL:=$SES_FROM_EMAIL}"
: "${BACKEND_INTERNAL_URL:=http://localhost:3000}"
: "${PUBLIC_SERVER_URL:=${FRONTEND_URL}}"

NODE_ENV=production npm run build
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

# Set production environment
ENV NODE_ENV=production

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
# Install dependencies for development
RUN npm install --install-strategy=nested

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
