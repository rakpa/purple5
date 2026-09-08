-- Plaid item storage for Poland bank linking (live Revolut / Open Banking)
-- Required before connecting a real Revolut account.
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/ggpxsxanqpapwyqnfivv/sql/new

CREATE TABLE IF NOT EXISTS plaid_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  item_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  institution_id TEXT,
  institution_name TEXT,
  cursor TEXT DEFAULT '',
  accounts JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_plaid_items_user_id ON plaid_items(user_id);

ALTER TABLE plaid_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own plaid items" ON plaid_items;
DROP POLICY IF EXISTS "Users can insert their own plaid items" ON plaid_items;
DROP POLICY IF EXISTS "Users can update their own plaid items" ON plaid_items;
DROP POLICY IF EXISTS "Users can delete their own plaid items" ON plaid_items;

CREATE POLICY "Users can view their own plaid items" ON plaid_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own plaid items" ON plaid_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own plaid items" ON plaid_items
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own plaid items" ON plaid_items
  FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS plaid_transaction_id TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS plaid_account_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS transactions_user_plaid_txn_unique
  ON transactions(user_id, plaid_transaction_id)
  WHERE plaid_transaction_id IS NOT NULL;
