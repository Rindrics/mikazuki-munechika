-- Seed initial stock groups (ADR 0003)
INSERT INTO public.stock_groups (name) VALUES
  ('マイワシ太平洋系群'),
  ('マイワシ対馬暖流系群'),
  ('ズワイガニオホーツク海系群'),
  ('マチ類（奄美諸島・沖縄諸島・先島諸島）')
ON CONFLICT (name) DO NOTHING;
