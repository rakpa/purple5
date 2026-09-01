import { supabase } from "./supabase";
import type { TransactionInsert } from "@/types/transaction";
import { resolveCanonicalCategoryName } from "./utils";
import { getCategories } from "./categories";

export interface PlaidAccount {
  account_id: string;
  name: string;
  official_name: string | null;
  type: string;
  subtype: string | null;
  mask: string | null;
  iso_currency_code: string | null;
  available: number | null;
  current: number | null;
}

export interface PlaidItem {
  item_id: string;
  institution_id: string | null;
  institution_name: string;
  cursor: string;
  accounts: PlaidAccount[];
  created_at: string;
  updated_at: string;
}

export interface PlaidInstitution {
  institution_id: string;
  name: string;
}

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

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (data.session?.access_token) {
    headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  return headers;
}

async function plaidFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/plaid/${path}`, {
    ...init,
    headers: {
      ...(await authHeaders()),
      ...(init?.headers || {}),
    },
  });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || `Plaid request failed (${response.status})`);
  }
  return payload;
}

export function getPlaidInstitutions() {
  return plaidFetch<{ env: string; country_codes: string[]; institutions: PlaidInstitution[] }>(
    "institutions"
  );
}

export function getPlaidItems() {
  return plaidFetch<{ items: PlaidItem[] }>("items");
}

export function createPlaidLinkToken(redirectUri?: string) {
  return plaidFetch<{
    link_token: string;
    expiration: string;
    env: string;
    country_codes: string[];
    redirect_uri_skipped?: boolean;
  }>("create-link-token", {
    method: "POST",
    body: JSON.stringify(redirectUri ? { redirect_uri: redirectUri } : {}),
  });
}

export function exchangePlaidPublicToken(publicToken: string) {
  return plaidFetch<{ item: PlaidItem }>("exchange", {
    method: "POST",
    body: JSON.stringify({ public_token: publicToken }),
  });
}

export function connectPolandSandboxBank(institutionId: string) {
  return plaidFetch<{ item: PlaidItem; transactions: MappedPlaidTransaction[] }>(
    "sandbox-connect",
    {
      method: "POST",
      body: JSON.stringify({ institution_id: institutionId }),
    }
  );
}

export function syncPlaidItem(itemId: string) {
  return plaidFetch<{ item: PlaidItem; transactions: MappedPlaidTransaction[] }>("sync", {
    method: "POST",
    body: JSON.stringify({ item_id: itemId }),
  });
}

export function unlinkPlaidItem(itemId: string) {
  return plaidFetch<{ ok: boolean }>("unlink", {
    method: "POST",
    body: JSON.stringify({ item_id: itemId }),
  });
}

export async function importPlaidTransactions(transactions: MappedPlaidTransaction[]) {
  if (transactions.length === 0) {
    return { imported: 0, skipped: 0 };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated");
  }

  const [expenseCategories, incomeCategories] = await Promise.all([
    getCategories("expense"),
    getCategories("income"),
  ]);

  const withIds = await supabase
    .from("transactions")
    .select("id, date, amount, description, plaid_transaction_id")
    .eq("user_id", user.id);

  const existing = withIds.error
    ? await supabase
        .from("transactions")
        .select("id, date, amount, description")
        .eq("user_id", user.id)
    : withIds;

  const existingRows = (existing.error ? [] : existing.data || []) as Array<{
    id: string;
    date: string;
    amount: number | string;
    description: string | null;
    plaid_transaction_id?: string | null;
  }>;
  const existingIds = new Set(
    existingRows
      .map((row) => row.plaid_transaction_id)
      .filter((id): id is string => Boolean(id))
  );
  const existingFingerprints = new Set(
    existingRows.map(
      (row) =>
        `${row.date}|${Number(row.amount).toFixed(2)}|${(row.description || "").toLowerCase()}`
    )
  );

  const rows: Array<TransactionInsert & {
    user_id: string;
    source: string;
    plaid_transaction_id: string;
    plaid_account_id: string;
  }> = [];

  for (const txn of transactions) {
    if (existingIds.has(txn.plaid_transaction_id)) continue;
    const fingerprint = `${txn.date}|${txn.amount.toFixed(2)}|${txn.description.toLowerCase()}`;
    if (existingFingerprints.has(fingerprint)) continue;
    const categories = txn.type === "income" ? incomeCategories : expenseCategories;
    rows.push({
      user_id: user.id,
      type: txn.type,
      amount: txn.amount,
      date: txn.date,
      description: txn.description,
      category: resolveCanonicalCategoryName(txn.category, categories),
      source: "plaid",
      plaid_transaction_id: txn.plaid_transaction_id,
      plaid_account_id: txn.plaid_account_id,
    });
    existingIds.add(txn.plaid_transaction_id);
    existingFingerprints.add(fingerprint);
  }

  if (rows.length === 0) {
    return { imported: 0, skipped: transactions.length };
  }

  const withMeta = await supabase.from("transactions").insert(rows).select("id");
  if (!withMeta.error) {
    return {
      imported: withMeta.data?.length || rows.length,
      skipped: transactions.length - rows.length,
    };
  }

  const missingColumn =
    /plaid_transaction_id|plaid_account_id|column.*source|schema cache/i.test(
      withMeta.error.message
    );
  if (!missingColumn) {
    throw new Error(withMeta.error.message);
  }

  const basicRows = rows.map(({ source: _source, plaid_transaction_id: _id, plaid_account_id: _account, ...rest }) => rest);
  const fallback = await supabase.from("transactions").insert(basicRows).select("id");
  if (fallback.error) {
    throw new Error(fallback.error.message);
  }

  return {
    imported: fallback.data?.length || basicRows.length,
    skipped: transactions.length - basicRows.length,
  };
}
