# Executive Director Performance Review - Likert Form MVP

A production-ready Likert scale form application for Executive Director performance reviews, featuring a high-performance Rust backend and modern React frontend.

## Tech Stack

### Backend (Rust)
- **Framework**: [Axum](https://github.com/tokio-rs/axum) - Ergonomic and modular web framework
- **Async Runtime**: [Tokio](https://tokio.rs/) - Industry-standard async runtime for Rust
- **Database**: [SQLite](https://www.sqlite.org/) with [SQLx](https://github.com/launchbadge/sqlx) - Type-safe SQL with compile-time checked queries
- **Serialization**: [Serde](https://serde.rs/) - High-performance serialization/deserialization
- **Error Handling**: [thiserror](https://github.com/dtolnay/thiserror) - Idiomatic error types
- **Logging**: [tracing](https://github.com/tokio-rs/tracing) - Structured, context-aware logging with JSON output in production
- **Email**: [Resend](https://resend.com/) API integration for notifications
- **Security**:
  - Token-based admin authentication (Bearer tokens in headers)
  - Configurable CORS with explicit origin allowlist
  - Production error sanitization (hides sensitive database details)
  - Structured audit logging for security events

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
- Admin Dashboard: http://localhost:5173/admin (enter password: dev-pass)

## Security Configuration

### Environment Variables

Create a `.env` file from `.env.example` with these required security settings:

```bash
# REQUIRED - Admin authentication
ADMIN_TOKEN=use-a-strong-random-token-here  # Change from dev-pass!

# REQUIRED - Security settings
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000  # Production: your domain
RUST_ENV=development  # Set to "production" in production

# REQUIRED - Paths and database
DATABASE_URL=sqlite://./data/likert_form.db?mode=rwc
PORT=3000
TEMPLATE_PATH=./config/form-template.json

# Optional - Email notifications
RESEND_API_KEY=your-resend-api-key
NOTIFICATION_EMAIL=admin@example.com
```

### Security Features

1. **Authentication**
   - Admin token required for all `/api/admin/*` endpoints
   - Token passed via `Authorization: Bearer <token>` header (preferred) or query param (legacy)
   - Frontend validates token with backend before showing admin UI
   - Rate limiting on admin endpoints (2 requests/second) to prevent brute force

2. **CORS Protection**
   - Explicit origin allowlist via `CORS_ALLOWED_ORIGINS`
   - No wildcards - specify exact domains
   - Prevents cross-site request attacks

3. **Security Headers**
   - `X-Frame-Options: DENY` - Prevents clickjacking attacks
   - `X-Content-Type-Options: nosniff` - Prevents MIME type sniffing
   - `X-XSS-Protection: 1; mode=block` - XSS protection for older browsers
   - `Content-Security-Policy` - Controls resource loading
   - `Referrer-Policy: strict-origin-when-cross-origin` - Controls referrer information

4. **Rate Limiting**
   - Admin endpoints: 2 requests/second per IP (strict)
   - Public endpoints: 20 requests/second per IP (lenient)
   - Prevents brute force attacks and DDoS

5. **Input Validation & Sanitization**
   - Email validation with length limits and pattern checking
   - Text input sanitization (XSS prevention)
   - SQL injection prevention (though we use prepared statements)
   - Numeric value validation (NaN/Infinity checks)
   - Maximum field lengths enforced

6. **Request Security**
   - 10MB maximum request size
   - 30 second request timeout
   - Response compression

7. **Error Handling**
   - Production mode (`RUST_ENV=production`) hides database error details
   - Errors logged server-side with full context
   - Clients receive sanitized error messages

8. **Structured Logging**
   - Development: Pretty-printed logs with file locations
   - Production: JSON logs for aggregation tools
   - Security events logged with context

9. **Data Privacy**
   - PII stored separately in `respondents` table
   - Email hashes for duplicate detection (SHA-256)
   - Ability to delete PII while preserving anonymous responses

### Security Best Practices

⚠️ **Before Production Deployment:**

1. **Change the admin token** from default `dev-pass`
2. **Set `RUST_ENV=production`** to hide error details
3. **Configure `CORS_ALLOWED_ORIGINS`** with your actual domain (e.g., `https://tcw_ed_review.calebbornman.com`)
4. **Enable Cloudflare security features**:
   - SSL/TLS encryption mode: Full (strict)
   - Enable Rate Limiting rules
   - Configure WAF (Web Application Firewall)
   - Set up DDoS protection
5. **Set up log aggregation** to monitor security events
6. **Regular backups** of the SQLite database
7. **Cloudflare Page Rules** for caching static assets

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
   - `DATABASE_URL`: `sqlite:///app/data/likert_form.db`
   - `PORT`: `3000`
   - `RUST_ENV`: `production` (hides sensitive errors)
   - `RUST_LOG`: `info` (or `warn` for less verbose)
   - `CORS_ALLOWED_ORIGINS`: `https://tcw_ed_review.calebbornman.com`
   - `TEMPLATE_PATH`: `/app/config/form-template.json`
   - `RESEND_API_KEY`: Your Resend API key (optional, for email notifications)
   - `NOTIFICATION_EMAIL`: Email to receive form submissions (optional)

5. Deploy the application

6. After deployment, access:
   - Form: https://tcw_ed_review.calebbornman.com
   - Admin: https://tcw_ed_review.calebbornman.com/admin (login with your ADMIN_TOKEN)

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
