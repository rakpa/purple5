-- Insert India currency entries data (Manual user_id version)
-- Duplicate entries (based on id) will be overwritten
-- Run this SQL in your Supabase SQL Editor: https://supabase.com/dashboard/project/ggpxsxanqpapwyqnfivv/sql/new

-- Step 1: First, find your user_id by running this query:
-- SELECT id, email, created_at FROM auth.users ORDER BY created_at;

-- Step 2: Replace 'YOUR_USER_ID_HERE' below with the actual user_id from Step 1
-- Example: '3aeda750-2107-4326-a5ab-fe94eab67e34'

-- Temporarily disable RLS for bulk insert
ALTER TABLE "public"."currency_entries" DISABLE ROW LEVEL SECURITY;

-- Insert data with duplicate handling
-- REPLACE 'YOUR_USER_ID_HERE' with your actual user_id from Step 1
INSERT INTO "public"."currency_entries" 
  ("id", "date", "description", "pln_amount", "inr_amount", "created_at", "user_id") 
VALUES 
  ('1b110477-8199-4da2-b57f-f5027742f8ef', '2025-12-03', 'SBI PPF', '243', '6000', '2025-12-03 07:04:36.572843+00', (SELECT id FROM auth.users ORDER BY created_at LIMIT 1)),
  ('234b102b-567a-4ead-a0be-8e2e781d3e8b', '2025-11-07', 'CAR Insurance ', '730', '17500', '2025-11-07 03:26:48.945205+00', (SELECT id FROM auth.users ORDER BY created_at LIMIT 1)),
  ('3c1b70b1-c607-46b1-bb75-68ca0280eef0', '2025-11-06', 'Priyanka', '1000', '25000', '2025-11-07 03:24:32.031096+00', (SELECT id FROM auth.users ORDER BY created_at LIMIT 1)),
  ('5cb19f65-236f-46a8-9ba9-5faec5977c3e', '2025-12-01', 'Amex', '845', '20500', '2025-11-29 05:01:23.680185+00', (SELECT id FROM auth.users ORDER BY created_at LIMIT 1)),
  ('61c84097-9a92-4dda-8098-e08315d3795b', '2025-03-31', 'Papa', '1000', '20000', '2025-05-06 03:13:53.063165+00', (SELECT id FROM auth.users ORDER BY created_at LIMIT 1)),
  ('64eea7e9-3257-4a2d-9335-2beccb8fb5e5', '2026-01-01', 'SBI PPF', '200', '5000', '2025-12-26 11:24:14.302852+00', (SELECT id FROM auth.users ORDER BY created_at LIMIT 1)),
  ('7152c9a6-61c9-437e-887f-90fe23f6b90c', '2025-10-16', 'Papa', '850', '20000', '2025-10-18 06:46:34.11282+00', (SELECT id FROM auth.users ORDER BY created_at LIMIT 1)),
  ('79322e38-e628-4bf0-8d91-2320471dafaf', '2025-05-01', 'Papa', '1200', '25000', '2025-05-06 03:14:31.196027+00', (SELECT id FROM auth.users ORDER BY created_at LIMIT 1)),
  ('8946b4aa-42dc-4415-b3f1-1055cf647cb0', '2025-12-01', 'HDFC', '2700', '65500', '2025-11-29 05:00:25.384364+00', (SELECT id FROM auth.users ORDER BY created_at LIMIT 1)),
  ('dc2218df-e678-4cd3-964d-481bca2595b9', '2025-09-05', 'Zype', '375', '8700', '2025-09-05 04:22:51.088783+00', (SELECT id FROM auth.users ORDER BY created_at LIMIT 1)),
  ('e7bf31ee-d513-47a4-8b26-b61a007c02ac', '2025-07-01', 'Papa', '2100', '50000', '2025-07-05 19:53:20.00451+00', (SELECT id FROM auth.users ORDER BY created_at LIMIT 1))
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

