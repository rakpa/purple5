-- Add repeat_monthly column for recurring budgets
-- Run this in Supabase SQL Editor if category_budgets already exists

ALTER TABLE category_budgets
ADD COLUMN IF NOT EXISTS repeat_monthly BOOLEAN NOT NULL DEFAULT false;
