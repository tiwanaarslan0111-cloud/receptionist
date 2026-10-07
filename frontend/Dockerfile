# ==============================================================================
# Multi-Stage Dockerfile for Next.js Static Export
# ==============================================================================

# Stage 1: Build the Next.js static bundle
FROM node:20-alpine AS builder

WORKDIR /app

# Accept API base URL build argument (baked into static files at build time)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Install dependencies using clean install
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# Stage 2: Serve using high-performance, lightweight Nginx
FROM nginx:alpine AS runner

# Replace default nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static HTML/JS/CSS assets
COPY --from=builder /app/out /usr/share/nginx/html

# Expose internal HTTP port
EXPOSE 80

# Healthcheck to verify Nginx is actively serving the app
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
