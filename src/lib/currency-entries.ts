import { supabase } from './supabase';
import type { CurrencyEntry, CurrencyEntryInsert, CurrencyEntryUpdate } from '@/types/currency-entry';

async function getCurrentUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user.id;
}

export async function getCurrencyEntries(filters?: {
  startDate?: string;
  endDate?: string;
}) {
  try {
    const userId = await getCurrentUserId();
    let query = supabase
      .from('currency_entries')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters?.startDate) {
      query = query.gte('date', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('date', filters.endDate);
    }

    const { data, error } = await query;

    if (error) {
      if (error.message?.includes('404') || error.message?.includes('NOT_FOUND') || error.code === 'NOT_FOUND') {
        throw new Error('Supabase connection failed. Please check your environment variables.');
      }
      throw new Error(error.message);
    }

    return (data || []) as CurrencyEntry[];
  } catch (error) {
    console.error('Error in getCurrencyEntries:', error);
    throw error;
  }
}

export async function createCurrencyEntry(data: Omit<CurrencyEntryInsert, 'user_id'>) {
  const userId = await getCurrentUserId();
  const { data: entry, error } = await supabase
    .from('currency_entries')
    .insert([{ ...data, user_id: userId }])
    .select()
    .single();

  if (error) {
    if (error.message?.includes('404') || error.message?.includes('NOT_FOUND') || error.code === 'NOT_FOUND') {
      throw new Error('Supabase connection failed. Please check your environment variables.');
    }
    throw new Error(error.message);
  }

  return entry as CurrencyEntry;
}

export async function updateCurrencyEntry(id: string, data: CurrencyEntryUpdate) {
  const userId = await getCurrentUserId();
  const { data: entry, error } = await supabase
    .from('currency_entries')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    if (error.message?.includes('404') || error.message?.includes('NOT_FOUND') || error.code === 'NOT_FOUND') {
      throw new Error('Supabase connection failed. Please check your environment variables.');
    }
    throw new Error(error.message);
  }

  return entry as CurrencyEntry;
}

export async function deleteCurrencyEntry(id: string) {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('currency_entries')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    if (error.message?.includes('404') || error.message?.includes('NOT_FOUND') || error.code === 'NOT_FOUND') {
      throw new Error('Supabase connection failed. Please check your environment variables.');
    }
    throw new Error(error.message);
  }
}

