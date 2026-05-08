export interface Category {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  type: 'income' | 'expense';
  created_at: string;
  updated_at: string;
}

export interface CategoryInsert {
  name: string;
  icon: string;
  type: 'income' | 'expense';
}

