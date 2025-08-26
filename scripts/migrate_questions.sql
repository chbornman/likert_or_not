-- Migration script to populate ED Review form with sections and questions

-- First, ensure the form exists
INSERT OR IGNORE INTO forms (id, title, description, status, settings) VALUES (
    'ed-review-2025',
    'Executive Director Performance Review',
    'Performance review for the Executive Director covering January - June 2025',
    'published',
    json_object(
        'reviewPeriod', 'January - June 2025',
        'confidentialityNotice', 'All feedback will be kept confidential. Your individual responses will not be shared in a way that identifies you.',
        'jobDescription', 'The Executive Director will be responsible for strategic planning, operational management, community outreach, and volunteer coordination and will work closely with the Board of Directors to ensure the financial health and sustainability of the organization while enhancing its programs and services. This role requires a hands-on leader who is both a strategic thinker and a practical manager, capable of inspiring staff, volunteers, and community partners.',
        'allowAnonymous', 0,
        'requireAuth', 0,
        'autoSave', 1,
        'progressBar', 1,
        'estimatedTime', '20 minutes'
    )
);

-- Clear existing sections and questions for this form
DELETE FROM sections WHERE form_id = 'ed-review-2025';
DELETE FROM questions_v2 WHERE form_id = 'ed-review-2025';

-- Create sections
INSERT INTO sections (id, form_id, title, description, position) VALUES
    ('section-1', 'ed-review-2025', 'Strategic Leadership', 'Evaluate the Executive Director''s strategic leadership and goal achievement', 1),
    ('section-2', 'ed-review-2025', 'Board Relations & Governance', 'Assess collaboration with the Board and governance practices', 2),
    ('section-3', 'ed-review-2025', 'Operational Management', 'Review day-to-day operational effectiveness and program management', 3),
    ('section-4', 'ed-review-2025', 'Financial Stewardship', 'Evaluate financial management and fundraising effectiveness', 4),
    ('section-5', 'ed-review-2025', 'Community Engagement', 'Assess community outreach and stakeholder relationships', 5),
    ('section-6', 'ed-review-2025', 'Leadership Qualities', 'Evaluate personal leadership characteristics and professional conduct', 6),
    ('section-7', 'ed-review-2025', 'Mission & Vision', 'Assess commitment to organizational mission and vision setting', 7),
    ('section-8', 'ed-review-2025', 'Overall Performance', 'Provide overall assessment of the Executive Director''s performance', 8);

-- Insert questions with proper section assignments
-- Section 1: Strategic Leadership (questions 1-5)
INSERT INTO questions_v2 (id, form_id, section_id, position, type, title, description, features) VALUES
    ('q1', 'ed-review-2025', 'section-1', 1, 'likert', 'The Executive Director effectively leads the organization toward achieving its strategic goals', NULL, 
     json_object('required', 1, 'allowComment', 1, 'scale', json_object('min', 1, 'max', 5, 'minLabel', 'Strongly Disagree', 'maxLabel', 'Strongly Agree'))),
    ('q2', 'ed-review-2025', 'section-1', 2, 'likert', 'The ED demonstrates clear understanding of the Board''s strategic objectives', NULL,
     json_object('required', 1, 'allowComment', 1, 'scale', json_object('min', 1, 'max', 5, 'minLabel', 'Strongly Disagree', 'maxLabel', 'Strongly Agree'))),
    ('q3', 'ed-review-2025', 'section-1', 3, 'likert', 'The ED successfully translates strategic direction into actionable results', NULL,
     json_object('required', 1, 'allowComment', 1, 'scale', json_object('min', 1, 'max', 5, 'minLabel', 'Strongly Disagree', 'maxLabel', 'Strongly Agree'))),
    ('q4', 'ed-review-2025', 'section-1', 4, 'likert', 'The ED maintains focus on organizational priorities throughout the review period', NULL,
     json_object('required', 1, 'allowComment', 1, 'scale', json_object('min', 1, 'max', 5, 'minLabel', 'Strongly Disagree', 'maxLabel', 'Strongly Agree'))),
    ('q5', 'ed-review-2025', 'section-1', 5, 'likert', 'The ED demonstrates effective strategic thinking and planning', NULL,
     json_object('required', 1, 'allowComment', 1, 'scale', json_object('min', 1, 'max', 5, 'minLabel', 'Strongly Disagree', 'maxLabel', 'Strongly Agree'))),
    ('q6', 'ed-review-2025', 'section-1', 6, 'likert', 'The ED manages operations efficiently and effectively', NULL,
     json_object('required', 1, 'allowComment', 1, 'scale', json_object('min', 1, 'max', 5, 'minLabel', 'Strongly Disagree', 'maxLabel', 'Strongly Agree'))),
    ('q7', 'ed-review-2025', 'section-1', 7, 'likert', 'The ED balances strategic vision with practical management needs', NULL,
     json_object('required', 1, 'allowComment', 1, 'scale', json_object('min', 1, 'max', 5, 'minLabel', 'Strongly Disagree', 'maxLabel', 'Strongly Agree'))),
    ('q8', 'ed-review-2025', 'section-1', 8, 'likert', 'The ED inspires staff, volunteers, and community partners', NULL,
     json_object('required', 1, 'allowComment', 1, 'scale', json_object('min', 1, 'max', 5, 'minLabel', 'Strongly Disagree', 'maxLabel', 'Strongly Agree'))),
    ('q9', 'ed-review-2025', 'section-1', 9, 'likert', 'The ED provides strong organizational leadership', NULL,
     json_object('required', 1, 'allowComment', 1, 'scale', json_object('min', 1, 'max', 5, 'minLabel', 'Strongly Disagree', 'maxLabel', 'Strongly Agree')));

-- Section 2: Board Relations & Governance (questions 10-12)
INSERT INTO questions_v2 (id, form_id, section_id, position, type, title, description, features) VALUES
    ('q10', 'ed-review-2025', 'section-2', 10, 'likert', 'The ED works collaboratively with the Board of Directors', NULL,
     json_object('required', 1, 'allowComment', 1, 'scale', json_object('min', 1, 'max', 5, 'minLabel', 'Strongly Disagree', 'maxLabel', 'Strongly Agree'))),
    ('q11', 'ed-review-2025', 'section-2', 11, 'likert', 'The ED ensures proper governance practices are followed', NULL,
     json_object('required', 1, 'allowComment', 1, 'scale', json_object('min', 1, 'max', 5, 'minLabel', 'Strongly Disagree', 'maxLabel', 'Strongly Agree'))),
    ('q12', 'ed-review-2025', 'section-2', 12, 'likert', 'The ED communicates effectively with board members', NULL,
     json_object('required', 1, 'allowComment', 1, 'scale', json_object('min', 1, 'max', 5, 'minLabel', 'Strongly Disagree', 'maxLabel', 'Strongly Agree')));

-- Section 3: Operational Management (questions 13-16)
INSERT INTO questions_v2 (id, form_id, section_id, position, type, title, description, features) VALUES
    ('q13', 'ed-review-2025', 'section-3', 13, 'likert', 'The ED oversees programs that align with organizational mission', NULL,
     json_object('required', 1, 'allowComment', 1, 'scale', json_object('min', 1, 'max', 5, 'minLabel', 'Strongly Disagree', 'maxLabel', 'Strongly Agree'))),
    ('q14', 'ed-review-2025', 'section-3', 14, 'likert', 'The ED ensures operational efficiency across all departments', NULL,
     json_object('required', 1, 'allowComment', 1, 'scale', json_object('min', 1, 'max', 5, 'minLabel', 'Strongly Disagree', 'maxLabel', 'Strongly Agree'))),
    ('q15', 'ed-review-2025', 'section-3', 15, 'likert', 'The ED enhances and improves existing programs and services', NULL,
     json_object('required', 1, 'allowComment', 1, 'scale', json_object('min', 1, 'max', 5, 'minLabel', 'Strongly Disagree', 'maxLabel', 'Strongly Agree'))),
    ('q16', 'ed-review-2025', 'section-3', 16, 'likert', 'The ED manages day-to-day operations effectively', NULL,
     json_object('required', 1, 'allowComment', 1, 'scale', json_object('min', 1, 'max', 5, 'minLabel', 'Strongly Disagree', 'maxLabel', 'Strongly Agree')));

-- Section 4: Financial Stewardship (questions 17-20)
INSERT INTO questions_v2 (id, form_id, section_id, position, type, title, description, features) VALUES
    ('q17', 'ed-review-2025', 'section-4', 17, 'likert', 'The ED ensures the financial health of the organization', NULL,
     json_object('required', 1, 'allowComment', 1, 'scale', json_object('min', 1, 'max', 5, 'minLabel', 'Strongly Disagree', 'maxLabel', 'Strongly Agree'))),
    ('q18', 'ed-review-2025', 'section-4', 18, 'likert', 'The ED successfully leads fundraising initiatives', NULL,
     json_object('required', 1, 'allowComment', 1, 'scale', json_object('min', 1, 'max', 5, 'minLabel', 'Strongly Disagree', 'maxLabel', 'Strongly Agree'))),
    ('q19', 'ed-review-2025', 'section-4', 19, 'likert', 'The ED demonstrates sound financial management practices', NULL,
     json_object('required', 1, 'allowComment', 1, 'scale', json_object('min', 1, 'max', 5, 'minLabel', 'Strongly Disagree', 'maxLabel', 'Strongly Agree'))),
    ('q20', 'ed-review-2025', 'section-4', 20, 'likert', 'The ED works to ensure organizational sustainability', NULL,
     json_object('required', 1, 'allowComment', 1, 'scale', json_object('min', 1, 'max', 5, 'minLabel', 'Strongly Disagree', 'maxLabel', 'Strongly Agree')));

-- Section 5: Community Engagement (questions 21-24)
INSERT INTO questions_v2 (id, form_id, section_id, position, type, title, description, features) VALUES
    ('q21', 'ed-review-2025', 'section-5', 21, 'likert', 'The ED effectively represents the organization in the community', NULL,
     json_object('required', 1, 'allowComment', 1, 'scale', json_object('min', 1, 'max', 5, 'minLabel', 'Strongly Disagree', 'maxLabel', 'Strongly Agree'))),
    ('q22', 'ed-review-2025', 'section-5', 22, 'likert', 'The ED builds strong relationships with community partners', NULL,
     json_object('required', 1, 'allowComment', 1, 'scale', json_object('min', 1, 'max', 5, 'minLabel', 'Strongly Disagree', 'maxLabel', 'Strongly Agree'))),
    ('q23', 'ed-review-2025', 'section-5', 23, 'likert', 'The ED coordinates volunteer efforts successfully', NULL,
     json_object('required', 1, 'allowComment', 1, 'scale', json_object('min', 1, 'max', 5, 'minLabel', 'Strongly Disagree', 'maxLabel', 'Strongly Agree'))),
    ('q24', 'ed-review-2025', 'section-5', 24, 'likert', 'The ED advocates effectively for the organization''s mission', NULL,
     json_object('required', 1, 'allowComment', 1, 'scale', json_object('min', 1, 'max', 5, 'minLabel', 'Strongly Disagree', 'maxLabel', 'Strongly Agree')));

-- Section 6: Leadership Qualities (questions 25-29)
INSERT INTO questions_v2 (id, form_id, section_id, position, type, title, description, features) VALUES
    ('q25', 'ed-review-2025', 'section-6', 25, 'likert', 'The ED demonstrates persistence in pursuing organizational goals', NULL,
     json_object('required', 1, 'allowComment', 1, 'scale', json_object('min', 1, 'max', 5, 'minLabel', 'Strongly Disagree', 'maxLabel', 'Strongly Agree'))),
    ('q26', 'ed-review-2025', 'section-6', 26, 'likert', 'The ED shows commitment to continuous improvement', NULL,
     json_object('required', 1, 'allowComment', 1, 'scale', json_object('min', 1, 'max', 5, 'minLabel', 'Strongly Disagree', 'maxLabel', 'Strongly Agree'))),
    ('q27', 'ed-review-2025', 'section-6', 27, 'likert', 'The ED treats all stakeholders with decency and respect', NULL,
     json_object('required', 1, 'allowComment', 1, 'scale', json_object('min', 1, 'max', 5, 'minLabel', 'Strongly Disagree', 'maxLabel', 'Strongly Agree'))),
    ('q28', 'ed-review-2025', 'section-6', 28, 'likert', 'The ED demonstrates humility in leadership', NULL,
     json_object('required', 1, 'allowComment', 1, 'scale', json_object('min', 1, 'max', 5, 'minLabel', 'Strongly Disagree', 'maxLabel', 'Strongly Agree'))),
    ('q29', 'ed-review-2025', 'section-6', 29, 'likert', 'The ED acts with integrity in all professional dealings', NULL,
     json_object('required', 1, 'allowComment', 1, 'scale', json_object('min', 1, 'max', 5, 'minLabel', 'Strongly Disagree', 'maxLabel', 'Strongly Agree')));

-- Section 7: Mission & Vision (questions 30-35)
INSERT INTO questions_v2 (id, form_id, section_id, position, type, title, description, features) VALUES
    ('q30', 'ed-review-2025', 'section-7', 30, 'likert', 'The ED shows deep understanding and commitment to TCW''s mission', NULL,
     json_object('required', 1, 'allowComment', 1, 'scale', json_object('min', 1, 'max', 5, 'minLabel', 'Strongly Disagree', 'maxLabel', 'Strongly Agree'))),
    ('q31', 'ed-review-2025', 'section-7', 31, 'likert', 'The ED sets a clear and compelling vision for TCW''s work', NULL,
     json_object('required', 1, 'allowComment', 1, 'scale', json_object('min', 1, 'max', 5, 'minLabel', 'Strongly Disagree', 'maxLabel', 'Strongly Agree'))),
    ('q32', 'ed-review-2025', 'section-7', 32, 'likert', 'The ED manages execution of plans and initiatives effectively', NULL,
     json_object('required', 1, 'allowComment', 1, 'scale', json_object('min', 1, 'max', 5, 'minLabel', 'Strongly Disagree', 'maxLabel', 'Strongly Agree'))),
    ('q33', 'ed-review-2025', 'section-7', 33, 'likert', 'The ED builds a strong and capable organization', NULL,
     json_object('required', 1, 'allowComment', 1, 'scale', json_object('min', 1, 'max', 5, 'minLabel', 'Strongly Disagree', 'maxLabel', 'Strongly Agree'))),
    ('q34', 'ed-review-2025', 'section-7', 34, 'likert', 'The ED excels at external communication and relationship-building', NULL,
     json_object('required', 1, 'allowComment', 1, 'scale', json_object('min', 1, 'max', 5, 'minLabel', 'Strongly Disagree', 'maxLabel', 'Strongly Agree'))),
    ('q35', 'ed-review-2025', 'section-7', 35, 'likert', 'The ED models the behaviors expected of all employees', NULL,
     json_object('required', 1, 'allowComment', 1, 'scale', json_object('min', 1, 'max', 5, 'minLabel', 'Strongly Disagree', 'maxLabel', 'Strongly Agree')));

-- Section 8: Overall Performance (questions 36-40)
INSERT INTO questions_v2 (id, form_id, section_id, position, type, title, description, features) VALUES
    ('q36', 'ed-review-2025', 'section-8', 36, 'likert', 'The ED regularly exceeds performance expectations', NULL,
     json_object('required', 1, 'allowComment', 1, 'scale', json_object('min', 1, 'max', 5, 'minLabel', 'Strongly Disagree', 'maxLabel', 'Strongly Agree'))),
    ('q37', 'ed-review-2025', 'section-8', 37, 'likert', 'The ED''s leadership positively impacts organizational success', NULL,
     json_object('required', 1, 'allowComment', 1, 'scale', json_object('min', 1, 'max', 5, 'minLabel', 'Strongly Disagree', 'maxLabel', 'Strongly Agree'))),
    ('q38', 'ed-review-2025', 'section-8', 38, 'likert', 'The ED effectively addresses areas needing improvement', NULL,
     json_object('required', 1, 'allowComment', 1, 'scale', json_object('min', 1, 'max', 5, 'minLabel', 'Strongly Disagree', 'maxLabel', 'Strongly Agree'))),
    ('q39', 'ed-review-2025', 'section-8', 39, 'likert', 'The ED achieves measurable results in key responsibility areas', NULL,
     json_object('required', 1, 'allowComment', 1, 'scale', json_object('min', 1, 'max', 5, 'minLabel', 'Strongly Disagree', 'maxLabel', 'Strongly Agree'))),
    ('q40', 'ed-review-2025', 'section-8', 40, 'likert', 'I am confident in the ED''s ability to lead the organization forward', NULL,
     json_object('required', 1, 'allowComment', 1, 'scale', json_object('min', 1, 'max', 5, 'minLabel', 'Strongly Disagree', 'maxLabel', 'Strongly Agree')));

-- Add additional open-ended questions at the end
INSERT INTO questions_v2 (id, form_id, section_id, position, type, title, description, features) VALUES
    ('q41', 'ed-review-2025', 'section-8', 41, 'textarea', 'What are the ED''s greatest strengths?', 'Please provide specific examples where possible', 
     json_object('required', 0, 'rows', 4, 'placeholder', 'Share your thoughts on the ED''s key strengths...')),
    ('q42', 'ed-review-2025', 'section-8', 42, 'textarea', 'What areas could the ED improve upon?', 'Please provide constructive feedback',
     json_object('required', 0, 'rows', 4, 'placeholder', 'Share areas for potential improvement...')),
    ('q43', 'ed-review-2025', 'section-8', 43, 'textarea', 'Additional comments or feedback', 'Any other observations or suggestions you would like to share',
     json_object('required', 0, 'rows', 5, 'placeholder', 'Additional feedback or comments...'));