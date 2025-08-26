#!/bin/sh
cd /home/caleb/projects/likert_or_not/mvp/backend

# Create a simple SQL query file
cat > test_query.sql << 'SQL'
SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;
SQL

# Run the query using Docker exec and a direct SQL query
docker exec mvp-backend-1 sh -c "echo \"SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;\" | sqlite3 /app/data/likert_form.db 2>/dev/null || echo 'sqlite3 not available'"

# Alternative: Check if old tables exist by trying to query them
echo "Checking for old tables..."
docker exec mvp-backend-1 sh -c "
cd /app
cat > check.sql << 'SQL'
SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name IN ('questions_v2', 'answers_v2', 'responses_v2');
SQL
sqlx database query --source check.sql 2>/dev/null || echo 'No SQLx CLI available'
"

rm -f test_query.sql check.sql
