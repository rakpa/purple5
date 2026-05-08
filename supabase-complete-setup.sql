-- Complete Database Setup for Finance 2 with Authentication
-- Run this SQL in your Supabase SQL Editor: https://supabase.com/dashboard/project/ggpxsxanqpapwyqnfivv/sql/new
-- This script will create all tables and set up authentication properly

-- ============================================
-- STEP 1: Create transactions table
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount DECIMAL(10, 2) NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for transactions
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);

-- ============================================
-- STEP 2: Create categories table
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for categories
CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);

-- Create unique constraint on categories (user_id, name, type)
CREATE UNIQUE INDEX IF NOT EXISTS categories_user_name_type_unique 
ON categories(user_id, name, type);

-- ============================================
-- STEP 3: Enable Row Level Security (RLS)
-- ============================================
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 4: Create RLS policies for transactions
-- ============================================
-- Drop old policies if they exist
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON transactions;
DROP POLICY IF EXISTS "Allow all operations" ON transactions;

-- Create user-specific policies for transactions
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

-- ============================================
-- STEP 5: Create RLS policies for categories
-- ============================================
-- Drop old policies if they exist
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON categories;
DROP POLICY IF EXISTS "Allow all operations" ON categories;

-- Create user-specific policies for categories
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

-- ============================================
-- STEP 6: Create trigger functions
-- ============================================
-- Function to update updated_at timestamp for transactions
CREATE OR REPLACE FUNCTION update_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp for categories
CREATE OR REPLACE FUNCTION update_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 7: Create triggers
-- ============================================
-- Trigger for transactions
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_transactions_updated_at();

-- Trigger for categories
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_categories_updated_at();

-- ============================================
-- STEP 8: Insert default categories (optional)
-- Note: These will be created per user when they first sign in
-- ============================================
-- Default categories are now created per user, so we don't insert global defaults

-- ============================================
-- Setup Complete!
-- ============================================
-- Your database is now set up with:
-- ✅ transactions table with user_id
-- ✅ categories table with user_id
-- ✅ Row Level Security (RLS) enabled
-- ✅ User-specific access policies
-- ✅ Automatic timestamp updates
-- ✅ Proper indexes for performance


