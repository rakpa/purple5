import { supabase } from './supabase';
import { getCategories } from './categories';
import { normalizeCategoryKey, resolveCanonicalCategoryName } from './utils';
import type { CategoryBudget, CategoryBudgetInsert } from '@/types/budget';

const REPEAT_MIGRATION_SQL =
  "ALTER TABLE category_budgets ADD COLUMN IF NOT EXISTS repeat_monthly BOOLEAN NOT NULL DEFAULT false;";

async function getCurrentUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user.id;
}

function isMissingRepeatColumn(message?: string) {
  return !!message?.includes('repeat_monthly');
}

function repeatMigrationError() {
  return new Error(
    `Repeat monthly requires a database update. Open Supabase → SQL Editor, run:\n${REPEAT_MIGRATION_SQL}`
  );
}

function periodValue(year: number, month: number) {
  return year * 12 + month;
}

function mergeBudgetsForPeriod(
  explicit: CategoryBudget[],
  recurring: CategoryBudget[],
  month: number,
  year: number
): CategoryBudget[] {
  const targetPeriod = periodValue(year, month);
  const explicitCategories = new Set(explicit.map((b) => normalizeCategoryKey(b.category)));
  const merged = [...explicit];

  const recurringByCategory = new Map<string, CategoryBudget>();
  recurring
    .sort((a, b) => periodValue(b.year, b.month) - periodValue(a.year, a.month))
    .forEach((budget) => {
      if (periodValue(budget.year, budget.month) <= targetPeriod) {
        recurringByCategory.set(normalizeCategoryKey(budget.category), budget);
      }
    });

  recurringByCategory.forEach((budget) => {
    if (!explicitCategories.has(normalizeCategoryKey(budget.category))) {
      merged.push({
        ...budget,
        month,
        year,
        repeat_monthly: true,
      });
    }
  });

  return merged.sort((a, b) => a.category.localeCompare(b.category));
}

export async function getBudgets(month: number, year: number) {
  const userId = await getCurrentUserId();

  const monthlyResult = await supabase
    .from('category_budgets')
    .select('*')
    .eq('user_id', userId)
    .eq('month', month)
    .eq('year', year)
    .order('category', { ascending: true });

  if (monthlyResult.error) {
    if (monthlyResult.error.code === 'PGRST116' || monthlyResult.error.message.includes('relation')) {
      throw new Error('Budget table not found. Please run supabase-budgets-setup.sql in your Supabase dashboard.');
    }
    throw new Error(monthlyResult.error.message);
  }

  const explicit = (monthlyResult.data || []).map((b) => ({
    ...b,
    repeat_monthly: b.repeat_monthly ?? false,
  })) as CategoryBudget[];

  const recurringResult = await supabase
    .from('category_budgets')
    .select('*')
    .eq('user_id', userId)
    .eq('repeat_monthly', true)
    .order('category', { ascending: true });

  if (recurringResult.error) {
    if (isMissingRepeatColumn(recurringResult.error.message)) {
      return explicit;
    }
    throw new Error(recurringResult.error.message);
  }

  const recurring = (recurringResult.data || []) as CategoryBudget[];
  return mergeBudgetsForPeriod(explicit, recurring, month, year);
}

export async function upsertBudget(data: CategoryBudgetInsert) {
  const userId = await getCurrentUserId();
  const repeatMonthly = data.repeat_monthly ?? false;
  const expenseCategories = await getCategories('expense');
  const category = resolveCanonicalCategoryName(data.category, expenseCategories);

  if (repeatMonthly) {
    const { error: clearError } = await supabase
      .from('category_budgets')
      .update({ repeat_monthly: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('category', category)
      .eq('repeat_monthly', true);

    if (clearError && isMissingRepeatColumn(clearError.message)) {
      throw repeatMigrationError();
    }
    if (clearError) {
      throw new Error(clearError.message);
    }
  }

  const row = {
    category,
    amount: data.amount,
    month: data.month,
    year: data.year,
    repeat_monthly: repeatMonthly,
    user_id: userId,
    updated_at: new Date().toISOString(),
  };

  let result = await supabase
    .from('category_budgets')
    .upsert(row, { onConflict: 'user_id,category,month,year' })
    .select()
    .single();

  if (result.error && isMissingRepeatColumn(result.error.message)) {
    if (repeatMonthly) {
      throw repeatMigrationError();
    }

    const { repeat_monthly: _removed, ...rowWithoutRepeat } = row;
    result = await supabase
      .from('category_budgets')
      .upsert(rowWithoutRepeat, { onConflict: 'user_id,category,month,year' })
      .select()
      .single();
  }

  if (result.error) {
    throw new Error(result.error.message);
  }

  return {
    ...result.data,
    repeat_monthly: result.data.repeat_monthly ?? false,
  } as CategoryBudget;
}

export async function deleteBudget(id: string) {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('category_budgets')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message);
  }
}
