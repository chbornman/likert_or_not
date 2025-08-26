#!/bin/bash

echo "Running PII separation migration..."

sqlite3 data/likert_form.db <<'EOF'
-- Create respondents table for PII storage
CREATE TABLE IF NOT EXISTS respondents (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    email_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(email_hash)
);

-- Create index for email hash lookups
CREATE INDEX IF NOT EXISTS idx_respondents_email_hash ON respondents(email_hash);

-- Create new responses table without PII
CREATE TABLE IF NOT EXISTS responses_v3 (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    respondent_id TEXT NOT NULL,
    form_id TEXT NOT NULL,
    role TEXT,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    metadata JSON DEFAULT '{}',
    FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE,
    FOREIGN KEY (respondent_id) REFERENCES respondents(id) ON DELETE SET NULL
);

-- Create indexes for the new responses table
CREATE INDEX IF NOT EXISTS idx_responses_v3_form_id ON responses_v3(form_id);
CREATE INDEX IF NOT EXISTS idx_responses_v3_respondent_id ON responses_v3(respondent_id);
CREATE INDEX IF NOT EXISTS idx_responses_v3_role ON responses_v3(role);

-- Create new answers table linked to responses_v3
CREATE TABLE IF NOT EXISTS answers_v3 (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    response_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    value JSON NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (response_id) REFERENCES responses_v3(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions_v2(id) ON DELETE CASCADE,
    UNIQUE(response_id, question_id)
);

-- Create indexes for answer lookups
CREATE INDEX IF NOT EXISTS idx_answers_v3_response_id ON answers_v3(response_id);
CREATE INDEX IF NOT EXISTS idx_answers_v3_question_id ON answers_v3(question_id);

.tables
EOF

echo "Migration completed!"