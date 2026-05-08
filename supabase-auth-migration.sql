-- Migration: Add user_id columns and update RLS policies for user-specific data
-- Run this SQL in your Supabase SQL Editor: https://supabase.com/dashboard/project/ggpxsxanqpapwyqnfivv/sql/new

-- Step 1: Add user_id column to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 2: Add user_id column to categories table
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 3: Create indexes for user_id columns
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);

-- Step 4: Drop old RLS policies
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON transactions;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON categories;

-- Step 5: Create new user-specific RLS policies for transactions
CREATE POLICY "Users can view their own transactions" ON transactions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions" ON transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions" ON transactions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions" ON transactions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Step 6: Create new user-specific RLS policies for categories
CREATE POLICY "Users can view their own categories" ON categories
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories" ON categories
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories" ON categories
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories" ON categories
  FOR DELETE
  USING (auth.uid() = user_id);

-- Step 7: Update unique constraint on categories to include user_id
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_type_key;
CREATE UNIQUE INDEX IF NOT EXISTS categories_user_name_type_unique 
ON categories(user_id, name, type);

-- Step 8: Enable Google OAuth provider (if not already enabled)
-- Note: This needs to be done in Supabase Dashboard > Authentication > Providers
-- Go to: https://supabase.com/dashboard/project/ggpxsxanqpapwyqnfivv/auth/providers
-- Enable Google provider and add your OAuth credentials


