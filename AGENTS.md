# AI Agent Instructions

This document provides instructions for AI agents working on this codebase.

## Docker Commands

Always use the newer `docker compose` syntax (with a space) instead of the deprecated `docker-compose` (with a hyphen).

### Correct Usage
```bash
docker compose up
docker compose down
docker compose build
docker compose logs
docker compose restart backend
```

### Incorrect (deprecated)
```bash
docker-compose up  # Don't use this
```

## Development Workflow

1. **Starting the development environment:**
   ```bash
   cd mvp
   docker compose up -d
   ```

2. **Rebuilding after backend changes:**
   ```bash
   cd mvp
   docker compose build backend
   docker compose up -d backend
   ```

3. **Viewing logs:**
   ```bash
   docker compose logs -f backend
   docker compose logs -f frontend
   ```

4. **Stopping services:**
   ```bash
   docker compose down
   ```

## Project Structure

- `/mvp/backend` - Rust/Axum backend
- `/mvp/frontend` - React/TypeScript frontend
- `/mvp/migrations` - SQL migrations
- Database: SQLite at `/app/data/likert_form.db`

## Common Tasks

### Adding a new form status
1. Update backend handler validation in `handlers.rs`
2. Update frontend status displays in `AdminDashboard.tsx` and `FormList.tsx`
3. Rebuild backend: `docker compose build backend && docker compose up -d backend`

### Adding a new question type
1. Add component in `/mvp/frontend/src/components/`
2. Update `FormEditor.tsx` to include in dropdown
3. Update `FormPage.tsx` to render the component
4. Update backend if needed for validation

### Fixing import issues
1. Check that all required fields have `#[serde(default)]` if optional
2. Rebuild backend after changes
3. Test with minimal JSON first

## Testing

Always test changes by:
1. Rebuilding the affected container
2. Checking logs for errors
3. Testing the functionality in the browser