-- Add welcome_message and closing_message columns to forms table

ALTER TABLE forms ADD COLUMN welcome_message TEXT;
ALTER TABLE forms ADD COLUMN closing_message TEXT;