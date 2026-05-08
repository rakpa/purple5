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

