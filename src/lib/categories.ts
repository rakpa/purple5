import { supabase } from './supabase';
import type { Category, CategoryInsert } from '@/types/category';

async function getCurrentUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user.id;
}

export async function getCategories(type?: 'income' | 'expense') {
  const userId = await getCurrentUserId();
  let query = supabase
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true });

  if (type) {
    query = query.eq('type', type);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as Category[];
}

export async function createCategory(data: CategoryInsert) {
  const userId = await getCurrentUserId();
  const { data: category, error } = await supabase
    .from('categories')
    .insert([{ ...data, user_id: userId }])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return category as Category;
}

export async function updateCategory(id: string, data: Partial<CategoryInsert>) {
  const userId = await getCurrentUserId();

  // Fetch current category so we can propagate name changes safely
  const { data: currentCategory, error: currentCategoryError } = await supabase
    .from('categories')
    .select('id, name, type')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (currentCategoryError) {
    throw new Error(currentCategoryError.message);
  }

  const { data: category, error } = await supabase
    .from('categories')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  // Keep historical transactions consistent when category name changes
  if (data.name && data.name !== currentCategory.name) {
    const { error: transactionsUpdateError } = await supabase
      .from('transactions')
      .update({ category: data.name, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('type', currentCategory.type)
      .eq('category', currentCategory.name);

    if (transactionsUpdateError) {
      throw new Error(transactionsUpdateError.message);
    }
  }

  return category as Category;
}

export async function deleteCategory(id: string) {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message);
  }
}

