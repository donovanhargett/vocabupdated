CREATE TABLE IF NOT EXISTS weekly_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week text NOT NULL UNIQUE,
  fallacy_name text NOT NULL DEFAULT '',
  fallacy_explanation text NOT NULL DEFAULT '',
  fallacy_example text NOT NULL DEFAULT '',
  bias_name text NOT NULL DEFAULT '',
  bias_explanation text NOT NULL DEFAULT '',
  bias_example text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE weekly_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read weekly content"
  ON weekly_content FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert weekly content"
  ON weekly_content FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update weekly content"
  ON weekly_content FOR UPDATE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_weekly_content_week ON weekly_content(week);
