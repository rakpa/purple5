-- Create categories table for Finance 2 project
-- Run this SQL in your Supabase SQL Editor: https://supabase.com/dashboard/project/ggpxsxanqpapwyqnfivv/sql/new

CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, type)
);

-- Create index on type for faster queries
CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

-- Enable Row Level Security (RLS)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations (you can customize this based on your auth requirements)
CREATE POLICY "Allow all operations for authenticated users" ON categories
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create a function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_categories_updated_at();

-- Insert default categories
INSERT INTO categories (name, icon, type) VALUES
  ('food', 'UtensilsCrossed', 'expense'),
  ('transport', 'Car', 'expense'),
  ('utilities', 'Zap', 'expense'),
  ('entertainment', 'Film', 'expense'),
  ('shopping', 'ShoppingBag', 'expense'),
  ('health', 'Heart', 'expense'),
  ('salary', 'Briefcase', 'income'),
  ('freelance', 'Code', 'income'),
  ('investment', 'TrendingUp', 'income'),
  ('other', 'Circle', 'expense')
ON CONFLICT (name, type) DO NOTHING;


