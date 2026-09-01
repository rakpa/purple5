-- Gmail connection for Credit Agricole (and other) statement PDFs
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/ggpxsxanqpapwyqnfivv/sql/new

CREATE TABLE IF NOT EXISTS gmail_connections (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  refresh_token TEXT NOT NULL,
  access_token TEXT,
  access_token_expires_at TIMESTAMP WITH TIME ZONE,
  statement_password TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE gmail_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own gmail connection" ON gmail_connections;
DROP POLICY IF EXISTS "Users can insert their own gmail connection" ON gmail_connections;
DROP POLICY IF EXISTS "Users can update their own gmail connection" ON gmail_connections;
DROP POLICY IF EXISTS "Users can delete their own gmail connection" ON gmail_connections;

CREATE POLICY "Users can view their own gmail connection" ON gmail_connections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own gmail connection" ON gmail_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own gmail connection" ON gmail_connections
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own gmail connection" ON gmail_connections
  FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS plaid_transaction_id TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS plaid_account_id TEXT;
