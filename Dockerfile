# syntax=docker/dockerfile:1

# Build stage: needs dev dependencies (vite, esbuild, typescript).
FROM node:20-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Runtime stage: production dependencies only. On a 1 GB e2-micro every megabyte of
# resident memory is shared with Postgres, so dev dependencies do not come along.
FROM node:20-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# The built SPA and both server entry points.
COPY --from=build /app/dist ./dist
# The migrator reads these at runtime; they are plain .sql and worth having in the image
# so a deploy can always migrate to exactly the schema the code expects.
COPY --from=build /app/server/db/migrations ./server/db/migrations

USER node
EXPOSE 3000

# No HEALTHCHECK here: compose defines it, so it can be tuned without a rebuild.
CMD ["node", "dist/server.cjs"]
