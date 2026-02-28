-- Add HRV (Heart Rate Variability) category column to daily_news
ALTER TABLE daily_news
  ADD COLUMN IF NOT EXISTS hrv jsonb DEFAULT '{}';
