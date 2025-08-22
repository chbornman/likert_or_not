#!/bin/bash

# Run migration script for adding role and instructions fields

echo "Running migration 004_add_role_and_instructions.sql..."

# Copy database to temp location for modification
cp data/likert_form.db data/likert_form_backup.db
cp data/likert_form.db data/likert_form_temp.db

# Run the migration using the local sqlite3
sqlite3 data/likert_form_temp.db <<EOF
-- Add role field to responses_v2 table
ALTER TABLE responses_v2 ADD COLUMN role TEXT;

-- Add instructions field to forms table  
ALTER TABLE forms ADD COLUMN instructions TEXT;

-- Create index for role-based queries
CREATE INDEX IF NOT EXISTS idx_responses_v2_role ON responses_v2(role);
EOF

if [ $? -eq 0 ]; then
    echo "Migration successful. Replacing database..."
    mv data/likert_form_temp.db data/likert_form.db
    echo "Database updated successfully."
else
    echo "Migration failed. Restoring backup..."
    rm data/likert_form_temp.db
    exit 1
fi