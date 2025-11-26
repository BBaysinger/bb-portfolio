# Multi-stage Dockerfile for frontend (dev and prod)

FROM node:22-alpine3.20 AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk upgrade --no-cache && apk add --no-cache libc6-compat

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS dev
ENV NODE_ENV=development
COPY --from=deps /app/node_modules /app/node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

FROM base AS builder
ENV NODE_ENV=production
COPY --from=deps /app/node_modules /app/node_modules
COPY . .
RUN npm run build:webpack

# Distroless production runtime to reduce CVEs
FROM gcr.io/distroless/nodejs:22 AS prod
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Copy Next standalone server output and static assets
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
# Start the Next standalone server
CMD ["node","server.js"]
