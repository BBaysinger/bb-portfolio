# Use Node LTS for Payload compatibility
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and lockfile
COPY package.json package-lock.json ./

# Install dependencies with npm (clean install)
RUN npm ci

# Copy rest of the app
COPY . .

# Build the app
RUN npm run build

# Expose Payload's default port
EXPOSE 3000

# Start Payload CMS
CMD ["npm", "start"]