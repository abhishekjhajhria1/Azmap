# The relay, hostable anywhere that runs a container.
#
# Node 22 because the relay uses `node:sqlite`, which landed as an experimental
# builtin in 22.5 and does not exist in 20. Pinned to a minor rather than
# `:latest` — an experimental API moving under a running service is exactly the
# kind of surprise a sync backend must not have.
FROM node:22.12-bookworm-slim AS build

WORKDIR /app
RUN corepack enable

# Manifests first, so a code change doesn't re-download the dependency tree.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/core/package.json packages/core/
COPY apps/server/package.json apps/server/
RUN pnpm install --frozen-lockfile --filter @abh/server...

COPY packages/core packages/core
COPY apps/server apps/server
RUN pnpm --filter @abh/server build

# --- runtime ---------------------------------------------------------------
FROM node:22.12-bookworm-slim

# Non-root. The relay holds other people's data — encrypted, but a container
# breakout that lands as root is still a bad day.
RUN useradd --system --create-home --uid 10001 relay
WORKDIR /app

COPY --from=build --chown=relay:relay /app/node_modules ./node_modules
COPY --from=build --chown=relay:relay /app/apps/server ./apps/server
COPY --from=build --chown=relay:relay /app/packages/core ./packages/core

# The database is the one piece of state. Mount a volume here or the log dies
# with the container, and every device silently re-uploads its whole map.
ENV ABH_DB=/data/abh.sqlite
RUN mkdir -p /data && chown relay:relay /data
VOLUME /data

USER relay
ENV NODE_ENV=production PORT=8080
EXPOSE 8080

# Hits the real route, so a container that boots but can't serve is marked
# unhealthy rather than "running".
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8080/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "apps/server/dist/main.js"]
