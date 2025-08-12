# Executive Director Performance Review - Likert Form MVP

A quick MVP implementation of a Likert scale form for Executive Director performance reviews. Built with Rust (Axum) backend and React frontend.

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

### Development with Docker Compose

1. Clone the repository and navigate to the MVP folder:
```bash
cd mvp
```

2. Copy the environment file and configure:
```bash
cp .env.example .env
# Edit .env with your values
```

3. Start development environment:
```bash
docker-compose -f docker-compose.dev.yml up
```

4. Access the application:
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
npm install
npm run dev
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