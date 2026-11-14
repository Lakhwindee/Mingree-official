# ==============================================================================
# MINGREE PRODUCTION DOCKERFILE
# Multi-stage build using Node.js >= 24.12.0 and Bun lockfile reproducibility
# Compatible with: Render, Railway, Fly.io, Cloud Run, AWS App Runner, CapRover
# ==============================================================================

FROM oven/bun:1-alpine AS bun-bin

# STAGE 1: Build Frontend and Server Bundles (Node.js >= 24.12.0)
FROM node:24-alpine AS builder

WORKDIR /app

COPY --from=bun-bin /usr/local/bin/bun /usr/local/bin/bun

# Enforce minimum Node.js 24.12.0 runtime compatibility
RUN node -e "const [maj,min]=process.versions.node.split('.').map(Number); if(maj<24||(maj===24&&min<12)){console.error('Requires Node >= 24.12.0, got',process.version);process.exit(1);}"

# Install dependencies
COPY package.json ./
RUN bun install

# Copy application source
COPY . .

# Build Vite SPA frontend and bundled backend (dist/server.cjs & server.js)
ENV NODE_ENV=production
RUN npm run build

# STAGE 2: Production Runtime (Node.js >= 24.12.0)
FROM node:24-alpine AS runner

WORKDIR /app

COPY --from=bun-bin /usr/local/bin/bun /usr/local/bin/bun

RUN node -e "const [maj,min]=process.versions.node.split('.').map(Number); if(maj<24||(maj===24&&min<12)){console.error('Requires Node >= 24.12.0, got',process.version);process.exit(1);}"

ENV NODE_ENV=production
ENV PORT=3000

# Install production-only dependencies, then remove build tooling
COPY package.json ./
RUN bun install --production && rm -f /usr/local/bin/bun

# Copy compiled bundles, database migrations, shared schema, and static runtime files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/public ./public
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/shared ./shared

# Non-root user for runtime hardening
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

CMD ["npm", "start"]
