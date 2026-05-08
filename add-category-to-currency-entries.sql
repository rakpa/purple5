-- Add category field to currency_entries table
-- Run this SQL in your Supabase SQL Editor: https://supabase.com/dashboard/project/ggpxsxanqpapwyqnfivv/sql/new

-- Add category column to currency_entries table
ALTER TABLE public.currency_entries 
ADD COLUMN IF NOT EXISTS category TEXT;

-- Create index on category for faster queries
CREATE INDEX IF NOT EXISTS idx_currency_entries_category ON public.currency_entries USING btree (category) TABLESPACE pg_default;
