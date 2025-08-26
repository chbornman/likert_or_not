-- Initial schema for privacy-preserving Likert form system
-- This migration creates all necessary tables with PII separation

-- =====================================================
-- FORM STRUCTURE TABLES
-- =====================================================

-- Forms table: Main form configurations
CREATE TABLE forms (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    title TEXT NOT NULL,
    description TEXT,
    instructions TEXT, -- Instructions shown at form start
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    settings JSON DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sections table: Logical groupings of questions
CREATE TABLE sections (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    form_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    position INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE,
    UNIQUE(form_id, position)
);

-- Questions table: Individual form questions
CREATE TABLE questions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    form_id TEXT NOT NULL,
    section_id TEXT,
    position INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('likert', 'text', 'textarea', 'select', 'multiselect', 'number', 'checkbox')),
    title TEXT NOT NULL,
    description TEXT,
    features JSON DEFAULT '{}', -- Flexible features like required, placeholder, etc.
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE,
    FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL,
    UNIQUE(form_id, position)
);

-- Create indexes for form structure queries
CREATE INDEX idx_sections_form_id ON sections(form_id);
CREATE INDEX idx_questions_form_id ON questions(form_id);
CREATE INDEX idx_questions_section_id ON questions(section_id);

-- =====================================================
-- PRIVACY-PRESERVING RESPONSE TABLES
-- =====================================================

-- Respondents table: Stores PII separately
CREATE TABLE respondents (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    email_hash TEXT NOT NULL, -- SHA256 hash for duplicate checking
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(email_hash)
);

-- Responses table: Anonymous response data (no PII)
CREATE TABLE responses (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    respondent_id TEXT NOT NULL, -- UUID link to respondents table
    form_id TEXT NOT NULL,
    role TEXT, -- Staff, Board Member, Executive Director, etc.
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    metadata JSON DEFAULT '{}',
    FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE,
    FOREIGN KEY (respondent_id) REFERENCES respondents(id) ON DELETE SET NULL
);

-- Answers table: Individual answer data
CREATE TABLE answers (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    response_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    value JSON NOT NULL, -- Flexible JSON storage for different answer types
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (response_id) REFERENCES responses(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    UNIQUE(response_id, question_id)
);

-- Create indexes for response queries
CREATE INDEX idx_respondents_email_hash ON respondents(email_hash);
CREATE INDEX idx_responses_form_id ON responses(form_id);
CREATE INDEX idx_responses_respondent_id ON responses(respondent_id);
CREATE INDEX idx_responses_role ON responses(role);
CREATE INDEX idx_answers_response_id ON answers(response_id);
CREATE INDEX idx_answers_question_id ON answers(question_id);

-- =====================================================
-- ADMIN & AUDIT TABLES
-- =====================================================

-- Admin users table
CREATE TABLE admin_users (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);

-- Admin sessions table
CREATE TABLE admin_sessions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE CASCADE
);

-- Audit log for tracking admin actions
CREATE TABLE audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    details JSON,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE SET NULL
);

-- Create indexes for admin tables
CREATE INDEX idx_admin_sessions_token ON admin_sessions(token);
CREATE INDEX idx_admin_sessions_expires_at ON admin_sessions(expires_at);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- =====================================================
-- VIEWS FOR CONVENIENCE (READ-ONLY)
-- =====================================================

-- View to get responses with PII (for admin use only)
CREATE VIEW responses_with_pii AS
SELECT 
    r.id,
    r.form_id,
    res.name as respondent_name,
    res.email as respondent_email,
    r.role,
    r.submitted_at,
    r.ip_address,
    r.metadata
FROM responses r
LEFT JOIN respondents res ON res.id = r.respondent_id;

-- View for anonymous statistics
CREATE VIEW response_statistics AS
SELECT 
    r.form_id,
    r.role,
    q.id as question_id,
    q.title as question_title,
    q.type as question_type,
    COUNT(DISTINCT r.id) as response_count,
    AVG(CASE 
        WHEN q.type = 'likert' AND json_type(a.value) = 'integer' 
        THEN CAST(a.value as REAL)
        WHEN q.type = 'likert' AND json_type(a.value) = 'object' 
        THEN CAST(json_extract(a.value, '$.rating') as REAL)
        ELSE NULL
    END) as average_rating
FROM responses r
JOIN answers a ON a.response_id = r.id
JOIN questions q ON q.id = a.question_id
GROUP BY r.form_id, r.role, q.id, q.title, q.type;