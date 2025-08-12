# Single container with both frontend and backend
# Build frontend
FROM node:20-alpine as frontend-builder

WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# Build backend
FROM rust:1.75 as backend-builder

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

RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend binary
COPY --from=backend-builder /app/target/release/likert-form-mvp /app/likert-form-mvp
COPY --from=backend-builder /app/migrations /app/migrations

# Copy frontend build
COPY --from=frontend-builder /app/dist /app/frontend/dist

# Create data directory for SQLite
RUN mkdir -p /app/data

ENV DATABASE_URL=sqlite:///app/data/likert_form.db
ENV PORT=3000

EXPOSE 3000

CMD ["./likert-form-mvp"]