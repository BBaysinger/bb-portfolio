# Use Node LTS for Payload compatibility
FROM node:20-alpine

# Set working dir
WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy code
COPY . .

# Build TypeScript
RUN pnpm build

# Expose Payload's port
EXPOSE 3000

# Start Payload server
CMD ["pnpm", "start"]
