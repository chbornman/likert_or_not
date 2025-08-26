.PHONY: help dev prod build clean install test test-unit test-e2e test-integration test-coverage

help: ## Show this help message
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies for local development
	cd backend && cargo build
	cd frontend && bun install

dev: ## Start development environment with Docker Compose
	docker compose -f docker-compose.dev.yml up

dev-local: ## Start local development without Docker
	@echo "Starting backend..."
	cd backend && cargo run &
	@echo "Starting frontend..."
	cd frontend && bun run dev

build: ## Build production Docker image
	docker compose build

prod: ## Start production environment
	docker compose up -d

logs: ## View production logs
	docker compose logs -f

stop: ## Stop all containers
	docker compose down
	docker compose -f docker-compose.dev.yml down

clean: ## Clean build artifacts and data
	rm -rf backend/target frontend/dist frontend/node_modules data
	docker compose down -v
	docker compose -f docker-compose.dev.yml down -v

reset-db: ## Reset the database (WARNING: deletes all data)
	rm -f data/*.db data/*.db-shm data/*.db-wal
	@echo "Database reset. It will be recreated on next run."

test: ## Run all tests
	./run_tests.sh

test-unit: ## Run unit tests only
	@echo "Running frontend unit tests..."
	cd frontend && bun test src/**/__tests__
	@echo "Running backend unit tests..."
	cd backend && cargo test --lib

test-e2e: ## Run E2E tests
	./run_tests.sh --e2e

test-integration: ## Run integration tests
	./run_tests.sh --integration

test-coverage: ## Run tests with coverage report
	./run_tests.sh --coverage

test-watch: ## Run tests in watch mode
	cd frontend && bun test --watch

lint: ## Run linters
	cd frontend && bun run lint
	cd backend && cargo clippy -- -D warnings

fmt: ## Format code
	cd frontend && bunx prettier --write "src/**/*.{ts,tsx}"
	cd backend && cargo fmt