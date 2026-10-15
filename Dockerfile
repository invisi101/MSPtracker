# ---- build stage ----
FROM node:22-slim AS build
WORKDIR /app

# Build tools for native modules (better-sqlite3)
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
# ci (not install) so the build matches package-lock.json exactly and can't drift.
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

# ---- runtime stage ----
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
# adapter-node defaults to 512K, which rejects any phone photo (HTTP 413).
ENV BODY_SIZE_LIMIT=20M

COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json

RUN mkdir -p /app/data
EXPOSE 3000

# Without this Docker only knows whether the process exists, not whether it still serves.
# /health touches the DB, so a wedged SQLite handle shows up as unhealthy too.
HEALTHCHECK --interval=60s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "build"]
