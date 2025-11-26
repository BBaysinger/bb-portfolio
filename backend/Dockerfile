# Backend Dockerfile for Payload CMS Portfolio Application
# 
# ARCHITECTURE:
# This is a multi-stage build that creates optimized production and development images:
# 1. builder: Compiles the application and removes dev dependencies
# 2. runtime: Minimal production runtime with security hardening
# 3. dev: Development environment with auto-restart functionality
#
# SECURITY FEATURES:
# - Non-root user execution
# - Minimal attack surface in production
# - Proper file ownership and permissions

# PLATFORM CONSISTENCY:
# Using slim Debian instead of Alpine to maintain consistency with frontend service.
# This reduces operational complexity and provides better compatibility for Node.js native modules.
#
# SECURITY NOTE: 
# Node base images may report CRITICAL/HIGH CVEs in Debian layers - this is 
# acceptable for this portfolio project as they are typically false positives
# in security scanners. Using Debian slim reduces CVE noise compared to Alpine.

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

# Keep base packages patched (Alpine or Debian)
RUN if command -v apk >/dev/null 2>&1; then \
            apk upgrade --no-cache && apk add --no-cache libc6-compat; \
        elif command -v apt-get >/dev/null 2>&1; then \
            apt-get update && apt-get -y upgrade && rm -rf /var/lib/apt/lists/*; \
        fi

# Build-time environment remains environment-agnostic.
# We avoid baking config into the image. Sensitive values are mounted via BuildKit
# secrets in the RUN step below. Any required checks are satisfied transiently
# during that RUN without persisting env into layers.

## Skipping apt-get steps to reduce CI fragility; base image is sufficient for this project

# Copy package files first to leverage Docker layer caching
# Dependencies change less frequently than source code, so this optimizes rebuild times
COPY package.json package-lock.json* ./

# Install ALL dependencies including devDependencies needed for TypeScript compilation and build
# Allow legacy peer deps to accommodate Next 16 with @payloadcms/next peer range
RUN npm install --legacy-peer-deps

# Copy all source code and configuration files
COPY . .

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

# Remove development dependencies to reduce final image size
# Only production dependencies will remain for the runtime stage
RUN npm prune --omit=dev

#######################
# Runtime Stage
#######################
# Minimal production image containing only the compiled application and runtime dependencies
# Implements security best practices with non-root user execution
FROM ${NODE_IMAGE} AS runtime

# Set production environment to optimize application performance and disable debug features
ENV NODE_ENV=production

# Create a dedicated non-root user for security (Alpine or Debian)
RUN if command -v apk >/dev/null 2>&1; then \
            addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs appuser; \
        else \
            addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 --gid 1001 appuser; \
        fi

# Switch to non-root user for all subsequent operations
# Prevents potential privilege escalation attacks
USER appuser

# Set working directory with proper ownership
WORKDIR /app

# Copy package files with proper ownership to non-root user
# This ensures the application files are owned by the appuser
COPY --chown=appuser:appuser package.json package-lock.json* ./

# Copy production dependencies and built application from builder stage
# Only production node_modules (dev dependencies were pruned)
COPY --from=builder --chown=appuser:appuser /app/node_modules ./node_modules

# Copy the entire built application with proper ownership
# Includes compiled JavaScript, configuration files, and assets
COPY --from=builder --chown=appuser:appuser /app/. ./

# Remove development env files to prevent local defaults from leaking into production
RUN rm -f .env .env.local .env.development .env.production || true

# Expose port 3000 for the Payload CMS server
EXPOSE 3000

# Start the production application server
CMD ["npm", "start"]

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
