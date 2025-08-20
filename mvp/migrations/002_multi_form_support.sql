-- Migration for multi-form support with modular question system
-- Phase 1 & 2 implementation

-- Forms table
CREATE TABLE IF NOT EXISTS forms (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    settings JSON DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sections table
CREATE TABLE IF NOT EXISTS sections (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    form_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    position INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE,
    UNIQUE(form_id, position)
);

-- Create index for section lookups
CREATE INDEX IF NOT EXISTS idx_sections_form_id ON sections(form_id);

-- New questions table with modular features
CREATE TABLE IF NOT EXISTS questions_v2 (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    form_id TEXT NOT NULL,
    section_id TEXT,
    position INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('likert', 'text', 'textarea', 'select', 'multiselect', 'number', 'section_header')),
    title TEXT NOT NULL,
    description TEXT,
    features JSON DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE,
    FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL,
    UNIQUE(form_id, position)
);

-- Create indexes for question lookups
CREATE INDEX IF NOT EXISTS idx_questions_v2_form_id ON questions_v2(form_id);
CREATE INDEX IF NOT EXISTS idx_questions_v2_section_id ON questions_v2(section_id);

-- Update responses table to link to forms
CREATE TABLE IF NOT EXISTS responses_v2 (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    form_id TEXT NOT NULL,
    respondent_name TEXT,
    respondent_email TEXT,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    metadata JSON DEFAULT '{}',
    FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
);

-- Create index for response lookups
CREATE INDEX IF NOT EXISTS idx_responses_v2_form_id ON responses_v2(form_id);

-- Flexible answers table
CREATE TABLE IF NOT EXISTS answers_v2 (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    response_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    value JSON NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (response_id) REFERENCES responses_v2(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions_v2(id) ON DELETE CASCADE,
    UNIQUE(response_id, question_id)
);

-- Create indexes for answer lookups
CREATE INDEX IF NOT EXISTS idx_answers_v2_response_id ON answers_v2(response_id);
CREATE INDEX IF NOT EXISTS idx_answers_v2_question_id ON answers_v2(question_id);

-- Admin users table for authentication
CREATE TABLE IF NOT EXISTS admin_users (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);

-- Sessions table for admin authentication
CREATE TABLE IF NOT EXISTS admin_sessions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE CASCADE
);

-- Create index for session lookups
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at);

-- Audit log for tracking admin actions
CREATE TABLE IF NOT EXISTS audit_log (
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

-- Create index for audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);