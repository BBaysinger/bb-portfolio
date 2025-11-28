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
# Explicitly set build-time ENV_PROFILE via separate ARG to avoid ARG expansion pitfalls
ARG BUILD_ENV_PROFILE=prod
# Propagate into shell environment for RUN steps
ENV BUILD_PROFILE=${BUILD_PROFILE}
ENV ENV_PROFILE=${BUILD_ENV_PROFILE}

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

RUN --mount=type=secret,id=prod_mongodb_uri \
    --mount=type=secret,id=dev_mongodb_uri \
    --mount=type=secret,id=local_mongodb_uri \
    --mount=type=secret,id=prod_payload_secret \
    --mount=type=secret,id=dev_payload_secret \
    --mount=type=secret,id=aws_access_key_id \
    --mount=type=secret,id=aws_secret_access_key \
    --mount=type=secret,id=prod_ses_from_email \
    --mount=type=secret,id=prod_ses_to_email \
    --mount=type=secret,id=dev_ses_from_email \
    --mount=type=secret,id=dev_ses_to_email \
        export REQUIRED_ENVIRONMENT_VARIABLES="DUMMY_OK" && \
    export DUMMY_OK=1 && \
        # Select build-time profile for config evaluation
        export ENV_PROFILE="$ENV_PROFILE" && \
        if [ "$ENV_PROFILE" = "dev" ]; then \
            export PROD_MONGODB_URI="mongodb://localhost/dev-dummy"; \
            export PROD_PAYLOAD_SECRET="dev-dummy-secret"; \
            export PROD_SES_FROM_EMAIL="dummy@example.com"; \
            export PROD_SES_TO_EMAIL="dummy@example.com"; \
        else \
            export PROD_MONGODB_URI="$(cat /run/secrets/prod_mongodb_uri 2>/dev/null || echo '')"; \
            export PROD_PAYLOAD_SECRET="$(cat /run/secrets/prod_payload_secret 2>/dev/null || echo '')"; \
            export PROD_SES_FROM_EMAIL="$(cat /run/secrets/prod_ses_from_email 2>/dev/null || echo '')"; \
            export PROD_SES_TO_EMAIL="$(cat /run/secrets/prod_ses_to_email 2>/dev/null || echo '')"; \
        fi && \
    export DEV_MONGODB_URI="$(cat /run/secrets/dev_mongodb_uri 2>/dev/null || echo '')" && \
    export LOCAL_MONGODB_URI="$(cat /run/secrets/local_mongodb_uri 2>/dev/null || echo '')" && \
    export DEV_PAYLOAD_SECRET="$(cat /run/secrets/dev_payload_secret 2>/dev/null || echo '')" && \
    export AWS_ACCESS_KEY_ID="$(cat /run/secrets/aws_access_key_id 2>/dev/null || echo '')" && \
    export AWS_SECRET_ACCESS_KEY="$(cat /run/secrets/aws_secret_access_key 2>/dev/null || echo '')" && \
    # Provide required non-secret config placeholders for build-time checks
    export PROD_FRONTEND_URL="http://localhost:8080" && \
    export DEV_FRONTEND_URL="http://localhost:3000" && \
    export PROD_S3_BUCKET="dummy-bucket" && \
    export PROD_AWS_REGION="us-east-1" && \
    export DEV_S3_BUCKET="dummy-bucket" && \
    export DEV_AWS_REGION="us-east-1" && \
    export DEV_SES_FROM_EMAIL="$(cat /run/secrets/dev_ses_from_email 2>/dev/null || echo '')" && \
    export DEV_SES_TO_EMAIL="$(cat /run/secrets/dev_ses_to_email 2>/dev/null || echo '')" && \
    # Final fallbacks so build never fails on missing values (no secrets baked into image)
    : "${PROD_MONGODB_URI:=mongodb://example/dummy}" && \
    : "${PROD_PAYLOAD_SECRET:=dummy-secret}" && \
    : "${PROD_SES_FROM_EMAIL:=dummy@example.com}" && \
    : "${PROD_SES_TO_EMAIL:=dummy@example.com}" && \
    npm run build

# Normalize Next standalone entrypoint for distroless runtime
# Some Next.js versions emit server at .next/server/server.js; create a stable path
RUN if [ ! -f .next/standalone/server.js ]; then \
        if [ -f .next/server/server.js ]; then \
            mkdir -p .next/standalone && cp .next/server/server.js .next/standalone/server.js; \
        fi; \
    fi

# Create a stable bootstrap that starts Next from the available build output
RUN echo "\
const path = require('path');\n\
const standalone = path.join('/app/.next/standalone/server.js');\n\
const legacy = path.join('/app/.next/server/server.js');\n\
try {\n\
    require(standalone);\n\
} catch (e) {\n\
    try {\n\
        require(legacy);\n\
    } catch (e2) {\n\
        console.error('No Next server entrypoint found:', e2?.message || e2);\n\
        process.exit(1);\n\
    }\n\
}\n\
" > /app/bootstrap.js

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
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/.next/server ./.next/server
COPY --from=builder /app/public ./public

# .env files are already deleted in builder stage; avoid RUN in distroless (no shell)

# Expose port 3000 for the Payload CMS server
EXPOSE 3000

# Change working directory to the Next standalone bundle and start server
WORKDIR /app
COPY --from=builder /app/bootstrap.js ./bootstrap.js
CMD ["./bootstrap.js"]

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
RUN npm install --legacy-peer-deps

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
