########################################
# DOCKER HUB IMAGE: chbornman/likert-or-not-frontend
# VERSION: Check frontend/package.json for current version
# LATEST TAG: chbornman/likert-or-not-frontend:latest
########################################

# Frontend Dockerfile for production
FROM oven/bun:1 AS frontend-builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./
RUN bun install

# Copy source files
COPY . .

# Build arguments for environment variables
ARG VITE_API_URL=/api

# Build the application
ENV VITE_API_URL=${VITE_API_URL}
RUN bun run build

# Production stage with nginx
FROM nginx:alpine

# Copy built files
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

# Create nginx config for SPA routing and API proxy
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    # API proxy to backend service \
    location /api { \
        proxy_pass http://backend:3000; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
        proxy_connect_timeout 60s; \
        proxy_send_timeout 60s; \
        proxy_read_timeout 60s; \
    } \
    \
    # SPA routing - must come after API \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    gzip on; \
    gzip_vary on; \
    gzip_min_length 1024; \
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json; \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]