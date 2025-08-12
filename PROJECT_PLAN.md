# Likert Form Builder SaaS - Project Plan

## ideas

- add a randomization option for presenting one question at a time randomly to each user, helping with fatigue around any specific area of questioning.

## Tech Stack

- **Backend**: Rust with Axum web framework
- **Frontend**: React with TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Database**: PostgreSQL with Redis cache
- **API Documentation**: utoipa for OpenAPI spec and TypeScript type generation
- **Design**: Mobile-first responsive design with semantic theme colors
- **Logging**: Structured logging (tracing/slog)
- **Code Quality**: ESLint, Prettier, rustfmt, clippy

## Core Features

### 1. Form Management

- Create new Likert scale forms (1-5 scale: Strongly Disagree to Strongly Agree)
- Edit forms after creation
- View list of all created forms
- Delete/archive forms
- Shareable public links for form responses
- Bulk question import (paste line-separated questions)

### 2. Question Configuration

- Mark questions as required/optional
- Add comment fields below each question
- Reorder questions via drag-and-drop
- Question descriptions/help text

### 3. Response Collection

- Public form submission via shareable link
- Respondent identification (name/email required)
- Response validation
- Success confirmation page

### 4. Response Management

- View all responses for a form
- Export responses (CSV/Excel)
- Basic analytics (average scores, response count)
- Response timestamps

## Database Schema

### Tables

#### tenants

```sql
- id: UUID (PK)
- email: VARCHAR(255) UNIQUE NOT NULL
- password_hash: VARCHAR(255) NOT NULL
- name: VARCHAR(255)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
- is_active: BOOLEAN DEFAULT true
```

#### forms

```sql
- id: UUID (PK)
- tenant_id: UUID (FK -> tenants.id)
- title: VARCHAR(255) NOT NULL
- description: TEXT
- share_token: VARCHAR(64) UNIQUE NOT NULL
- is_active: BOOLEAN DEFAULT true
- requires_auth: BOOLEAN DEFAULT false
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
- published_at: TIMESTAMP
- closes_at: TIMESTAMP (nullable)
```

#### questions

```sql
- id: UUID (PK)
- form_id: UUID (FK -> forms.id)
- question_text: TEXT NOT NULL
- description: TEXT
- is_required: BOOLEAN DEFAULT true
- allow_comment: BOOLEAN DEFAULT true
- position: INTEGER NOT NULL
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### responses

```sql
- id: UUID (PK)
- form_id: UUID (FK -> forms.id)
- respondent_name: VARCHAR(255) NOT NULL
- respondent_email: VARCHAR(255) NOT NULL
- submitted_at: TIMESTAMP
- ip_address: INET
- user_agent: TEXT
```

#### answers

```sql
- id: UUID (PK)
- response_id: UUID (FK -> responses.id)
- question_id: UUID (FK -> questions.id)
- likert_value: INTEGER CHECK (likert_value BETWEEN 1 AND 5)
- comment: TEXT
- created_at: TIMESTAMP
```

### Indexes

- forms.share_token (unique index for fast lookups)
- forms.tenant_id (for tenant form listings)
- questions.form_id, questions.position (for ordered question retrieval)
- responses.form_id (for response analytics)
- answers.response_id (for complete response retrieval)

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new tenant
- `POST /api/auth/login` - Login tenant
- `POST /api/auth/logout` - Logout tenant
- `GET /api/auth/me` - Get current tenant info

### Forms

- `GET /api/forms` - List tenant's forms
- `POST /api/forms` - Create new form
- `GET /api/forms/{id}` - Get form details
- `PUT /api/forms/{id}` - Update form
- `DELETE /api/forms/{id}` - Delete form
- `GET /api/forms/{id}/responses` - Get form responses
- `GET /api/forms/{id}/analytics` - Get form analytics

### Questions

- `GET /api/forms/{form_id}/questions` - List form questions
- `POST /api/forms/{form_id}/questions` - Add question
- `PUT /api/questions/{id}` - Update question
- `DELETE /api/questions/{id}` - Delete question
- `POST /api/forms/{form_id}/questions/bulk` - Bulk import questions

### Public API

- `GET /api/public/forms/{share_token}` - Get public form
- `POST /api/public/forms/{share_token}/submit` - Submit response

## Frontend Routes

### Authenticated Routes

- `/` - Dashboard (list of forms)
- `/forms/new` - Create new form
- `/forms/:id/edit` - Edit form and questions
- `/forms/:id/responses` - View form responses
- `/forms/:id/analytics` - View form analytics
- `/settings` - Account settings

### Public Routes

- `/login` - Tenant login
- `/register` - Tenant registration
- `/f/:shareToken` - Public form submission
- `/f/:shareToken/success` - Submission success page

## Development Phases

### Phase 1: Foundation (Week 1)

- [ ] Set up Rust/Axum backend project structure
- [ ] Set up React/TypeScript frontend with Vite
- [ ] Configure PostgreSQL and Redis connections
- [ ] Implement structured logging
- [ ] Set up linting and formatting tools
- [ ] Configure Tailwind CSS and shadcn/ui

### Phase 2: Authentication & Core Models (Week 2)

- [ ] Implement tenant authentication (JWT)
- [ ] Create database migrations
- [ ] Implement core CRUD operations for forms
- [ ] Set up utoipa for API documentation
- [ ] Generate TypeScript types from OpenAPI spec

### Phase 3: Form Builder (Week 3)

- [ ] Form creation UI
- [ ] Question management (add/edit/delete/reorder)
- [ ] Bulk question import
- [ ] Form preview functionality
- [ ] Mobile-responsive form builder

### Phase 4: Response Collection (Week 4)

- [ ] Public form rendering
- [ ] Response submission and validation
- [ ] Success/error handling
- [ ] Response storage with Redis caching

### Phase 5: Analytics & Polish (Week 5)

- [ ] Response viewing interface
- [ ] Basic analytics dashboard
- [ ] Export functionality
- [ ] Performance optimization
- [ ] Comprehensive testing

## Security Considerations

- Password hashing with Argon2
- JWT tokens with refresh tokens
- Rate limiting on public endpoints
- CORS configuration
- Input sanitization and validation
- SQL injection prevention via parameterized queries
- XSS protection
- CSRF tokens for form submissions

## Performance Optimizations

- Redis caching for frequently accessed forms
- Database query optimization with proper indexes
- Lazy loading for large response datasets
- CDN for static assets
- Response pagination
- Debounced auto-save for form editing

## Monitoring & Observability

- Structured logging with correlation IDs
- Error tracking (Sentry integration)
- Performance monitoring
- Database query performance tracking
- API endpoint metrics

## Testing Strategy

- Unit tests for business logic (Rust)
- Integration tests for API endpoints
- Frontend component testing (React Testing Library)
- E2E tests for critical user flows (Playwright)
- Load testing for public form submission

## Deployment

- Docker containers for backend and frontend
- Docker Compose for local development
- GitHub Actions for CI/CD
- Environment-based configuration
- Database migrations in deployment pipeline
- Health check endpoints

## Email Notifications

- Resend API integration for transactional emails
- Email notifications to tenant on new form submission
- Optional email confirmation to respondents
- Daily/weekly response summary emails
