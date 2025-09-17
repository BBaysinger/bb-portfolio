# To use this Dockerfile, you have to set `output: 'standalone'` in your next.config.mjs file.
# From https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile

# Use slim Debian instead of Alpine to reduce CVE noise
# Suppressing scanner warning:
# Node base images may report CRITICAL/HIGH CVEs in Debian/Alpine layers.
# Acceptable for this project.
FROM node:22-slim AS base

# Install dependencies only when needed
FROM base AS deps
# Install packages required for native builds (like sharp) but don't bloat final image
RUN apt-get update && apt-get install -y --no-install-recommends \
    libc6 \
    libstdc++6 \
    python3 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
# Copy installed dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
# Copy all source files
COPY . .

# Build the application using the detected package manager
RUN \
  if [ -f yarn.lock ]; then yarn run build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm run build; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Production image, copy all the files and run next
# Suppressing scanner warning:
# Node base images may report CRITICAL/HIGH CVEs in Debian/Alpine layers.
# Acceptable for this project.
FROM node:22-slim AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Create system group and user for security (non-root)
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Copy public assets from builder stage
COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next && chown nextjs:nodejs .next

# Copy the standalone build output and static assets
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user for security
USER nextjs

# Expose the port the app runs on
EXPOSE 3000

# Set runtime environment variables
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# server.js is created by next build from the standalone output
CMD ["node", "server.js"]
