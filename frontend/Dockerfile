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

# Accept build-time configuration for environment profile and prefixed backend URLs
# so Next.js can bake correct rewrites and server-side fetch base.
ARG ENV_PROFILE
ARG DEV_BACKEND_INTERNAL_URL
ARG PROD_BACKEND_INTERNAL_URL
ARG DEV_NEXT_PUBLIC_BACKEND_URL
ARG PROD_NEXT_PUBLIC_BACKEND_URL
ARG PUBLIC_PROJECTS_BUCKET
ARG NDA_PROJECTS_BUCKET
ARG DEV_REQUIRED_ENVIRONMENT_VARIABLES
ARG PROD_REQUIRED_ENVIRONMENT_VARIABLES
ARG SECURITY_CONTACT_EMAIL
ARG SECURITY_TXT_EXPIRES
ARG DEV_MONGODB_URI
ARG DEV_PAYLOAD_SECRET
ARG DEV_FRONTEND_URL
ARG DEV_S3_BUCKET
ARG DEV_AWS_REGION
ARG AWS_ACCESS_KEY_ID
ARG AWS_SECRET_ACCESS_KEY
ARG DEV_SES_FROM_EMAIL
ARG DEV_SES_TO_EMAIL
ARG PROD_MONGODB_URI
ARG PROD_PAYLOAD_SECRET
ARG PROD_FRONTEND_URL
ARG PROD_S3_BUCKET
ARG PROD_AWS_REGION
ARG PROD_SES_FROM_EMAIL
ARG PROD_SES_TO_EMAIL

# Set environment variables with prefixes (these are available for your app logic)
ENV ENV_PROFILE=${ENV_PROFILE}
ENV DEV_BACKEND_INTERNAL_URL=${DEV_BACKEND_INTERNAL_URL}
ENV PROD_BACKEND_INTERNAL_URL=${PROD_BACKEND_INTERNAL_URL}
ENV DEV_NEXT_PUBLIC_BACKEND_URL=${DEV_NEXT_PUBLIC_BACKEND_URL}
ENV PROD_NEXT_PUBLIC_BACKEND_URL=${PROD_NEXT_PUBLIC_BACKEND_URL}
ENV PUBLIC_PROJECTS_BUCKET=${PUBLIC_PROJECTS_BUCKET}
ENV NDA_PROJECTS_BUCKET=${NDA_PROJECTS_BUCKET}
ENV DEV_REQUIRED_ENVIRONMENT_VARIABLES=${DEV_REQUIRED_ENVIRONMENT_VARIABLES}
ENV PROD_REQUIRED_ENVIRONMENT_VARIABLES=${PROD_REQUIRED_ENVIRONMENT_VARIABLES}
ENV SECURITY_CONTACT_EMAIL=${SECURITY_CONTACT_EMAIL}
ENV SECURITY_TXT_EXPIRES=${SECURITY_TXT_EXPIRES}
ENV DEV_MONGODB_URI=${DEV_MONGODB_URI}
ENV DEV_PAYLOAD_SECRET=${DEV_PAYLOAD_SECRET}
ENV DEV_FRONTEND_URL=${DEV_FRONTEND_URL}
ENV DEV_S3_BUCKET=${DEV_S3_BUCKET}
ENV DEV_AWS_REGION=${DEV_AWS_REGION}
ENV AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
ENV AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
ENV DEV_SES_FROM_EMAIL=${DEV_SES_FROM_EMAIL}
ENV DEV_SES_TO_EMAIL=${DEV_SES_TO_EMAIL}
ENV PROD_MONGODB_URI=${PROD_MONGODB_URI}
ENV PROD_PAYLOAD_SECRET=${PROD_PAYLOAD_SECRET}
ENV PROD_FRONTEND_URL=${PROD_FRONTEND_URL}
ENV PROD_S3_BUCKET=${PROD_S3_BUCKET}
ENV PROD_AWS_REGION=${PROD_AWS_REGION}
ENV PROD_SES_FROM_EMAIL=${PROD_SES_FROM_EMAIL}
ENV PROD_SES_TO_EMAIL=${PROD_SES_TO_EMAIL}

# STRICT PREFIXED ENVIRONMENT VARIABLES - NO FALLBACKS
# This project uses explicit environment-specific prefixed variables only.
# Fail fast if the correct prefixed variables aren't provided for the target environment.
# 
# For ENV_PROFILE=prod: Requires PROD_BACKEND_INTERNAL_URL and PROD_NEXT_PUBLIC_BACKEND_URL
# For ENV_PROFILE=dev:  Requires DEV_BACKEND_INTERNAL_URL and DEV_NEXT_PUBLIC_BACKEND_URL
#
# The prefixed versions are already set above from ARG -> ENV, but we ensure they're explicit:
ENV PROD_BACKEND_INTERNAL_URL=${PROD_BACKEND_INTERNAL_URL}
ENV PROD_NEXT_PUBLIC_BACKEND_URL=${PROD_NEXT_PUBLIC_BACKEND_URL}
ENV DEV_BACKEND_INTERNAL_URL=${DEV_BACKEND_INTERNAL_URL}
ENV DEV_NEXT_PUBLIC_BACKEND_URL=${DEV_NEXT_PUBLIC_BACKEND_URL}

# Validate that required variables are set for the target environment profile
# Note: NEXT_PUBLIC_BACKEND_URL can be empty (client uses relative URLs with Next.js rewrites)
RUN if [ "$ENV_PROFILE" = "prod" ]; then \
        if [ -z "$PROD_BACKEND_INTERNAL_URL" ]; then \
            echo "❌ ERROR: ENV_PROFILE=prod requires PROD_BACKEND_INTERNAL_URL for Next.js rewrites"; \
            echo "   PROD_BACKEND_INTERNAL_URL: '$PROD_BACKEND_INTERNAL_URL'"; \
            echo "   PROD_NEXT_PUBLIC_BACKEND_URL: '$PROD_NEXT_PUBLIC_BACKEND_URL' (can be empty for relative URLs)"; \
            exit 1; \
        fi; \
    elif [ "$ENV_PROFILE" = "dev" ]; then \
        if [ -z "$DEV_BACKEND_INTERNAL_URL" ]; then \
            echo "❌ ERROR: ENV_PROFILE=dev requires DEV_BACKEND_INTERNAL_URL for Next.js rewrites"; \
            echo "   DEV_BACKEND_INTERNAL_URL: '$DEV_BACKEND_INTERNAL_URL'"; \
            echo "   DEV_NEXT_PUBLIC_BACKEND_URL: '$DEV_NEXT_PUBLIC_BACKEND_URL' (can be empty for relative URLs)"; \
            exit 1; \
        fi; \
    else \
        echo "❌ ERROR: ENV_PROFILE must be 'prod' or 'dev', got: '$ENV_PROFILE'"; \
        exit 1; \
    fi && \
    echo "✅ Environment validation passed for ENV_PROFILE=$ENV_PROFILE"

# Debug: Show strict prefixed environment variables before build
RUN echo "=== DOCKER BUILD DEBUG (STRICT PREFIXED VARS) ===" && \
    echo "ENV_PROFILE: $ENV_PROFILE" && \
    echo "🎯 PRODUCTION VARIABLES:" && \
    echo "  PROD_BACKEND_INTERNAL_URL: $PROD_BACKEND_INTERNAL_URL" && \
    echo "  PROD_NEXT_PUBLIC_BACKEND_URL: $PROD_NEXT_PUBLIC_BACKEND_URL" && \
    echo "🎯 DEVELOPMENT VARIABLES:" && \
    echo "  DEV_BACKEND_INTERNAL_URL: $DEV_BACKEND_INTERNAL_URL" && \
    echo "  DEV_NEXT_PUBLIC_BACKEND_URL: $DEV_NEXT_PUBLIC_BACKEND_URL" && \
    echo "🚫 NO FALLBACK VARIABLES - Prefixed vars only!" && \
    echo "Available env vars:" && \
    env | grep -E "(BACKEND|NEXT_PUBLIC|ENV_PROFILE)" | sort && \
    echo "=== END DEBUG ==="

# Build the Next.js application with the detected package manager
# Creates optimized production bundle in .next directory
RUN \
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

# Runtime environment variables for production
# These must be available at runtime for the Next.js server
ARG ENV_PROFILE
ARG DEV_BACKEND_INTERNAL_URL
ARG PROD_BACKEND_INTERNAL_URL
ARG DEV_NEXT_PUBLIC_BACKEND_URL
ARG PROD_NEXT_PUBLIC_BACKEND_URL
ARG PUBLIC_PROJECTS_BUCKET
ARG NDA_PROJECTS_BUCKET
ENV ENV_PROFILE=${ENV_PROFILE}
ENV DEV_BACKEND_INTERNAL_URL=${DEV_BACKEND_INTERNAL_URL}
ENV PROD_BACKEND_INTERNAL_URL=${PROD_BACKEND_INTERNAL_URL}
ENV DEV_NEXT_PUBLIC_BACKEND_URL=${DEV_NEXT_PUBLIC_BACKEND_URL}
ENV PROD_NEXT_PUBLIC_BACKEND_URL=${PROD_NEXT_PUBLIC_BACKEND_URL}
ENV PUBLIC_PROJECTS_BUCKET=${PUBLIC_PROJECTS_BUCKET}
ENV NDA_PROJECTS_BUCKET=${NDA_PROJECTS_BUCKET}

# Write env file so Next.js server has runtime access to environment variables
# This ensures process.env can access these variables during SSR execution
# Must be done as root before switching to nextjs user
RUN echo "ENV_PROFILE=${ENV_PROFILE}" > /app/.env.production.local && \
    echo "PROD_BACKEND_INTERNAL_URL=${PROD_BACKEND_INTERNAL_URL}" >> /app/.env.production.local && \
    echo "PROD_NEXT_PUBLIC_BACKEND_URL=${PROD_NEXT_PUBLIC_BACKEND_URL}" >> /app/.env.production.local && \
    echo "DEV_BACKEND_INTERNAL_URL=${DEV_BACKEND_INTERNAL_URL}" >> /app/.env.production.local && \
    echo "DEV_NEXT_PUBLIC_BACKEND_URL=${DEV_NEXT_PUBLIC_BACKEND_URL}" >> /app/.env.production.local && \
    echo "PUBLIC_PROJECTS_BUCKET=${PUBLIC_PROJECTS_BUCKET}" >> /app/.env.production.local && \
    echo "NDA_PROJECTS_BUCKET=${NDA_PROJECTS_BUCKET}" >> /app/.env.production.local && \
    chown nextjs:nodejs /app/.env.production.local && \
    echo "Runtime .env.production.local created with:" && \
    cat /app/.env.production.local

ENV NEXT_PUBLIC_BACKEND_URL=${PROD_NEXT_PUBLIC_BACKEND_URL}

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
