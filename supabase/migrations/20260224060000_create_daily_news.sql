CREATE TABLE IF NOT EXISTS daily_news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date text NOT NULL UNIQUE,
  stories jsonb NOT NULL DEFAULT '[]',
  fetched_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE daily_news ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view daily news"
  ON daily_news FOR SELECT
  TO authenticated
  USING (true);
