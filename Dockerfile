# ==============================================================================
# MINGREE PRODUCTION DOCKERFILE
# Multi-stage build for ultra-lean, secure production deployment
# Compatible with: Render, Railway, Fly.io, Cloud Run, AWS App Runner, CapRover
# ==============================================================================

# STAGE 1: Build Frontend and Server Bundles
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy source code
COPY . .

# Build Vite SPA frontend and bundled backend
ENV NODE_ENV=production
RUN npm run build

# STAGE 2: Production Runtime
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# Copy compiled bundles and migration SQL from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/public ./public
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/shared ./shared

# Non-root user for security
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

CMD ["npm", "start"]
