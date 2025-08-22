-- Clean up old database tables that are no longer needed

-- Drop old V1 tables
DROP TABLE IF EXISTS answers;
DROP TABLE IF EXISTS responses;
DROP TABLE IF EXISTS questions;

-- Drop old V2 tables
DROP TABLE IF EXISTS answers_v2;
DROP TABLE IF EXISTS responses_v2;

-- These tables are still needed for form management
-- Keep: forms, sections, questions_v2

-- These are the new privacy-preserving tables
-- Keep: respondents, responses_v3, answers_v3

-- Admin tables (keep if you want admin functionality)
-- Keep: admin_users, admin_sessions, audit_log