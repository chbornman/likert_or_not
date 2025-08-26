# Single container with both frontend and backend
# Build frontend
FROM oven/bun:1 as frontend-builder

WORKDIR /app

COPY frontend/package.json frontend/bun.lock* ./
RUN bun install --frozen-lockfile

COPY frontend/ ./
RUN bun run build

# Build backend
FROM rustlang/rust:nightly as backend-builder

WORKDIR /app

COPY backend/Cargo.toml backend/Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release
RUN rm -rf src

COPY backend/src ./src
COPY migrations ./migrations

RUN touch src/main.rs
RUN cargo build --release

# Runtime
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend binary
COPY --from=backend-builder /app/target/release/likert-form-mvp /app/likert-form-mvp
COPY --from=backend-builder /app/migrations /app/migrations

# Copy frontend build
COPY --from=frontend-builder /app/dist /app/frontend/dist

# Create data directory and ensure permissions at runtime
RUN mkdir -p /app/data

ENV DATABASE_URL=sqlite:///app/data/likert_form.db?mode=rwc
ENV PORT=3000
ENV STATIC_DIR=/app/frontend/dist

EXPOSE 3000

# Use a shell script to ensure permissions before starting the app
RUN echo '#!/bin/sh\n\
mkdir -p /app/data\n\
chmod 777 /app/data\n\
exec ./likert-form-mvp' > /app/start.sh && chmod +x /app/start.sh

CMD ["/app/start.sh"]
