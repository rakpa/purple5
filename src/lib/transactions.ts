import { supabase } from './supabase';
import type { Transaction, TransactionInsert } from '@/types/transaction';

async function getCurrentUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user.id;
}

export async function createTransaction(data: TransactionInsert) {
  const userId = await getCurrentUserId();
  const { data: transaction, error } = await supabase
    .from('transactions')
    .insert([{ ...data, user_id: userId }])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return transaction as Transaction;
}

export async function getTransactions(filters?: {
  type?: 'income' | 'expense';
  startDate?: string;
  endDate?: string;
}) {
  try {
    const userId = await getCurrentUserId();
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters?.type) {
      query = query.eq('type', filters.type);
    }

    if (filters?.startDate) {
      query = query.gte('date', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('date', filters.endDate);
    }

    const { data, error } = await query;

    if (error) {
      // If table doesn't exist or RLS issue, provide helpful error
      if (error.code === 'PGRST116' || error.message.includes('relation') || error.message.includes('permission')) {
        throw new Error('Database table not found. Please run the SQL in supabase-setup.sql in your Supabase dashboard.');
      }
      throw new Error(error.message);
    }

    return (data || []) as Transaction[];
  } catch (error) {
    console.error('Error in getTransactions:', error);
    throw error;
  }
}

export async function updateTransaction(id: string, data: Partial<TransactionInsert>) {
  const userId = await getCurrentUserId();
  const { data: transaction, error } = await supabase
    .from('transactions')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return transaction as Transaction;
}

export async function deleteTransaction(id: string) {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message);
  }
}

