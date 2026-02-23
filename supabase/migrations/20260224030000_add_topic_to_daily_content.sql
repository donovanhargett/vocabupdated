ALTER TABLE daily_content ADD COLUMN IF NOT EXISTS topic_title text NOT NULL DEFAULT '';
ALTER TABLE daily_content ADD COLUMN IF NOT EXISTS topic_explanation text NOT NULL DEFAULT '';
ALTER TABLE daily_content ADD COLUMN IF NOT EXISTS topic_feynman text NOT NULL DEFAULT '';
