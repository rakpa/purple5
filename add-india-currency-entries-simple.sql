-- Insert India currency entries data (Simple version)
-- Duplicate entries (based on id) will be overwritten
-- Run this SQL in your Supabase SQL Editor: https://supabase.com/dashboard/project/ggpxsxanqpapwyqnfivv/sql/new

-- Step 1: First, find your user_id by running this query:
-- SELECT id, email, created_at FROM auth.users ORDER BY created_at;

-- Step 2: Get the first user_id (or replace with your specific user_id)
-- Temporarily disable RLS for bulk insert
ALTER TABLE "public"."currency_entries" DISABLE ROW LEVEL SECURITY;

-- Insert data with duplicate handling, using the first available user_id
INSERT INTO "public"."currency_entries" 
  ("id", "date", "description", "pln_amount", "inr_amount", "created_at", "user_id") 
SELECT 
  vals.id,
  vals.date,
  vals.description,
  vals.pln_amount,
  vals.inr_amount,
  vals.created_at,
  COALESCE(
    (SELECT id FROM auth.users ORDER BY created_at LIMIT 1),
    '00000000-0000-0000-0000-000000000000'::UUID
  ) as user_id
FROM (VALUES
  ('1b110477-8199-4da2-b57f-f5027742f8ef'::UUID, '2025-12-03'::DATE, 'SBI PPF', '243'::NUMERIC, '6000'::NUMERIC, '2025-12-03 07:04:36.572843+00'::TIMESTAMPTZ),
  ('234b102b-567a-4ead-a0be-8e2e781d3e8b'::UUID, '2025-11-07'::DATE, 'CAR Insurance ', '730'::NUMERIC, '17500'::NUMERIC, '2025-11-07 03:26:48.945205+00'::TIMESTAMPTZ),
  ('3c1b70b1-c607-46b1-bb75-68ca0280eef0'::UUID, '2025-11-06'::DATE, 'Priyanka', '1000'::NUMERIC, '25000'::NUMERIC, '2025-11-07 03:24:32.031096+00'::TIMESTAMPTZ),
  ('5cb19f65-236f-46a8-9ba9-5faec5977c3e'::UUID, '2025-12-01'::DATE, 'Amex', '845'::NUMERIC, '20500'::NUMERIC, '2025-11-29 05:01:23.680185+00'::TIMESTAMPTZ),
  ('61c84097-9a92-4dda-8098-e08315d3795b'::UUID, '2025-03-31'::DATE, 'Papa', '1000'::NUMERIC, '20000'::NUMERIC, '2025-05-06 03:13:53.063165+00'::TIMESTAMPTZ),
  ('64eea7e9-3257-4a2d-9335-2beccb8fb5e5'::UUID, '2026-01-01'::DATE, 'SBI PPF', '200'::NUMERIC, '5000'::NUMERIC, '2025-12-26 11:24:14.302852+00'::TIMESTAMPTZ),
  ('7152c9a6-61c9-437e-887f-90fe23f6b90c'::UUID, '2025-10-16'::DATE, 'Papa', '850'::NUMERIC, '20000'::NUMERIC, '2025-10-18 06:46:34.11282+00'::TIMESTAMPTZ),
  ('79322e38-e628-4bf0-8d91-2320471dafaf'::UUID, '2025-05-01'::DATE, 'Papa', '1200'::NUMERIC, '25000'::NUMERIC, '2025-05-06 03:14:31.196027+00'::TIMESTAMPTZ),
  ('8946b4aa-42dc-4415-b3f1-1055cf647cb0'::UUID, '2025-12-01'::DATE, 'HDFC', '2700'::NUMERIC, '65500'::NUMERIC, '2025-11-29 05:00:25.384364+00'::TIMESTAMPTZ),
  ('dc2218df-e678-4cd3-964d-481bca2595b9'::UUID, '2025-09-05'::DATE, 'Zype', '375'::NUMERIC, '8700'::NUMERIC, '2025-09-05 04:22:51.088783+00'::TIMESTAMPTZ),
  ('e7bf31ee-d513-47a4-8b26-b61a007c02ac'::UUID, '2025-07-01'::DATE, 'Papa', '2100'::NUMERIC, '50000'::NUMERIC, '2025-07-05 19:53:20.00451+00'::TIMESTAMPTZ)
) AS vals(id, date, description, pln_amount, inr_amount, created_at)
ON CONFLICT (id) 
DO UPDATE SET
  date = EXCLUDED.date,
  description = EXCLUDED.description,
  pln_amount = EXCLUDED.pln_amount,
  inr_amount = EXCLUDED.inr_amount,
  created_at = EXCLUDED.created_at,
  user_id = EXCLUDED.user_id,
  updated_at = NOW();

-- Re-enable RLS
ALTER TABLE "public"."currency_entries" ENABLE ROW LEVEL SECURITY;

