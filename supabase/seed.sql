-- Seed data for local development
-- This creates test users and assigns roles to stock groups
-- Reference: scripts/create-users.ts

-- Insert test users into auth.users
-- Using fixed UUIDs for reproducibility
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES
  -- maiwashi-primary@example.com (マイワシ太平洋系群 主担当)
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'maiwashi-primary@example.com',
    crypt('maiwashi-primary123', gen_salt('bf')),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  ),
  -- maiwashi-secondary@example.com (マイワシ太平洋系群 副担当)
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'maiwashi-secondary@example.com',
    crypt('maiwashi-secondary123', gen_salt('bf')),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  ),
  -- zuwaigani-primary@example.com (ズワイガニオホーツク海系群 主担当)
  (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-3333-3333-333333333333',
    'authenticated',
    'authenticated',
    'zuwaigani-primary@example.com',
    crypt('zuwaigani-primary123', gen_salt('bf')),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  ),
  -- zuwaigani-secondary@example.com (ズワイガニオホーツク海系群 副担当)
  (
    '00000000-0000-0000-0000-000000000000',
    '44444444-4444-4444-4444-444444444444',
    'authenticated',
    'authenticated',
    'zuwaigani-secondary@example.com',
    crypt('zuwaigani-secondary123', gen_salt('bf')),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  ),
  -- admin@example.com (管理者 - 全資源グループ)
  (
    '00000000-0000-0000-0000-000000000000',
    '55555555-5555-5555-5555-555555555555',
    'authenticated',
    'authenticated',
    'admin@example.com',
    crypt('admin123', gen_salt('bf')),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  ),
  -- multiple@example.com (複数ロール: マイワシ太平洋主担当、マイワシ対馬副担当、マチ類主担当)
  (
    '00000000-0000-0000-0000-000000000000',
    '66666666-6666-6666-6666-666666666666',
    'authenticated',
    'authenticated',
    'multiple@example.com',
    crypt('multiple123', gen_salt('bf')),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
ON CONFLICT (id) DO NOTHING;

-- Insert identities for each user (required for Supabase auth to work)
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  created_at,
  updated_at,
  last_sign_in_at
) VALUES
  (
    gen_random_uuid(),
    '11111111-1111-1111-1111-111111111111',
    jsonb_build_object('sub', '11111111-1111-1111-1111-111111111111', 'email', 'maiwashi-primary@example.com', 'email_verified', true),
    'email',
    '11111111-1111-1111-1111-111111111111',
    NOW(),
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    '22222222-2222-2222-2222-222222222222',
    jsonb_build_object('sub', '22222222-2222-2222-2222-222222222222', 'email', 'maiwashi-secondary@example.com', 'email_verified', true),
    'email',
    '22222222-2222-2222-2222-222222222222',
    NOW(),
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    '33333333-3333-3333-3333-333333333333',
    jsonb_build_object('sub', '33333333-3333-3333-3333-333333333333', 'email', 'zuwaigani-primary@example.com', 'email_verified', true),
    'email',
    '33333333-3333-3333-3333-333333333333',
    NOW(),
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    '44444444-4444-4444-4444-444444444444',
    jsonb_build_object('sub', '44444444-4444-4444-4444-444444444444', 'email', 'zuwaigani-secondary@example.com', 'email_verified', true),
    'email',
    '44444444-4444-4444-4444-444444444444',
    NOW(),
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    '55555555-5555-5555-5555-555555555555',
    jsonb_build_object('sub', '55555555-5555-5555-5555-555555555555', 'email', 'admin@example.com', 'email_verified', true),
    'email',
    '55555555-5555-5555-5555-555555555555',
    NOW(),
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    '66666666-6666-6666-6666-666666666666',
    jsonb_build_object('sub', '66666666-6666-6666-6666-666666666666', 'email', 'multiple@example.com', 'email_verified', true),
    'email',
    '66666666-6666-6666-6666-666666666666',
    NOW(),
    NOW(),
    NOW()
  )
ON CONFLICT (provider, provider_id) DO NOTHING;

-- Assign user roles to stock groups
-- Using subqueries to get stock_group_id by name
INSERT INTO public.user_stock_group_roles (user_id, stock_group_id, role) VALUES
  -- maiwashi-primary@example.com: マイワシ太平洋系群 主担当
  (
    '11111111-1111-1111-1111-111111111111',
    (SELECT id FROM public.stock_groups WHERE name = 'マイワシ太平洋系群'),
    '主担当'
  ),
  -- maiwashi-secondary@example.com: マイワシ太平洋系群 副担当
  (
    '22222222-2222-2222-2222-222222222222',
    (SELECT id FROM public.stock_groups WHERE name = 'マイワシ太平洋系群'),
    '副担当'
  ),
  -- zuwaigani-primary@example.com: ズワイガニオホーツク海系群 主担当
  (
    '33333333-3333-3333-3333-333333333333',
    (SELECT id FROM public.stock_groups WHERE name = 'ズワイガニオホーツク海系群'),
    '主担当'
  ),
  -- zuwaigani-secondary@example.com: ズワイガニオホーツク海系群 副担当
  (
    '44444444-4444-4444-4444-444444444444',
    (SELECT id FROM public.stock_groups WHERE name = 'ズワイガニオホーツク海系群'),
    '副担当'
  ),
  -- admin@example.com: 全資源グループの管理者
  (
    '55555555-5555-5555-5555-555555555555',
    (SELECT id FROM public.stock_groups WHERE name = 'マイワシ太平洋系群'),
    '管理者'
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    (SELECT id FROM public.stock_groups WHERE name = 'マイワシ対馬暖流系群'),
    '管理者'
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    (SELECT id FROM public.stock_groups WHERE name = 'ズワイガニオホーツク海系群'),
    '管理者'
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    (SELECT id FROM public.stock_groups WHERE name = 'マチ類（奄美諸島・沖縄諸島・先島諸島）'),
    '管理者'
  ),
  -- multiple@example.com: 複数ロール
  (
    '66666666-6666-6666-6666-666666666666',
    (SELECT id FROM public.stock_groups WHERE name = 'マイワシ太平洋系群'),
    '主担当'
  ),
  (
    '66666666-6666-6666-6666-666666666666',
    (SELECT id FROM public.stock_groups WHERE name = 'マイワシ対馬暖流系群'),
    '副担当'
  ),
  (
    '66666666-6666-6666-6666-666666666666',
    (SELECT id FROM public.stock_groups WHERE name = 'マチ類（奄美諸島・沖縄諸島・先島諸島）'),
    '主担当'
  )
ON CONFLICT (user_id, stock_group_id, role) DO NOTHING;

-- Insert user profiles (ADR 0019)
INSERT INTO public.user_profiles (id, name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'マイワシ太郎'),
  ('22222222-2222-2222-2222-222222222222', 'マイワシ次郎'),
  ('33333333-3333-3333-3333-333333333333', 'ズワイ太郎'),
  ('44444444-4444-4444-4444-444444444444', 'ズワイ次郎'),
  ('55555555-5555-5555-5555-555555555555', '管理者'),
  ('66666666-6666-6666-6666-666666666666', '複数担当者')
ON CONFLICT (id) DO NOTHING;

-- Seed assessment results and statuses for different scenarios
-- Scenario 1: マイワシ太平洋系群 (作業中 - In Progress)
INSERT INTO public.assessment_results (
  id,
  stock_group_id,
  fiscal_year,
  version,
  value,
  parameters,
  created_by,
  created_at
) VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    (SELECT id FROM public.stock_groups WHERE name = 'マイワシ太平洋系群'),
    2024,
    1,
    jsonb_build_object(
      'value', '125000',
      'unit', 'トン',
      'appVersion', '1.0.0'
    ),
    jsonb_build_object(
      'catchData', jsonb_build_object('value', '漁獲データ1'),
      'biologicalData', jsonb_build_object('value', '生物学的データ1')
    ),
    '11111111-1111-1111-1111-111111111111',
    NOW() - INTERVAL '2 days'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab',
    (SELECT id FROM public.stock_groups WHERE name = 'マイワシ太平洋系群'),
    2024,
    2,
    jsonb_build_object(
      'value', '128000',
      'unit', 'トン',
      'appVersion', '1.0.0'
    ),
    jsonb_build_object(
      'catchData', jsonb_build_object('value', '漁獲データ2'),
      'biologicalData', jsonb_build_object('value', '生物学的データ2')
    ),
    '11111111-1111-1111-1111-111111111111',
    NOW() - INTERVAL '1 day'
  )
ON CONFLICT (id) DO NOTHING;

-- Update マイワシ太平洋系群 to 外部査読中
WITH stock AS (
  SELECT id FROM public.stock_groups WHERE name = 'マイワシ太平洋系群' LIMIT 1
)
INSERT INTO public.stock_assessments (
  stock_group_id,
  fiscal_year,
  status,
  approved_version,
  updated_by
)
SELECT
  stock.id,
  2024,
  '外部査読中',
  2,
  '11111111-1111-1111-1111-111111111111'
FROM stock
ON CONFLICT (stock_group_id, fiscal_year) DO UPDATE
  SET status = EXCLUDED.status,
      approved_version = EXCLUDED.approved_version,
      updated_by = EXCLUDED.updated_by,
      updated_at = NOW();

-- Scenario 2: ズワイガニオホーツク海系群 (内部査読中 - Internal Review)
INSERT INTO public.assessment_results (
  id,
  stock_group_id,
  fiscal_year,
  version,
  value,
  parameters,
  created_by,
  created_at
) VALUES
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbba',
    (SELECT id FROM public.stock_groups WHERE name = 'ズワイガニオホーツク海系群'),
    2024,
    1,
    jsonb_build_object(
      'value', '45000',
      'unit', 'トン',
      'appVersion', '1.0.0'
    ),
    jsonb_build_object(
      'catchData', jsonb_build_object('value', 'ズワイ漁獲データ1'),
      'biologicalData', jsonb_build_object('value', 'ズワイ生物学的データ1')
    ),
    '33333333-3333-3333-3333-333333333333',
    NOW() - INTERVAL '5 days'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    (SELECT id FROM public.stock_groups WHERE name = 'ズワイガニオホーツク海系群'),
    2024,
    2,
    jsonb_build_object(
      'value', '46500',
      'unit', 'トン',
      'appVersion', '1.0.0'
    ),
    jsonb_build_object(
      'catchData', jsonb_build_object('value', 'ズワイ漁獲データ2'),
      'biologicalData', jsonb_build_object('value', 'ズワイ生物学的データ2')
    ),
    '33333333-3333-3333-3333-333333333333',
    NOW() - INTERVAL '3 days'
  )
ON CONFLICT (id) DO NOTHING;

-- Update ズワイガニオホーツク海系群 to 内部査読中
WITH stock AS (
  SELECT id FROM public.stock_groups WHERE name = 'ズワイガニオホーツク海系群' LIMIT 1
)
INSERT INTO public.stock_assessments (
  stock_group_id,
  fiscal_year,
  status,
  approved_version,
  updated_by
)
SELECT
  stock.id,
  2024,
  '内部査読中',
  2,
  '33333333-3333-3333-3333-333333333333'
FROM stock
ON CONFLICT (stock_group_id, fiscal_year) DO UPDATE
  SET status = EXCLUDED.status,
      approved_version = EXCLUDED.approved_version,
      updated_by = EXCLUDED.updated_by,
      updated_at = NOW();

-- Scenario 3: マイワシ対馬暖流系群 (作業中 - In Progress)
INSERT INTO public.assessment_results (
  id,
  stock_group_id,
  fiscal_year,
  version,
  value,
  parameters,
  created_by,
  created_at
) VALUES
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    (SELECT id FROM public.stock_groups WHERE name = 'マイワシ対馬暖流系群'),
    2024,
    1,
    jsonb_build_object(
      'value', '85000',
      'unit', 'トン',
      'appVersion', '1.0.0'
    ),
    jsonb_build_object(
      'catchData', jsonb_build_object('value', '対馬漁獲データ1'),
      'biologicalData', jsonb_build_object('value', '対馬生物学的データ1')
    ),
    '66666666-6666-6666-6666-666666666666',
    NOW() - INTERVAL '10 days'
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccd',
    (SELECT id FROM public.stock_groups WHERE name = 'マイワシ対馬暖流系群'),
    2024,
    2,
    jsonb_build_object(
      'value', '87500',
      'unit', 'トン',
      'appVersion', '1.0.0'
    ),
    jsonb_build_object(
      'catchData', jsonb_build_object('value', '対馬漁獲データ2'),
      'biologicalData', jsonb_build_object('value', '対馬生物学的データ2')
    ),
    '66666666-6666-6666-6666-666666666666',
    NOW() - INTERVAL '7 days'
  )
ON CONFLICT (id) DO NOTHING;

-- Update マイワシ対馬暖流系群 to 作業中
WITH stock AS (
  SELECT id FROM public.stock_groups WHERE name = 'マイワシ対馬暖流系群' LIMIT 1
)
INSERT INTO public.stock_assessments (
  stock_group_id,
  fiscal_year,
  status,
  updated_by
)
SELECT
  stock.id,
  2024,
  '作業中',
  '66666666-6666-6666-6666-666666666666'
FROM stock
ON CONFLICT (stock_group_id, fiscal_year) DO UPDATE
  SET status = EXCLUDED.status,
      updated_by = EXCLUDED.updated_by,
      updated_at = NOW();

-- Publication record for externally published assessment
INSERT INTO public.assessment_publications (
  id,
  stock_group_id,
  fiscal_year,
  internal_version,
  revision_number,
  published_at
) VALUES
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    (SELECT id FROM public.stock_groups WHERE name = 'マイワシ太平洋系群'),
    2024,
    2,
    1,
    NOW() - INTERVAL '5 days'
  )
ON CONFLICT (stock_group_id, fiscal_year, revision_number) DO NOTHING;

-- Scenario 4: マチ類 (未着手 - Not Started) - ensure all stock groups have assessments
WITH stock AS (
  SELECT id FROM public.stock_groups WHERE name = 'マチ類（奄美諸島・沖縄諸島・先島諸島）' LIMIT 1
)
INSERT INTO public.stock_assessments (
  stock_group_id,
  fiscal_year,
  status,
  updated_by
)
SELECT
  stock.id,
  2024,
  '未着手',
  '55555555-5555-5555-5555-555555555555'
FROM stock
ON CONFLICT (stock_group_id, fiscal_year) DO UPDATE
  SET status = EXCLUDED.status,
      updated_by = EXCLUDED.updated_by,
      updated_at = NOW();

-- Set current fiscal year to 2024
INSERT INTO public.system_settings (key, value, description, updated_by)
VALUES (
  'current_fiscal_year',
  '2024'::jsonb,
  '現在の資源評価年度',
  '55555555-5555-5555-5555-555555555555'
)
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value,
      description = EXCLUDED.description,
      updated_by = EXCLUDED.updated_by,
      updated_at = NOW();
