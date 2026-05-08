export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  date: string;
  description: string | null;
  category: string;
  created_at: string;
  updated_at: string;
}

export interface TransactionInsert {
  type: TransactionType;
  amount: number;
  date: string;
  description?: string | null;
  category: string;
}

