export interface CategoryBudget {
  id: string;
  user_id: string;
  category: string;
  amount: number;
  month: number;
  year: number;
  created_at: string;
  updated_at: string;
}

export interface CategoryBudgetInsert {
  category: string;
  amount: number;
  month: number;
  year: number;
}
