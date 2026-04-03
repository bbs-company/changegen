FROM node:20-alpine

# Install git (required for cloning repos)
RUN apk add --no-cache git

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy pre-built dist (build before docker build, or add a build step)
COPY dist/ ./dist/

# Copy static assets
COPY public/ ./public/

# Expose default port
EXPOSE 3000

# Environment variables (set these at runtime)
# PORT                  - Port to listen on (default: 3000)
# CHANGEGEN_API_KEY     - Static admin Bearer token (if unset and no Stripe key, auth is disabled)
# STRIPE_SECRET_KEY     - Stripe secret key (enables /api/subscribe and /api/webhook)
# STRIPE_WEBHOOK_SECRET - Stripe webhook signing secret
# STRIPE_PRICE_ID       - Stripe Price ID for the $9/month subscription

CMD ["node", "dist/server.js"]
