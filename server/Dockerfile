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
ARG GIT_SHA=dev
ENV NODE_ENV=production \
    GIT_SHA=$GIT_SHA
LABEL org.opencontainers.image.revision=$GIT_SHA
# Remove tools we never run. npm, corepack and yarn ship inside the Node image and
# bundle many small packages that scanners flag. Also pull in fixed Alpine packages.
RUN apk upgrade --no-cache \
 && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
           /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
           /usr/local/bin/yarn /usr/local/bin/yarnpkg /opt/yarn-*

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