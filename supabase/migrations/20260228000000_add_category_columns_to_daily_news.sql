-- Add category columns to daily_news table for Morning Brief
-- Each category now stores: { stories: [], insights: [], top_sources: [], fetched_at: string }

ALTER TABLE daily_news 
  ADD COLUMN IF NOT EXISTS openclaw jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS biotech jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS neurotech jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS intelligence jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS general jsonb DEFAULT '{}';

-- Note: The old 'stories' column can be left as-is or dropped after migration
-- ALTER TABLE daily_news DROP COLUMN IF EXISTS stories;
