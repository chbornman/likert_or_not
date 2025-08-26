#!/bin/bash

set -e

echo "🧪 Running Comprehensive Test Suite"
echo "===================================="

cd "$(dirname "$0")"

echo -e "\n📦 Installing dependencies..."
cd frontend && bun install && cd ..
cd backend && cargo build && cd ..

echo -e "\n🔍 Running Frontend Linting..."
cd frontend && bun run lint && cd ..

echo -e "\n✅ Running Frontend Unit Tests..."
cd frontend && bun test src/**/__tests__ --coverage && cd ..

echo -e "\n🔧 Running Backend Tests..."
cd backend && cargo test && cd ..

echo -e "\n📊 Running Backend Clippy..."
cd backend && cargo clippy -- -D warnings && cd ..

if [ "$1" == "--e2e" ]; then
    echo -e "\n🌐 Starting local services for E2E tests..."

    # Start backend in background
    echo "Starting backend..."
    cd backend
    cargo run &
    BACKEND_PID=$!
    cd ..

    # Start frontend in background
    echo "Starting frontend..."
    cd frontend
    bun run dev &
    FRONTEND_PID=$!
    cd ..

    # Wait for services to be ready
    echo "Waiting for services to start..."
    sleep 10

    echo -e "\n🎭 Running E2E Tests..."
    cd frontend
    bunx playwright install chromium
    TEST_URL=http://localhost:5173 HEADLESS=true bun test test/e2e
    cd ..

    echo -e "\n🛑 Stopping services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
fi

if [ "$1" == "--integration" ]; then
    echo -e "\n🔗 Running Integration Tests..."
    cd backend && cargo test --test integration && cd ..
fi

echo -e "\n✨ All tests passed successfully!"
echo "===================================="

if [ "$1" == "--coverage" ]; then
    echo -e "\n📈 Coverage Report:"
    echo "Frontend coverage report: frontend/coverage/index.html"
    echo "Backend coverage: Run 'cargo tarpaulin' in backend directory"
fi
