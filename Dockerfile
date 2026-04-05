FROM node:22-bookworm-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    python3 python3-pip make g++ git curl sudo \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# -----------------------------------------------------------------------------
# Builder stage: install deps and build all packages
# -----------------------------------------------------------------------------
FROM base AS builder

COPY package.json package-lock.json turbo.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/daemon/package.json ./packages/daemon/
COPY packages/mcp-server/package.json ./packages/mcp-server/
COPY packages/web/package.json ./packages/web/

RUN npm ci --ignore-scripts

COPY packages ./packages
RUN npm rebuild better-sqlite3 node-pty
RUN npx turbo build --filter=@aios/daemon --filter=@aios/mcp-server

# -----------------------------------------------------------------------------
# Runtime stage: minimal image with only what's needed to run the daemon
# -----------------------------------------------------------------------------
FROM base AS runtime

ENV NODE_ENV=production
ENV AIOS_DB_PATH=/data/aios.db
ENV AIOS_LOG_DIR=/data/logs
ENV HOST=0.0.0.0
ENV PORT=3101

# Install Claude Code CLI globally
RUN npm install -g @anthropic-ai/claude-code

# Create non-root user
RUN useradd -m -s /bin/bash aios \
  && mkdir -p /data/logs \
  && chown -R aios:aios /data

WORKDIR /app
COPY --from=builder --chown=aios:aios /app/node_modules ./node_modules
COPY --from=builder --chown=aios:aios /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=aios:aios /app/packages/shared/package.json ./packages/shared/
COPY --from=builder --chown=aios:aios /app/packages/daemon/dist ./packages/daemon/dist
COPY --from=builder --chown=aios:aios /app/packages/daemon/package.json ./packages/daemon/
COPY --from=builder --chown=aios:aios /app/package.json ./

USER aios
VOLUME ["/data"]
EXPOSE 3101

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -sf http://localhost:3101/api/health || exit 1

CMD ["node", "packages/daemon/dist/index.js"]
