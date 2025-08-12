# Likert Form - Quick Single-Form Implementation

## Overview
Simplified single-tenant, single-form implementation for immediate deployment. No authentication, just a hardcoded form with SQLite storage.

## Simplified Tech Stack
- **Backend**: Rust with Axum (minimal dependencies)
- **Frontend**: React with TypeScript (single page)
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: SQLite (single file, no setup required)
- **Deployment**: Single binary with embedded frontend

## Features (MVP Only)
- Single hardcoded Likert form
- Public submission page
- Admin view with hardcoded access token in URL
- Export responses as CSV
- Email notification on submission (via Resend)

## Database Schema (SQLite)

```sql
CREATE TABLE questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_text TEXT NOT NULL,
    is_required BOOLEAN DEFAULT 1,
    allow_comment BOOLEAN DEFAULT 1,
    position INTEGER NOT NULL
);

CREATE TABLE responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    respondent_name TEXT NOT NULL,
    respondent_email TEXT NOT NULL,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT
);

CREATE TABLE answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    response_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    likert_value INTEGER CHECK (likert_value BETWEEN 1 AND 5),
    comment TEXT,
    FOREIGN KEY (response_id) REFERENCES responses(id),
    FOREIGN KEY (question_id) REFERENCES questions(id)
);

CREATE INDEX idx_answers_response ON answers(response_id);
```

## Hardcoded Questions (Initial Seed)
```sql
INSERT INTO questions (question_text, is_required, allow_comment, position) VALUES
('The project requirements were clearly defined', 1, 1, 1),
('Communication throughout the project was effective', 1, 1, 2),
('The timeline was reasonable and well-managed', 1, 1, 3),
('I am satisfied with the final deliverables', 1, 1, 4),
('I would recommend this service to others', 1, 1, 5);
```

## API Endpoints (Minimal)

### Public
- `GET /` - Serve React form
- `GET /api/form` - Get questions for display
- `POST /api/submit` - Submit response

### Admin (Protected by token in URL)
- `GET /admin?token=YOUR_SECRET_TOKEN` - Admin dashboard
- `GET /api/admin/responses?token=YOUR_SECRET_TOKEN` - Get all responses
- `GET /api/admin/export?token=YOUR_SECRET_TOKEN` - Export CSV

## Environment Variables
```env
DATABASE_URL=sqlite://./likert_form.db
ADMIN_TOKEN=generate-random-string-here
RESEND_API_KEY=your-resend-api-key
NOTIFICATION_EMAIL=your-email@example.com
PORT=3000
```

## Project Structure
```
likert_form_quick/
├── backend/
│   ├── src/
│   │   ├── main.rs
│   │   ├── db.rs
│   │   ├── handlers.rs
│   │   ├── models.rs
│   │   └── email.rs
│   ├── Cargo.toml
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── FormPage.tsx
│   │   ├── AdminPage.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── migrations/
│   └── 001_initial.sql
└── README.md
```

## Quick Implementation Steps

### Day 1: Backend Setup
1. Initialize Rust project with Axum
2. Set up SQLite with sqlx
3. Create database schema and seed questions
4. Implement form submission endpoint
5. Add Resend email notification

### Day 2: Frontend & Deployment
1. Create React form with Tailwind/shadcn
2. Implement form submission
3. Create basic admin view
4. Build and bundle frontend
5. Serve static files from Axum
6. Deploy as single binary

## Simplified Backend Code Structure

### Cargo.toml Dependencies
```toml
[dependencies]
axum = "0.7"
tokio = { version = "1", features = ["full"] }
sqlx = { version = "0.7", features = ["sqlite", "runtime-tokio"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tower = "0.4"
tower-http = { version = "0.5", features = ["cors", "fs"] }
dotenvy = "0.15"
resend-rs = "0.2"
csv = "1.3"
```

### Key Models
```rust
#[derive(Serialize, Deserialize)]
struct Question {
    id: i32,
    question_text: String,
    is_required: bool,
    allow_comment: bool,
}

#[derive(Serialize, Deserialize)]
struct SubmissionRequest {
    respondent_name: String,
    respondent_email: String,
    answers: Vec<Answer>,
}

#[derive(Serialize, Deserialize)]
struct Answer {
    question_id: i32,
    likert_value: Option<i32>,
    comment: Option<String>,
}
```

## Frontend Components (Minimal)

### Form Page
- Display all questions
- Likert scale radio buttons (1-5)
- Optional comment textarea
- Name/email fields
- Submit button with loading state

### Admin Page
- Table of responses
- Export to CSV button
- Basic stats (total responses, average scores)

## Deployment (Single Machine)

### Option 1: Systemd Service
```bash
# Build release binary
cargo build --release

# Copy binary and static files
cp target/release/likert_form /usr/local/bin/
cp -r frontend/dist /usr/local/share/likert_form/

# Create systemd service
sudo systemctl enable likert_form.service
sudo systemctl start likert_form.service
```

### Option 2: Docker
```dockerfile
FROM rust:1.75 as builder
WORKDIR /app
COPY . .
RUN cargo build --release

FROM debian:bookworm-slim
COPY --from=builder /app/target/release/likert_form /usr/local/bin/
COPY --from=builder /app/frontend/dist /usr/local/share/likert_form/
CMD ["likert_form"]
```

### Option 3: Direct Execution
```bash
# Development
cargo run

# Production
DATABASE_URL=sqlite://./likert_form.db \
ADMIN_TOKEN=your-secret-token \
RESEND_API_KEY=your-key \
NOTIFICATION_EMAIL=you@example.com \
./target/release/likert_form
```

## Email Notification Template
```
Subject: New Likert Form Response

You have received a new response to your feedback form.

Respondent: {name}
Email: {email}
Submitted: {timestamp}

Average Score: {avg_score}/5

View all responses at: {admin_url}
```

## Total Implementation Time
- **Backend**: 4-6 hours
- **Frontend**: 3-4 hours
- **Testing & Deployment**: 2-3 hours
- **Total**: ~1 day of focused work

## Limitations (Acceptable for Quick MVP)
- No user authentication (URL token only)
- Single form only
- No form editing after deployment
- No real-time updates
- Basic styling only
- No response editing
- No advanced analytics

## Migration Path to Full Version
1. Export all responses as CSV
2. Import into PostgreSQL when ready
3. Map single form to tenant account
4. Preserve all response data