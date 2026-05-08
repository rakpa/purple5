-- Create transactions table for Finance 2 project
-- Run this SQL in your Supabase SQL Editor: https://supabase.com/dashboard/project/ggpxsxanqpapwyqnfivv/sql/new

CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount DECIMAL(10, 2) NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on date for faster queries
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations (you can customize this based on your auth requirements)
-- For now, we'll allow all operations. In production, you should restrict this based on user authentication.
CREATE POLICY "Allow all operations for authenticated users" ON transactions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- If you want to allow anonymous access (for development), use this policy instead:
-- CREATE POLICY "Allow all operations" ON transactions
--   FOR ALL
--   USING (true)
--   WITH CHECK (true);

-- Create a function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


