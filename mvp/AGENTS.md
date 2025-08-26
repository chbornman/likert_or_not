# AI Agent Instructions

## Build/Test Commands
```bash
# Frontend (from mvp/frontend)
bun run dev        # Start dev server
bun run build      # TypeScript check + build
bun run lint       # ESLint with --max-warnings 0

# Backend (from mvp/backend)  
cargo build        # Build Rust backend
cargo run          # Run backend server
cargo test         # Run tests (single: cargo test test_name)
cargo clippy       # Rust linter

# Docker (from mvp/)
docker compose up -d       # Start all services (use space, not hyphen!)
docker compose build backend && docker compose up -d backend  # Rebuild backend
docker compose logs -f backend  # View logs
```

## Code Style
- **TypeScript**: Strict mode, no unused vars/params, use @/* path aliases
- **React**: Functional components, custom hooks in /hooks, UI components in /components/ui
- **Rust**: Use thiserror for errors, group imports (std, external, crate), handle Results explicitly
- **Imports**: Group by std/external/local, use absolute paths for components (@/components)
- **NO COMMENTS** unless explicitly requested by user
- **Error handling**: Backend uses AppError enum, frontend shows toast notifications
- **Database**: SQLite with sqlx, migrations in /mvp/migrations/
- **Testing**: Rebuild containers after changes, check logs, test in browser