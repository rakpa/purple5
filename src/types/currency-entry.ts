export interface CurrencyEntry {
  id: string;
  user_id: string;
  date: string;
  description: string;
  category?: string;
  pln_amount: number;
  inr_amount: number;
  created_at: string;
  updated_at: string;
}

export interface CurrencyEntryInsert {
  date: string;
  description: string;
  category?: string;
  pln_amount: number;
  inr_amount: number;
  user_id: string;
}

export interface CurrencyEntryUpdate {
  date?: string;
  description?: string;
  category?: string;
  pln_amount?: number;
  inr_amount?: number;
}

