-- Migrate existing ED Review form to new structure

-- Insert the main form
INSERT INTO forms (id, title, description, status, settings) VALUES (
    'ed-review-2025',
    'Executive Director Performance Review',
    'Performance review for the Executive Director covering January - June 2025',
    'published',
    json_object(
        'reviewPeriod', 'January - June 2025',
        'confidentialityNotice', 'All feedback will be kept confidential. Your individual responses will not be shared in a way that identifies you.',
        'jobDescription', 'The Executive Director will be responsible for strategic planning, operational management, community outreach, and volunteer coordination and will work closely with the Board of Directors to ensure the financial health and sustainability of the organization while enhancing its programs and services. This role requires a hands-on leader who is both a strategic thinker and a practical manager, capable of inspiring staff, volunteers, and community partners.',
        'allowAnonymous', false,
        'requireAuth', false,
        'autoSave', true,
        'progressBar', true,
        'estimatedTime', '20 minutes'
    )
);

-- Insert sections
INSERT INTO sections (id, form_id, title, description, position) VALUES 
    ('sec-1', 'ed-review-2025', 'Organizational Leadership', 'Evaluate the Executive Director''s leadership of the organization', 1),
    ('sec-2', 'ed-review-2025', 'Strategic Planning & Management', 'Assess strategic planning and management capabilities', 2),
    ('sec-3', 'ed-review-2025', 'Leadership & Governance', 'Review leadership effectiveness and governance relationships', 3),
    ('sec-4', 'ed-review-2025', 'Programming & Operations', 'Evaluate program development and operational management', 4),
    ('sec-5', 'ed-review-2025', 'Fundraising & Financial Management', 'Assess fundraising success and financial stewardship', 5),
    ('sec-6', 'ed-review-2025', 'Community Engagement & Advocacy', 'Review community relationships and advocacy efforts', 6),
    ('sec-7', 'ed-review-2025', 'Core Values', 'Evaluate alignment with organizational core values', 7),
    ('sec-8', 'ed-review-2025', 'Executive Competencies', 'Assess key executive competencies', 8),
    ('sec-9', 'ed-review-2025', 'Overall Performance', 'Overall performance evaluation', 9);

-- Add objectives question at the beginning of Organizational Leadership section
INSERT INTO questions_v2 (form_id, section_id, position, type, title, description, features) VALUES 
    ('ed-review-2025', 'sec-1', 0, 'textarea', 
     'Executive Director Objectives', 
     'What were the Executive Director''s top 3-5 objectives for the organization during this review period?',
     json_object(
         'required', false,
         'charLimit', 1000,
         'placeholder', 'Please list the top 3-5 objectives...',
         'rows', 5
     ));

-- Migrate existing questions from questions table to questions_v2
-- Organizational Leadership (Questions 1-4)
INSERT INTO questions_v2 (form_id, section_id, position, type, title, features)
SELECT 
    'ed-review-2025',
    'sec-1',
    position,
    'likert',
    question_text,
    json_object(
        'required', is_required,
        'allowComment', allow_comment,
        'scale', json_object(
            'min', 1,
            'max', 5,
            'minLabel', 'Strongly Disagree',
            'maxLabel', 'Strongly Agree'
        )
    )
FROM questions WHERE position BETWEEN 1 AND 4;

-- Strategic Planning & Management (Questions 5-8)
INSERT INTO questions_v2 (form_id, section_id, position, type, title, features)
SELECT 
    'ed-review-2025',
    'sec-2',
    position,
    'likert',
    question_text,
    json_object(
        'required', is_required,
        'allowComment', allow_comment,
        'scale', json_object(
            'min', 1,
            'max', 5,
            'minLabel', 'Strongly Disagree',
            'maxLabel', 'Strongly Agree'
        )
    )
FROM questions WHERE position BETWEEN 5 AND 8;

-- Leadership & Governance (Questions 9-12)
INSERT INTO questions_v2 (form_id, section_id, position, type, title, features)
SELECT 
    'ed-review-2025',
    'sec-3',
    position,
    'likert',
    question_text,
    json_object(
        'required', is_required,
        'allowComment', allow_comment,
        'scale', json_object(
            'min', 1,
            'max', 5,
            'minLabel', 'Strongly Disagree',
            'maxLabel', 'Strongly Agree'
        )
    )
FROM questions WHERE position BETWEEN 9 AND 12;

-- Programming & Operations (Questions 13-16)
INSERT INTO questions_v2 (form_id, section_id, position, type, title, features)
SELECT 
    'ed-review-2025',
    'sec-4',
    position,
    'likert',
    question_text,
    json_object(
        'required', is_required,
        'allowComment', allow_comment,
        'scale', json_object(
            'min', 1,
            'max', 5,
            'minLabel', 'Strongly Disagree',
            'maxLabel', 'Strongly Agree'
        )
    )
FROM questions WHERE position BETWEEN 13 AND 16;

-- Fundraising & Financial Management (Questions 17-20)
INSERT INTO questions_v2 (form_id, section_id, position, type, title, features)
SELECT 
    'ed-review-2025',
    'sec-5',
    position,
    'likert',
    question_text,
    json_object(
        'required', is_required,
        'allowComment', allow_comment,
        'scale', json_object(
            'min', 1,
            'max', 5,
            'minLabel', 'Strongly Disagree',
            'maxLabel', 'Strongly Agree'
        )
    )
FROM questions WHERE position BETWEEN 17 AND 20;

-- Community Engagement & Advocacy (Questions 21-24)
INSERT INTO questions_v2 (form_id, section_id, position, type, title, features)
SELECT 
    'ed-review-2025',
    'sec-6',
    position,
    'likert',
    question_text,
    json_object(
        'required', is_required,
        'allowComment', allow_comment,
        'scale', json_object(
            'min', 1,
            'max', 5,
            'minLabel', 'Strongly Disagree',
            'maxLabel', 'Strongly Agree'
        )
    )
FROM questions WHERE position BETWEEN 21 AND 24;

-- Core Values (Questions 25-30)
INSERT INTO questions_v2 (form_id, section_id, position, type, title, features)
SELECT 
    'ed-review-2025',
    'sec-7',
    position,
    'likert',
    question_text,
    json_object(
        'required', is_required,
        'allowComment', allow_comment,
        'scale', json_object(
            'min', 1,
            'max', 5,
            'minLabel', 'Strongly Disagree',
            'maxLabel', 'Strongly Agree'
        )
    )
FROM questions WHERE position BETWEEN 25 AND 30;

-- Executive Competencies (Questions 31-35)
INSERT INTO questions_v2 (form_id, section_id, position, type, title, features)
SELECT 
    'ed-review-2025',
    'sec-8',
    position,
    'likert',
    question_text,
    json_object(
        'required', is_required,
        'allowComment', allow_comment,
        'scale', json_object(
            'min', 1,
            'max', 5,
            'minLabel', 'Strongly Disagree',
            'maxLabel', 'Strongly Agree'
        )
    )
FROM questions WHERE position BETWEEN 31 AND 35;

-- Overall Performance (Questions 36-40)
INSERT INTO questions_v2 (form_id, section_id, position, type, title, features)
SELECT 
    'ed-review-2025',
    'sec-9',
    position,
    'likert',
    question_text,
    json_object(
        'required', is_required,
        'allowComment', allow_comment,
        'scale', json_object(
            'min', 1,
            'max', 5,
            'minLabel', 'Strongly Disagree',
            'maxLabel', 'Strongly Agree'
        )
    )
FROM questions WHERE position BETWEEN 36 AND 40;

-- Create default admin user (password: admin123 - should be changed immediately)
-- Using bcrypt hash for 'admin123'
INSERT INTO admin_users (username, password_hash, email, is_active) VALUES (
    'admin',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY.Ne.uPv5pPjRa',
    'admin@example.com',
    1
);