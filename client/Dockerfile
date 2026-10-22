# syntax=docker/dockerfile:1

# ---- Stage 1: build the React app ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci --ignore-scripts -w client
COPY client client
RUN npm run build -w client

# ---- Stage 2: serve it with nginx (runs as a non-root user on port 8080) ----
FROM nginxinc/nginx-unprivileged:stable-alpine
# Where the API lives. Compose and Kubernetes both call it "api".
ENV API_UPSTREAM=http://api:6209
# nginx fills ${API_UPSTREAM} into this template when the container starts.
COPY client/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/client/dist /usr/share/nginx/html
EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1