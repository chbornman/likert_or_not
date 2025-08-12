.PHONY: help dev prod build clean install

help: ## Show this help message
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies for local development
	cd backend && cargo build
	cd frontend && npm install

dev: ## Start development environment with Docker Compose
	docker-compose -f docker-compose.dev.yml up

dev-local: ## Start local development without Docker
	@echo "Starting backend..."
	cd backend && cargo run &
	@echo "Starting frontend..."
	cd frontend && npm run dev

build: ## Build production Docker image
	docker-compose build

prod: ## Start production environment
	docker-compose up -d

logs: ## View production logs
	docker-compose logs -f

stop: ## Stop all containers
	docker-compose down
	docker-compose -f docker-compose.dev.yml down

clean: ## Clean build artifacts and data
	rm -rf backend/target frontend/dist frontend/node_modules data
	docker-compose down -v
	docker-compose -f docker-compose.dev.yml down -v

reset-db: ## Reset the database (WARNING: deletes all data)
	rm -f data/*.db data/*.db-shm data/*.db-wal
	@echo "Database reset. It will be recreated on next run."