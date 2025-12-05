-- Seed initial stock groups (ADR 0003)
INSERT INTO public.stock_groups (name) VALUES
  ('マイワシ太平洋系群'),
  ('ズワイガニオホーツク海系群')
ON CONFLICT (name) DO NOTHING;

