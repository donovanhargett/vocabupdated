CREATE TABLE IF NOT EXISTS daily_ph_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date text NOT NULL UNIQUE,
  products jsonb NOT NULL DEFAULT '[]',
  fetched_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE daily_ph_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view daily ph products"
  ON daily_ph_products FOR SELECT
  TO authenticated
  USING (true);
