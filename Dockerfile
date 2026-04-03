FROM node:20-alpine

# Install git (required for cloning repos)
RUN apk add --no-cache git

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy pre-built dist (build before docker build, or add a build step)
COPY dist/ ./dist/

# Expose default port
EXPOSE 3000

# Environment variables (set these at runtime)
# PORT          - Port to listen on (default: 3000)
# CHANGEGEN_API_KEY - Bearer token required on API requests (if unset, auth is disabled)

CMD ["node", "dist/server.js"]
