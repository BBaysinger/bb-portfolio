# Frontend Dockerfile for Next.js Portfolio Application
# 
# REQUIREMENTS:
# - To use this Dockerfile, you must set `output: 'standalone'` in your next.config.mjs file
# - Based on official Next.js Docker example: https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile
#
# ARCHITECTURE:
# This is a multi-stage build that creates optimized production and development images:
# 1. base: Common foundation with system dependencies
# 2. deps: Installs Node.js dependencies 
# 3. builder: Compiles the Next.js application
# 4. runner: Minimal production runtime
# 5. dev: Development environment with hot reload

# SECURITY NOTE: 
# Using slim Debian instead of Alpine to reduce CVE noise in security scans.
# Node base images may report CRITICAL/HIGH CVEs in Debian/Alpine layers - this is 
# acceptable for this portfolio project as they are typically false positives.

# ==========================================
# Base Stage - Common Foundation
# ==========================================
# This stage provides the foundation for all other stages with necessary system dependencies
# Allow registry override per-environment; default to Docker Hub for dev/local
ARG NODE_IMAGE=node:22-slim
FROM ${NODE_IMAGE} AS base
WORKDIR /app


# ==========================================
# Dependencies Stage - Package Installation
# ==========================================
# This stage installs Node.js dependencies with package manager auto-detection
# Separated for better Docker layer caching – dependencies change less frequently than source code
FROM base AS deps

# Copy package files first (enables Docker layer caching optimization)
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./

# Auto-detect package manager and install dependencies with frozen lockfiles
# Ensures reproducible builds and prevents dependency drift
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# ==========================================
# Builder Stage - Application Compilation
# ==========================================
# This stage builds the Next.js application for production
# Includes all source code and dependencies needed for compilation
FROM base AS builder

# Copy installed dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy all source code
COPY . .

## Build-time configuration (builder-only): accept build args and expose as env for prebuild checks
# Profile and required envs definition
ARG ENV_PROFILE=""
ARG REQUIRED_ENVIRONMENT_VARIABLES=""
ARG PROD_REQUIRED_ENVIRONMENT_VARIABLES=""
ARG DEV_REQUIRED_ENVIRONMENT_VARIABLES=""
# Frontend-required variables (filtered by prebuild guard)
ARG PROD_BACKEND_INTERNAL_URL=""
ARG DEV_BACKEND_INTERNAL_URL=""
ARG PUBLIC_PROJECTS_BUCKET=""
ARG NDA_PROJECTS_BUCKET=""

# Make them available to the build step (builder-only; not persisted to runtime image)
ENV ENV_PROFILE=${ENV_PROFILE} \
  REQUIRED_ENVIRONMENT_VARIABLES=${REQUIRED_ENVIRONMENT_VARIABLES} \
  PROD_REQUIRED_ENVIRONMENT_VARIABLES=${PROD_REQUIRED_ENVIRONMENT_VARIABLES} \
  DEV_REQUIRED_ENVIRONMENT_VARIABLES=${DEV_REQUIRED_ENVIRONMENT_VARIABLES} \
  PROD_BACKEND_INTERNAL_URL=${PROD_BACKEND_INTERNAL_URL} \
  DEV_BACKEND_INTERNAL_URL=${DEV_BACKEND_INTERNAL_URL} \
  PUBLIC_PROJECTS_BUCKET=${PUBLIC_PROJECTS_BUCKET} \
  NDA_PROJECTS_BUCKET=${NDA_PROJECTS_BUCKET}

# Ensure repo .env files don't override CI-provided variables during production builds
RUN rm -f .env .env.local .env.development .env.production || true

# Build the Next.js application with the detected package manager
# Creates optimized production bundle in .next directory
RUN \
  export REQUIRED_ENVIRONMENT_VARIABLES="${REQUIRED_ENVIRONMENT_VARIABLES:-DEV_BACKEND_INTERNAL_URL}" && \
  if [ -f yarn.lock ]; then yarn run build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm run build; \
  else echo "Lockfile not found." && exit 1; \
  fi

# ==========================================
# Runner Stage - Production Runtime
# ==========================================
# Minimal production image containing only the compiled application and runtime dependencies
# Uses slim Node.js image for smaller footprint and better security
FROM ${NODE_IMAGE} AS runner

WORKDIR /app

# Set production environment to optimize Next.js runtime behavior
ENV NODE_ENV=production

# Create non-root user and group for security best practices
# Prevents potential privilege escalation attacks
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Copy static assets (public directory) from builder
COPY --from=builder /app/public ./public

# Create .next directory and set proper ownership for nextjs user
RUN mkdir .next && chown nextjs:nodejs .next

# Copy the standalone build from the builder stage (standard Next.js pattern)
# This should put server.js directly in the root according to Next.js conventions
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Copy static assets generated during build (CSS, JS, images)
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

## No runtime .env written in image; env comes from deployment (Compose/EC2)

# Switch to non-root user for security
USER nextjs

# Expose port 3000 for the Next.js server
EXPOSE 3000

# Configure server networking
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the Next.js production server
CMD ["node", "server.js"]

# ==========================================
# Development Stage - Hot Reload Environment
# ==========================================
# This stage is used only for local development with docker-compose
# Provides hot reload functionality and development tools
FROM base AS dev

WORKDIR /app

# Copy package files for dependency installation
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./

# Install ALL dependencies including devDependencies
# --legacy-peer-deps flag resolves potential peer dependency conflicts
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm install --legacy-peer-deps; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm install; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Copy all source code (will be mounted as volume in docker-compose for live updates)
COPY . .

# Expose development server port
EXPOSE 3000

# Start Next.js development server with hot reload
CMD ["npm", "run", "dev"]
