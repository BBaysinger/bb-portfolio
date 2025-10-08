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

# Using node:22-slim for consistency with frontend and better native module compatibility
FROM node:22-slim AS builder

# Upgrade system packages to mitigate known vulnerabilities
RUN apt-get update && apt-get upgrade -y && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# IMPORTANT: Don't set NODE_ENV=production here because we need dev dependencies for the build process
# TypeScript compilation, bundling tools, and other build-time dependencies require devDependencies
# ENV NODE_ENV=production

# Set working directory for all subsequent commands
WORKDIR /app

# Provide build-time environment to satisfy strict env checks in configuration
# These values are used only during the build and are not persisted to the runtime image
ARG ENV_PROFILE=prod
ARG PROD_MONGODB_URI
ARG DEV_MONGODB_URI
ARG LOCAL_MONGODB_URI
ARG PROD_PAYLOAD_SECRET
ARG PROD_FRONTEND_URL
ARG PROD_S3_BUCKET
ARG PROD_AWS_REGION
ARG DEV_AWS_REGION
ARG S3_AWS_ACCESS_KEY_ID
ARG S3_AWS_SECRET_ACCESS_KEY
ENV ENV_PROFILE=${ENV_PROFILE}
ENV PROD_MONGODB_URI=${PROD_MONGODB_URI}
ENV DEV_MONGODB_URI=${DEV_MONGODB_URI}
ENV LOCAL_MONGODB_URI=${LOCAL_MONGODB_URI}
ENV PROD_PAYLOAD_SECRET=${PROD_PAYLOAD_SECRET}
ENV PROD_FRONTEND_URL=${PROD_FRONTEND_URL}
ENV PROD_S3_BUCKET=${PROD_S3_BUCKET}
ENV PROD_AWS_REGION=${PROD_AWS_REGION}
ENV DEV_AWS_REGION=${DEV_AWS_REGION}
ENV S3_AWS_ACCESS_KEY_ID=${S3_AWS_ACCESS_KEY_ID}
ENV S3_AWS_SECRET_ACCESS_KEY=${S3_AWS_SECRET_ACCESS_KEY}

# Install system dependencies required for native Node.js modules compilation
# Similar to frontend setup but focused on backend needs
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy package files first to leverage Docker layer caching
# Dependencies change less frequently than source code, so this optimizes rebuild times
COPY package.json package-lock.json* ./

# Install ALL dependencies including devDependencies needed for TypeScript compilation and build
RUN npm install

# Copy all source code and configuration files
COPY . .

# Build the application (TypeScript compilation, asset bundling, etc.)
RUN npm run build

# Remove development dependencies to reduce final image size
# Only production dependencies will remain for the runtime stage
RUN npm prune --omit=dev

#######################
# Runtime Stage
#######################
# Minimal production image containing only the compiled application and runtime dependencies
# Implements security best practices with non-root user execution
FROM node:22-slim AS runtime

# Upgrade system packages to mitigate known vulnerabilities
RUN apt-get update && apt-get upgrade -y && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Set production environment to optimize application performance and disable debug features
ENV NODE_ENV=production

# Create a dedicated non-root user for security
# Debian uses 'adduser' with different syntax than Alpine
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 --gid 1001 appuser

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

# Expose port 3000 for the Payload CMS server
EXPOSE 3000

# Start the production application server
CMD ["npm", "start"]

#######################
# Development environment with auto-restart functionality and all development tools
# Used only for local development with docker-compose

# Use same Debian slim base for consistency across all stages and with frontend
FROM node:22-slim AS dev

# Upgrade system packages to mitigate known vulnerabilities
RUN apt-get update && apt-get upgrade -y && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Set working directory for development
WORKDIR /app

# Install system dependencies for development (same as builder stage)
# Required for native module compilation during development
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy package files first to leverage Docker layer caching
COPY package.json package-lock.json* ./

# Install ALL dependencies including devDependencies
# Development stage needs TypeScript, testing tools, linters, etc.
RUN npm install

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
