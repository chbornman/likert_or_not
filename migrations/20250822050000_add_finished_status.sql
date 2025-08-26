-- Add 'finished' status to forms table
-- This status indicates a form that is no longer accepting responses but is still visible

-- SQLite doesn't support ALTER TABLE to modify CHECK constraints directly
-- We need to recreate the table with the new constraint

-- Create a new table with the updated constraint
CREATE TABLE forms_new (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    title TEXT NOT NULL,
    description TEXT,
    instructions TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'finished', 'archived')),
    settings JSON DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Copy data from the old table
INSERT INTO forms_new SELECT * FROM forms;

-- Drop the old table
DROP TABLE forms;

-- Rename the new table
ALTER TABLE forms_new RENAME TO forms;

-- Recreate indexes if any were on the original table
-- (none in the original schema for forms table)