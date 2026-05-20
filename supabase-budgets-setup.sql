-- Create category_budgets table for monthly spending limits
-- Run this SQL in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS category_budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2000),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, category, month, year)
);

CREATE INDEX IF NOT EXISTS idx_category_budgets_user_id ON category_budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_category_budgets_period ON category_budgets(user_id, year, month);

ALTER TABLE category_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own budgets" ON category_budgets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own budgets" ON category_budgets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budgets" ON category_budgets
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budgets" ON category_budgets
  FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_category_budgets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_category_budgets_updated_at
  BEFORE UPDATE ON category_budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_category_budgets_updated_at();
