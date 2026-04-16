FROM node:20-alpine AS builder

# Install git (required for cloning repos)
RUN apk add --no-cache git

WORKDIR /app

# Install all dependencies (including devDependencies for build)
COPY package*.json ./
RUN npm ci --ignore-scripts

# Copy source and build
COPY tsconfig*.json ./
COPY src/ ./src/
RUN npm run build --if-present || ./node_modules/.bin/tsc

# --- Production image ---
FROM node:20-alpine

RUN apk add --no-cache git

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY --from=builder /app/dist ./dist
COPY public/ ./public/

EXPOSE 3000

# Environment variables (set at runtime):
# PORT                       - Port to listen on (default: 3000)
# CHANGEGEN_API_KEY          - Static admin Bearer token
# LEMONSQUEEZY_API_KEY       - Lemon Squeezy API key
# LEMONSQUEEZY_SIGNING_SECRET - Lemon Squeezy webhook signing secret
# LEMONSQUEEZY_VARIANT_ID    - Lemon Squeezy variant ID for $9/month plan
# LEMONSQUEEZY_STORE_ID      - Lemon Squeezy store ID

CMD ["node", "dist/server.js"]
