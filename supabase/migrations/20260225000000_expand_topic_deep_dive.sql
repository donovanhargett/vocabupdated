ALTER TABLE daily_content ADD COLUMN IF NOT EXISTS topic_why_it_matters text NOT NULL DEFAULT '';
ALTER TABLE daily_content ADD COLUMN IF NOT EXISTS topic_first_principles text NOT NULL DEFAULT '';
ALTER TABLE daily_content ADD COLUMN IF NOT EXISTS topic_questions jsonb NOT NULL DEFAULT '[]';
