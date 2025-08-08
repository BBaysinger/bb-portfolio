# syntax=docker/dockerfile:1

###########
# Builder #
###########
# NOTE: Docker security scanner may flag vulnerability in node:22.12.0-alpine
# This is acceptable for a portfolio site - vulnerability will be patched in future releases
FROM node:22.12.0-alpine AS builder

# Set production environment for faster installs & smaller images
ENV NODE_ENV=production

# Set working directory for build stage
WORKDIR /app

# Copy package files first for better Docker layer caching
COPY package.json package-lock.json ./

# Install all dependencies (including dev deps needed for build)
RUN npm ci

# Copy source code and build the application
COPY . .
RUN npm run build

# Remove development dependencies to reduce final image size
RUN npm prune --omit=dev

############
# Runtime  #
############
# Use same base image for consistency
FROM node:22.12.0-alpine AS runtime

# Create a non-root user for security (alpine uses adduser instead of useradd)
RUN adduser -D -s /bin/sh appuser
# Switch to non-root user
USER appuser

# Set working directory for runtime
WORKDIR /app

# Copy package files with proper ownership
COPY --chown=appuser:appuser package.json package-lock.json ./

# Copy production dependencies from builder stage
COPY --from=builder --chown=appuser:appuser /app/node_modules ./node_modules

# Copy built application from builder stage
COPY --from=builder --chown=appuser:appuser /app/. ./

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
