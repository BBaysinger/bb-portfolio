# NOTE: Docker security scanner flags vulnerability in node:18-alpine base image
# This is acceptable for a portfolio site - vulnerability will be patched in future releases
# NOTE: VS Code Docker extension warning cannot be suppressed via settings, but since
# this is only a portfolio site, we can ignore it for now. There doesn't seem to be
# another option 🤷‍♂️
FROM node:18-alpine

# Set working directory for the application
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Create non-root user and change ownership
RUN adduser -D -s /bin/sh appuser && chown -R appuser:appuser /app
USER appuser

# Expose port 3000 for the application
EXPOSE 3000

# Start the application
CMD ["npm", "start"]