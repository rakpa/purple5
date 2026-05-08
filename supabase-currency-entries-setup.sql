-- Create currency_entries table for India page
-- Run this SQL in your Supabase SQL Editor: https://supabase.com/dashboard/project/ggpxsxanqpapwyqnfivv/sql/new

-- Create the table
CREATE TABLE IF NOT EXISTS public.currency_entries (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4(),
  date DATE NOT NULL,
  description TEXT NOT NULL,
  pln_amount NUMERIC NOT NULL,
  inr_amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  user_id UUID NULL,
  CONSTRAINT currency_entries_pkey PRIMARY KEY (id),
  CONSTRAINT currency_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Create indexes
CREATE INDEX IF NOT EXISTS currency_entries_date_idx ON public.currency_entries USING btree (date) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_currency_entries_user_id ON public.currency_entries USING btree (user_id) TABLESPACE pg_default;

-- Enable Row Level Security
ALTER TABLE public.currency_entries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own currency entries" ON public.currency_entries;
DROP POLICY IF EXISTS "Users can insert their own currency entries" ON public.currency_entries;
DROP POLICY IF EXISTS "Users can update their own currency entries" ON public.currency_entries;
DROP POLICY IF EXISTS "Users can delete their own currency entries" ON public.currency_entries;

-- Create RLS policies
CREATE POLICY "Users can view their own currency entries"
  ON public.currency_entries
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own currency entries"
  ON public.currency_entries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own currency entries"
  ON public.currency_entries
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own currency entries"
  ON public.currency_entries
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_currency_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_currency_entries_updated_at ON public.currency_entries;
CREATE TRIGGER update_currency_entries_updated_at
  BEFORE UPDATE ON public.currency_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_currency_entries_updated_at();

