# Executive Director Performance Review - Likert Form MVP

A production-ready Likert scale form application for Executive Director performance reviews, featuring a high-performance Rust backend and modern React frontend.

## Tech Stack

### Backend (Rust)
- **Framework**: [Axum](https://github.com/tokio-rs/axum) - Ergonomic and modular web framework
- **Async Runtime**: [Tokio](https://tokio.rs/) - Industry-standard async runtime for Rust
- **Database**: [SQLite](https://www.sqlite.org/) with [SQLx](https://github.com/launchbadge/sqlx) - Type-safe SQL with compile-time checked queries
- **Serialization**: [Serde](https://serde.rs/) - High-performance serialization/deserialization
- **Error Handling**: [thiserror](https://github.com/dtolnay/thiserror) - Idiomatic error types
- **Logging**: [tracing](https://github.com/tokio-rs/tracing) - Structured, async-aware logging
- **Email**: [Resend](https://resend.com/) API integration for notifications
- **Security**: Token-based authentication, CORS configuration

### Frontend (React + TypeScript)
- **Framework**: [React 18](https://react.dev/) with TypeScript for type safety
- **Build Tool**: [Vite](https://vitejs.dev/) - Lightning-fast HMR and optimized builds
- **Package Manager**: [Bun](https://bun.sh/) - All-in-one JavaScript runtime & toolkit
- **Routing**: [React Router v6](https://reactrouter.com/) - Client-side routing
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) components
- **HTTP Client**: Native fetch API with async/await
- **Testing**: Bun test runner + [@testing-library/react](https://testing-library.com/docs/react-testing-library/intro/)
- **E2E Testing**: [Playwright](https://playwright.dev/) for cross-browser testing

### Infrastructure & DevOps
- **Containerization**: Docker with multi-stage builds for optimized images
- **Production Server**: Nginx for static file serving and reverse proxy
- **Database**: SQLite with persistent volume mounting
- **Environment Config**: 12-factor app principles - all configuration via environment variables
- **Pre-commit Hooks**: Automated formatting and linting on commit
- **CI/CD Ready**: Designed for deployment on platforms like Coolify, Railway, or Fly.io

### Development Configuration
- **No hardcoded values**: All configuration through environment variables
- **Clear environment separation**: Local development runs natively, production uses Docker
- **Type safety**: TypeScript on frontend, Rust's type system on backend
- **Code quality**: ESLint, Prettier, Clippy, and rustfmt enforced via pre-commit hooks
- **Hot reloading**: Vite HMR for frontend, manual restart for backend (cargo-watch compatible)
- **Database migrations**: Automatic migration on startup via SQLx

## Features

- 40-question Executive Director performance review form
- 5-point Likert scale (Strongly Disagree to Strongly Agree)
- Optional comments for each question
- Admin dashboard with token-based access
- CSV export functionality
- Email notifications via Resend
- SQLite database (no setup required)
- Mobile-responsive design

## Quick Start

### Local Development Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd likert_or_not
```

2. Copy the environment file and configure:
```bash
cp .env.example .env
# Edit .env with your values
```

3. Install pre-commit hooks (recommended):
```bash
pip install pre-commit
pre-commit install
```

4. Start development environment:
```bash
# Terminal 1 - Backend
cd backend
cargo run

# Terminal 2 - Frontend
cd frontend
bun install
bun run dev
```

5. Access the application:
- Form: http://localhost:5173
- Backend API: http://localhost:3000
- Admin Dashboard: http://localhost:5173/admin?token=dev-token-change-in-production

### Production Deployment with Coolify

1. In Coolify, create a new **Application** (not Docker Compose)

2. Configure the build:
   - Source: Your GitHub repository
   - Branch: main
   - Build Pack: **Dockerfile**
   - Base Directory: `/mvp` (if mvp is a subfolder)
   - Dockerfile Location: `./Dockerfile`

3. **CRITICAL: Add Persistent Storage**
   - Go to the **Storages** tab
   - Click "Add Storage"
   - Mount Path: `/app/data`
   - This is REQUIRED for the SQLite database to persist!

4. Set environment variables in the **Environment Variables** tab:
   - `ADMIN_TOKEN`: A secure random token (MUST CHANGE FROM DEFAULT!)
   - `RESEND_API_KEY`: Your Resend API key (optional, for email notifications)
   - `NOTIFICATION_EMAIL`: Email to receive form submissions (optional)
   - `DATABASE_URL`: `sqlite:///app/data/likert_form.db`

5. Deploy the application

6. After deployment, access:
   - Form: https://your-domain.com
   - Admin: https://your-domain.com/admin?token=YOUR_ADMIN_TOKEN

**Note:** Without persistent storage, your database will be lost on every redeploy!

## Local Development (Without Docker)

### Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your values

cargo run
```

### Frontend Setup

```bash
cd frontend
bun install
bun run dev
```

## Admin Access

The admin dashboard is protected by a token in the URL:
```
/admin?token=YOUR_ADMIN_TOKEN
```

Keep this token secure as it provides access to all responses and export functionality.

## Database

The application uses SQLite with automatic migrations. The database file is stored in:
- Development: `./data/likert_form.db`
- Docker: `/app/data/likert_form.db` (persisted in volume)

## Email Notifications

To enable email notifications when someone submits the form:

1. Sign up for a [Resend](https://resend.com) account
2. Get your API key
3. Set the `RESEND_API_KEY` and `NOTIFICATION_EMAIL` environment variables

## CSV Export

From the admin dashboard, click "Export to CSV" to download all responses in a spreadsheet-friendly format.

## Security Notes

- Always use a strong, random `ADMIN_TOKEN` in production
- The form is publicly accessible by design
- All responses are stored locally in SQLite
- No authentication system - access control is via URL token only

## Customization

To modify the questions, edit the seed data in `backend/src/db.rs`. The questions are automatically seeded on first run.

## Troubleshooting

### Port Already in Use
Change the PORT environment variable or stop the conflicting service.

### Database Locked
Ensure only one instance of the backend is running.

### Email Not Sending
- Verify your Resend API key is correct
- Check that NOTIFICATION_EMAIL is set
- Review backend logs for error messages

## License

MIT
