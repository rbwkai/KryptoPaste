# syntax=docker/dockerfile:1

# ---- Stage 1: install only the production dependencies of the API ----
FROM node:22-alpine AS deps
WORKDIR /app
# Copy the package files first: Docker caches this layer, so dependencies
# are only reinstalled when these files change, not on every code edit.
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci --omit=dev --ignore-scripts -w server

# ---- Stage 2: the small final image ----
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules node_modules
COPY server/package.json server/
COPY server/src server/src

WORKDIR /app/server
USER node
EXPOSE 6209

# Liveness only (not DB readiness), so a database hiccup does not kill the container.
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||6209)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/index.js"]