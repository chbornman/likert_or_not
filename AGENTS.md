# AI Agent Instructions

## Build/Test Commands
```bash
# Frontend (from frontend/)
bun run dev              # Start dev server
bun run build            # TypeScript check + Vite build
bun run lint             # ESLint --max-warnings 0
bun test                 # Run all tests
bun test path/to/file   # Run single test file
bun test:unit           # Unit tests only
bun test:e2e            # E2E tests

# Backend (from backend/)
cargo build             # Build Rust backend
cargo run               # Run backend server
cargo test test_name    # Run single test
cargo clippy -- -D warnings  # Strict linting

# Docker (from project root)
docker compose up -d    # Start all services
docker compose build    # Rebuild all
docker compose logs -f backend  # View logs
make dev               # Development with Docker
```

## Code Style & Conventions
- **TypeScript**: strict:true, noUnusedLocals, noUnusedParameters, @/* path aliases
- **React**: Functional components only, PascalCase (AdminDashboard.tsx), interfaces over types
- **Rust**: thiserror for errors, group imports (std→external→crate), explicit Result handling
- **Imports**: Group by category, absolute paths (@/components, @/hooks, @/lib)
- **NO COMMENTS** unless explicitly requested - code should be self-documenting
- **Error handling**: Backend AppError enum with thiserror, frontend toast notifications
- **Naming**: Components PascalCase, hooks use*, utils camelCase, SQL snake_case
- **Testing**: Unit tests in __tests__/, integration in tests/, E2E in test/e2e/