import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function formatCurrency(amount: number): string {
  return `${amount.toLocaleString("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} PLN`;
}

/** Case-insensitive key for matching transaction categories to budgets */
export function normalizeCategoryKey(category: string | null | undefined): string {
  return (category ?? "").trim().toLowerCase();
}

/** Prefer the name stored on the user's category list (avoids budget/txn mismatches) */
export function resolveCanonicalCategoryName(
  category: string,
  categories: { name: string }[]
): string {
  const key = normalizeCategoryKey(category);
  const match = categories.find((c) => normalizeCategoryKey(c.name) === key);
  return match?.name.trim() ?? category.trim();
}
