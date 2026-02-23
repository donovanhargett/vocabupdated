CREATE TABLE IF NOT EXISTS daily_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date UNIQUE NOT NULL,
  word text NOT NULL,
  word_definition text NOT NULL,
  word_example text NOT NULL DEFAULT '',
  idiom text NOT NULL,
  idiom_explanation text NOT NULL,
  idiom_example text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE daily_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view daily content"
  ON daily_content FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert daily content"
  ON daily_content FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update daily content"
  ON daily_content FOR UPDATE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_daily_content_date ON daily_content(date);
