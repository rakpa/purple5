import { supabase } from './supabase';
import type { CategoryBudget, CategoryBudgetInsert } from '@/types/budget';

async function getCurrentUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user.id;
}

export async function getBudgets(month: number, year: number) {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('category_budgets')
    .select('*')
    .eq('user_id', userId)
    .eq('month', month)
    .eq('year', year)
    .order('category', { ascending: true });

  if (error) {
    if (error.code === 'PGRST116' || error.message.includes('relation')) {
      throw new Error('Budget table not found. Please run supabase-budgets-setup.sql in your Supabase dashboard.');
    }
    throw new Error(error.message);
  }

  return (data || []) as CategoryBudget[];
}

export async function upsertBudget(data: CategoryBudgetInsert) {
  const userId = await getCurrentUserId();
  const { data: budget, error } = await supabase
    .from('category_budgets')
    .upsert(
      { ...data, user_id: userId, updated_at: new Date().toISOString() },
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
