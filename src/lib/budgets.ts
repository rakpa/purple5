import { supabase } from './supabase';
import type { CategoryBudget, CategoryBudgetInsert } from '@/types/budget';

async function getCurrentUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user.id;
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
  const explicitCategories = new Set(explicit.map((b) => b.category));
  const merged = [...explicit];

  const recurringByCategory = new Map<string, CategoryBudget>();
  recurring
    .sort((a, b) => periodValue(b.year, b.month) - periodValue(a.year, a.month))
    .forEach((budget) => {
      if (periodValue(budget.year, budget.month) <= targetPeriod) {
        recurringByCategory.set(budget.category, budget);
      }
    });

  recurringByCategory.forEach((budget) => {
    if (!explicitCategories.has(budget.category)) {
      merged.push({
        ...budget,
        month,
        year,
      });
    }
  });

  return merged.sort((a, b) => a.category.localeCompare(b.category));
}

export async function getBudgets(month: number, year: number) {
  const userId = await getCurrentUserId();

  const [monthlyResult, recurringResult] = await Promise.all([
    supabase
      .from('category_budgets')
      .select('*')
      .eq('user_id', userId)
      .eq('month', month)
      .eq('year', year)
      .order('category', { ascending: true }),
    supabase
      .from('category_budgets')
      .select('*')
      .eq('user_id', userId)
      .eq('repeat_monthly', true)
      .order('category', { ascending: true }),
  ]);

  const error = monthlyResult.error || recurringResult.error;
  if (error) {
    if (error.code === 'PGRST116' || error.message.includes('relation')) {
      throw new Error('Budget table not found. Please run supabase-budgets-setup.sql in your Supabase dashboard.');
    }
    if (error.message.includes('repeat_monthly')) {
      throw new Error('Please run supabase-budgets-repeat-migration.sql in your Supabase dashboard.');
    }
    throw new Error(error.message);
  }

  const explicit = (monthlyResult.data || []) as CategoryBudget[];
  const recurring = (recurringResult.data || []) as CategoryBudget[];

  return mergeBudgetsForPeriod(explicit, recurring, month, year);
}

export async function upsertBudget(data: CategoryBudgetInsert) {
  const userId = await getCurrentUserId();
  const repeatMonthly = data.repeat_monthly ?? false;

  if (repeatMonthly) {
    const { error: clearError } = await supabase
      .from('category_budgets')
      .update({ repeat_monthly: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('category', data.category)
      .eq('repeat_monthly', true);

    if (clearError) {
      throw new Error(clearError.message);
    }
  }

  const { data: budget, error } = await supabase
    .from('category_budgets')
    .upsert(
      {
        ...data,
        repeat_monthly: repeatMonthly,
        user_id: userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,category,month,year' }
    )
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return budget as CategoryBudget;
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
