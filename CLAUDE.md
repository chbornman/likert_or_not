# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Likert scale form builder application with a Rust/Axum backend and React/TypeScript frontend. The application allows creating, managing, and collecting responses for Likert scale forms with comprehensive admin features.

## Development Commands

### Quick Start (Docker Compose)
```bash
# Development environment
make dev
# OR
docker compose -f docker-compose.dev.yml up

# Production environment  
make prod
# OR
docker compose up -d
```

### Local Development (Without Docker)
```bash
# Install dependencies
make install

# Start backend (from backend/ directory)
cd backend && cargo run

# Start frontend (from frontend/ directory)  
cd frontend && bun run dev

# Or run both locally
make dev-local
```

### Testing Commands
```bash
# Run all tests (comprehensive suite)
make test
# OR
./scripts/run_tests.sh

# Specific test types
make test-unit          # Frontend and backend unit tests
make test-e2e           # End-to-end tests with Playwright
make test-integration   # Backend integration tests
make test-coverage      # Coverage reports

# Frontend specific
cd frontend && bun test              # All frontend tests
cd frontend && bun test --watch      # Watch mode
cd frontend && bun test src/**/__tests__  # Unit tests only
cd frontend && bun test test/e2e     # E2E tests only
```

### Code Quality
```bash
# Linting
make lint
cd frontend && bun run lint          # ESLint
cd backend && cargo clippy -- -D warnings

# Formatting
make fmt
cd frontend && bunx prettier --write "src/**/*.{ts,tsx}"
cd backend && cargo fmt
```

### Build Commands
```bash
# Build production Docker images
make build
docker compose build

# Frontend build
cd frontend && bun run build

# Backend build  
cd backend && cargo build --release
```

### Database Management
```bash
# Reset database (WARNING: deletes all data)
make reset-db

# Run individual migrations
cd backend && sqlx migrate run
```

## Architecture Overview

### Backend (Rust + Axum)
- **Framework**: Axum web framework with tokio async runtime
- **Database**: SQLite with SQLx for queries and migrations  
- **Authentication**: Token-based admin access (no user registration system)
- **Email**: Resend API integration for notifications
- **Location**: `backend/src/`

Key backend modules:
- `main.rs` - Application startup and router configuration
- `handlers.rs` - HTTP request handlers for all endpoints
- `models.rs` - Data structures and request/response DTOs
- `db.rs` - Database initialization and migrations
- `email.rs` - Email notification functionality
- `error.rs` - Error handling utilities

### Frontend (React + TypeScript)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with Bun as package manager
- **Routing**: React Router DOM
- **Styling**: Tailwind CSS with shadcn/ui components
- **Testing**: Bun test runner with @testing-library/react
- **E2E Testing**: Playwright
- **Location**: `frontend/src/`

Key frontend structure:
- `App.tsx` - Main application with routing
- `components/` - React components (form UI, admin dashboard, etc.)
- `services/api.ts` - API client functions
- `types.ts` - TypeScript interfaces matching backend models
- `test/` - E2E tests and fixtures

### Database Schema
SQLite database with the following key tables:
- `forms` - Form definitions and metadata
- `sections` - Form sections for organization  
- `questions` - Individual questions with configuration
- `responses` - Response metadata (anonymous)
- `respondents` - PII data stored separately for privacy
- `answers` - Individual question answers as JSON

Privacy-focused design: PII is isolated in `respondents` table and can be deleted independently while preserving anonymous response data.

### API Design
RESTful API with two main categories:
- **Public endpoints** (`/api/forms/*`) - Form listing, retrieval, and submission
- **Admin endpoints** (`/api/admin/*`) - Require token authentication via query parameter

Authentication uses a simple admin token (set via `ADMIN_TOKEN` env var) rather than user accounts.

## Environment Setup

Copy `.env.example` to `.env` and configure:
- `ADMIN_TOKEN` - Required: Secure token for admin access  
- `DATABASE_URL` - SQLite database path
- `RESEND_API_KEY` - Optional: For email notifications
- `NOTIFICATION_EMAIL` - Optional: Receives form submission notifications
- `PORT` - Application port (default: 3000)

## Question Types Supported

The application supports multiple question types defined in `frontend/src/types.ts`:
- `likert` - 5-point scale (Strongly Disagree to Strongly Agree)
- `text` - Single-line text input
- `textarea` - Multi-line text input
- `multiple_choice` - Single selection from options
- `checkbox` - Multiple selections  
- `dropdown` - Dropdown selection
- `yes_no` - Boolean yes/no questions
- `rating` - Star or number rating scale
- `number` - Numeric input with min/max
- `date`, `time`, `datetime` - Date/time pickers

## Key Files to Understand

- `API.md` - Complete API documentation with examples
- `backend/src/handlers.rs` - All API endpoint implementations
- `frontend/src/components/FormPage.tsx` - Main form rendering logic
- `frontend/src/components/AdminDashboard.tsx` - Admin interface
- `backend/src/models.rs` - Core data structures
- `frontend/src/services/api.ts` - Frontend API client
- `scripts/run_tests.sh` - Comprehensive test runner

## Development Workflow

1. Use Docker Compose for quick development: `make dev`
2. For backend changes, work in `backend/src/` and test with `cargo test`
3. For frontend changes, work in `frontend/src/` and test with `bun test`
4. Run linting before commits: `make lint`
5. Use the comprehensive test suite: `make test`
6. Database migrations are handled automatically on startup

## Testing Strategy

- **Frontend**: Unit tests with Bun + @testing-library/react
- **Backend**: Unit and integration tests with Rust's built-in test framework
- **E2E**: Playwright tests covering full user workflows
- **Coverage**: Available for frontend via `bun test --coverage`

The test suite is designed to run in CI and includes proper service startup/teardown for E2E tests.