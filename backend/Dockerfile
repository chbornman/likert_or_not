########################################
# DOCKER HUB IMAGE: chbornman/likert-or-not-backend
# VERSION: Check backend/Cargo.toml for current version
# LATEST TAG: chbornman/likert-or-not-backend:latest
########################################

# Build stage
FROM rustlang/rust:nightly AS builder

WORKDIR /app

# Copy only Cargo files first for better caching
COPY backend/Cargo.toml backend/Cargo.lock ./

# Create dummy main.rs to build dependencies
RUN mkdir src && echo "fn main() {}" > src/main.rs

# Build dependencies
RUN cargo build --release
RUN rm -rf src

# Copy actual source code
COPY backend/src ./src
COPY backend/migrations ./migrations

# Touch main.rs to ensure it's newer than the cached deps
RUN touch src/main.rs

# Build the actual application
RUN cargo build --release

# Runtime stage
FROM debian:bookworm-slim

# Build argument for version (passed via docker build --build-arg)
ARG VERSION=latest

# Label the image with version info
LABEL org.opencontainers.image.source="https://github.com/chbornman/likert_or_not"
LABEL org.opencontainers.image.description="Likert Form Backend Service"
LABEL org.opencontainers.image.version="${VERSION}"

RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the binary from builder
COPY --from=builder /app/target/release/likert-form-mvp /app/likert-form-mvp
COPY --from=builder /app/migrations /app/migrations

# Copy config directory with form template (build context is project root)
COPY ./backend/config /app/config

# Create data directory for SQLite - run as root to avoid permission issues
RUN mkdir -p /app/data && chmod 777 /app/data

# Create entrypoint script that runs as root to handle volume permissions
RUN echo '#!/bin/sh\n\
# Ensure data directory exists and is writable by all users\n\
mkdir -p /app/data\n\
chmod 777 /app/data\n\
# Start the application\n\
exec /app/likert-form-mvp' > /app/entrypoint.sh && \
    chmod +x /app/entrypoint.sh

EXPOSE 3000

CMD ["/app/entrypoint.sh"]
