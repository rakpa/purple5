export interface MappedPlaidTransaction {
  plaid_transaction_id: string;
  plaid_account_id: string;
  type: "income" | "expense";
  amount: number;
  date: string;
  description: string;
  category: string;
  iso_currency_code: string | null;
  pending: boolean;
}

const DETAILED_EXPENSE: Record<string, string> = {
  TRANSPORTATION_TAXIS_AND_RIDE_SHARES: "TAXI",
  FOOD_AND_DRINK_GROCERIES: "Groceries",
  FOOD_AND_DRINK_FAST_FOOD: "Food",
  FOOD_AND_DRINK_COFFEE: "Food",
  RENT_AND_UTILITIES_RENT: "Poland Rent",
  RENT_AND_UTILITIES_INTERNET_AND_CABLE: "Internet Recharge",
  RENT_AND_UTILITIES_WATER: "Water",
  TRANSFER_OUT_ACCOUNT_TRANSFER: "Priya Poland Transfer",
};

const PRIMARY_EXPENSE: Record<string, string> = {
  FOOD_AND_DRINK: "Food",
  TRANSPORTATION: "Transport",
  TRAVEL: "Transport",
  GENERAL_MERCHANDISE: "Shopping",
  ENTERTAINMENT: "Entertainment",
  RENT_AND_UTILITIES: "Bills",
  LOAN_PAYMENTS: "Bills",
  BANK_FEES: "Bills",
  TRANSFER_OUT: "Priya Poland Transfer",
  MEDICAL: "Other",
  PERSONAL_CARE: "Other",
  GENERAL_SERVICES: "Other",
  GOVERNMENT_AND_NON_PROFIT: "Other",
  HOME_IMPROVEMENT: "Shopping",
};

export function mapPlaidCategory(
  type: "income" | "expense",
  primary?: string | null,
  detailed?: string | null
) {
  if (type === "income") {
    return "Other";
  }
  if (detailed && DETAILED_EXPENSE[detailed]) {
    return DETAILED_EXPENSE[detailed];
  }
  if (primary && PRIMARY_EXPENSE[primary]) {
    return PRIMARY_EXPENSE[primary];
  }
  return "Other";
}

export function mapPlaidTransaction(txn: {
  transaction_id: string;
  account_id: string;
  amount: number;
  date: string;
  name?: string | null;
  merchant_name?: string | null;
  iso_currency_code?: string | null;
  pending?: boolean;
  personal_finance_category?: {
    primary?: string | null;
    detailed?: string | null;
  } | null;
}): MappedPlaidTransaction {
  const type: "income" | "expense" = txn.amount < 0 ? "income" : "expense";
  return {
    plaid_transaction_id: txn.transaction_id,
    plaid_account_id: txn.account_id,
    type,
    amount: Math.abs(Number(txn.amount) || 0),
    date: txn.date,
    description: txn.merchant_name || txn.name || "Plaid transaction",
    category: mapPlaidCategory(
      type,
      txn.personal_finance_category?.primary,
      txn.personal_finance_category?.detailed
    ),
    iso_currency_code: txn.iso_currency_code ?? null,
    pending: Boolean(txn.pending),
  };
}
