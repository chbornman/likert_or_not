-- Migration to update question types CHECK constraint to include all supported types

-- SQLite doesn't support ALTER TABLE to modify CHECK constraints directly
-- We need to recreate the table with the updated constraint

-- First, drop the view that depends on the questions table
DROP VIEW IF EXISTS response_statistics;

-- Create a temporary table with the new constraint
CREATE TABLE questions_new (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    form_id TEXT NOT NULL,
    section_id TEXT,
    position INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN (
        'likert', 
        'text', 
        'textarea', 
        'multiple_choice',
        'checkbox',
        'dropdown',
        'yes_no',
        'rating',
        'number',
        'datetime'
    )),
    title TEXT NOT NULL,
    description TEXT,
    features JSON DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE,
    FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL,
    UNIQUE(form_id, position)
);

-- Copy existing data
INSERT INTO questions_new SELECT * FROM questions;

-- Drop the old table
DROP TABLE questions;

-- Rename the new table
ALTER TABLE questions_new RENAME TO questions;

-- Recreate indexes
CREATE INDEX idx_questions_form_id ON questions(form_id);
CREATE INDEX idx_questions_section_id ON questions(section_id);

-- Recreate the view
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