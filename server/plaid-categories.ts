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

function mapFromLegacyOrName(
  type: "income" | "expense",
  legacy?: string[] | null,
  description?: string
) {
  if (type === "income") return "Other";
  const haystack = `${(legacy || []).join(" ")} ${description || ""}`.toLowerCase();
  if (haystack.includes("taxi") || haystack.includes("uber") || haystack.includes("lyft")) return "TAXI";
  if (haystack.includes("grocery") || haystack.includes("supermarket")) return "Groceries";
  if (
    haystack.includes("food") ||
    haystack.includes("restaurant") ||
    haystack.includes("coffee") ||
    haystack.includes("mcdonald") ||
    haystack.includes("starbucks")
  ) {
    return "Food";
  }
  if (haystack.includes("rent")) return "Poland Rent";
  if (haystack.includes("shop") || haystack.includes("merchandise")) return "Shopping";
  if (haystack.includes("travel") || haystack.includes("airline") || haystack.includes("transport")) {
    return "Transport";
  }
  if (haystack.includes("entertainment")) return "Entertainment";
  return "Other";
}

export function mapPlaidCategory(
  type: "income" | "expense",
  primary?: string | null,
  detailed?: string | null,
  legacy?: string[] | null,
  description?: string
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
  return mapFromLegacyOrName(type, legacy, description);
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
  category?: string[] | null;
  personal_finance_category?: {
    primary?: string | null;
    detailed?: string | null;
  } | null;
}): MappedPlaidTransaction {
  const type: "income" | "expense" = txn.amount < 0 ? "income" : "expense";
  const description = txn.merchant_name || txn.name || "Plaid transaction";
  return {
    plaid_transaction_id: txn.transaction_id,
    plaid_account_id: txn.account_id,
    type,
    amount: Math.abs(Number(txn.amount) || 0),
    date: txn.date,
    description,
    category: mapPlaidCategory(
      type,
      txn.personal_finance_category?.primary,
      txn.personal_finance_category?.detailed,
      txn.category,
      description
    ),
    iso_currency_code: txn.iso_currency_code ?? null,
    pending: Boolean(txn.pending),
  };
}
