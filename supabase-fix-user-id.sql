-- Fix: Add user_id to existing tables or create them if they don't exist
-- Run this SQL in your Supabase SQL Editor: https://supabase.com/dashboard/project/ggpxsxanqpapwyqnfivv/sql/new
-- This script handles both cases: existing tables and new tables

-- ============================================
-- STEP 1: Handle transactions table
-- ============================================

-- Check if transactions table exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'transactions') THEN
    CREATE TABLE transactions (
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
    
    -- Create indexes
    CREATE INDEX idx_transactions_date ON transactions(date DESC);
    CREATE INDEX idx_transactions_type ON transactions(type);
    CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
    CREATE INDEX idx_transactions_user_id ON transactions(user_id);
  ELSE
    -- Table exists, add user_id column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'transactions' AND column_name = 'user_id'
    ) THEN
      ALTER TABLE transactions 
      ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
      
      CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
    END IF;
  END IF;
END $$;

-- ============================================
-- STEP 2: Handle categories table
-- ============================================

-- Check if categories table exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'categories') THEN
    CREATE TABLE categories (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Create indexes
    CREATE INDEX idx_categories_type ON categories(type);
    CREATE INDEX idx_categories_name ON categories(name);
    CREATE INDEX idx_categories_user_id ON categories(user_id);
    
    -- Create unique constraint
    CREATE UNIQUE INDEX categories_user_name_type_unique 
    ON categories(user_id, name, type);
  ELSE
    -- Table exists, add user_id column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'categories' AND column_name = 'user_id'
    ) THEN
      ALTER TABLE categories 
      ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
      
      CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
      
      -- Update unique constraint
      DROP INDEX IF EXISTS categories_name_type_key;
      CREATE UNIQUE INDEX IF NOT EXISTS categories_user_name_type_unique 
      ON categories(user_id, name, type);
    END IF;
  END IF;
END $$;

-- ============================================
-- STEP 3: Enable Row Level Security (RLS)
-- ============================================
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 4: Drop ALL existing RLS policies
-- ============================================
-- Drop all existing policies on transactions
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'transactions') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON transactions';
    END LOOP;
END $$;

-- Drop all existing policies on categories
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'categories') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON categories';
    END LOOP;
END $$;

-- ============================================
-- STEP 5: Create RLS policies for transactions
-- ============================================
DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
CREATE POLICY "Users can view their own transactions" ON transactions
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own transactions" ON transactions;
CREATE POLICY "Users can insert their own transactions" ON transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own transactions" ON transactions;
CREATE POLICY "Users can update their own transactions" ON transactions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own transactions" ON transactions;
CREATE POLICY "Users can delete their own transactions" ON transactions
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- STEP 6: Create RLS policies for categories
-- ============================================
DROP POLICY IF EXISTS "Users can view their own categories" ON categories;
CREATE POLICY "Users can view their own categories" ON categories
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own categories" ON categories;
CREATE POLICY "Users can insert their own categories" ON categories
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own categories" ON categories;
CREATE POLICY "Users can update their own categories" ON categories
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own categories" ON categories;
CREATE POLICY "Users can delete their own categories" ON categories
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- STEP 7: Create trigger functions
-- ============================================
CREATE OR REPLACE FUNCTION update_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 8: Create triggers
-- ============================================
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_transactions_updated_at();

DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_categories_updated_at();

-- ============================================
-- Setup Complete!
-- ============================================
-- Your tables now have:
-- ✅ user_id columns added (or created with them)
-- ✅ Row Level Security (RLS) enabled
-- ✅ User-specific access policies
-- ✅ Automatic timestamp updates
-- ✅ Proper indexes for performance

