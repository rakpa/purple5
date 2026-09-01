import { supabase } from "./supabase";
import { importPlaidTransactions, type MappedPlaidTransaction } from "./plaid";

const STATEMENT_PASSWORD_KEY = "expensetrack.credit-agricole-pdf-password";

export function getStoredStatementPassword() {
  try {
    return localStorage.getItem(STATEMENT_PASSWORD_KEY) || "";
  } catch {
    return "";
  }
}

export function storeStatementPassword(password: string) {
  try {
    if (password) localStorage.setItem(STATEMENT_PASSWORD_KEY, password);
  } catch {
    /* ignore quota / private mode */
  }
}

export interface GmailStatus {
  connected: boolean;
  email?: string | null;
  has_password?: boolean;
  updated_at?: string | null;
}

export interface GmailStatement {
  gmail_message_id: string;
  subject: string;
  from: string;
  date: string;
  filename: string;
  period_start: string | null;
  period_end: string | null;
  bank: string;
  text_preview?: string;
  transaction_count: number;
}

export interface GmailTransaction extends MappedPlaidTransaction {
  description_en?: string;
}

export interface GmailCategoryGroup {
  category: string;
  count: number;
  expense: number;
  income: number;
  transactions: GmailTransaction[];
}

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (data.session?.access_token) {
    headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  return headers;
}

async function gmailFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/gmail/${path}`, {
    ...init,
    headers: {
      ...(await authHeaders()),
      ...(init?.headers || {}),
    },
  });
  const raw = await response.text();
  let payload: T & { error?: string; code?: string } = {} as T & { error?: string; code?: string };
  try {
    payload = raw ? (JSON.parse(raw) as T & { error?: string; code?: string }) : payload;
  } catch {
    payload = { error: raw.replace(/\s+/g, " ").slice(0, 180) } as T & { error?: string; code?: string };
  }
  if (!response.ok) {
    const error = new Error(payload.error || `Gmail request failed (${response.status})`) as Error & {
      code?: string;
    };
    error.code = payload.code;
    throw error;
  }
  return payload;
}

export function getGmailStatus() {
  return gmailFetch<GmailStatus>("status");
}

export function startGmailConnect(redirectUri: string, returnTo = "/settings") {
  return gmailFetch<{ url: string }>("auth", {
    method: "POST",
    body: JSON.stringify({ redirect_uri: redirectUri, return_to: returnTo }),
  });
}

export function finishGmailConnect(code: string, state: string, redirectUri: string) {
  return gmailFetch<{ ok: boolean; email: string | null }>("exchange", {
    method: "POST",
    body: JSON.stringify({ code, state, redirect_uri: redirectUri }),
  });
}

export function saveGmailStatementPassword(statementPassword: string) {
  storeStatementPassword(statementPassword);
  return gmailFetch<{ ok: boolean; has_password: boolean }>("password", {
    method: "POST",
    body: JSON.stringify({ statement_password: statementPassword }),
  }).catch(() => ({ ok: true, has_password: true }));
}

export function disconnectGmail() {
  return gmailFetch<{ ok: boolean }>("disconnect", { method: "POST", body: "{}" });
}

export function saveGmailSessionTokens(payload: {
  email?: string | null;
  access_token?: string | null;
  refresh_token?: string | null;
  expires_in?: number;
}) {
  return gmailFetch<{ ok: boolean; email: string | null }>("session", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface GmailStatementMatch {
  gmail_message_id: string;
  subject: string;
  from: string;
  date: string;
  snippet?: string;
  bank: string;
}

export function searchGmailStatements(options?: {
  query?: string;
  googleAccessToken?: string | null;
}) {
  return gmailFetch<{
    email?: string;
    statements: GmailStatementMatch[];
    message?: string;
  }>("search", {
    method: "POST",
    body: JSON.stringify({
      query: options?.query,
      google_access_token: options?.googleAccessToken || undefined,
    }),
  });
}

export function fetchGmailStatements(options?: {
  statementPassword?: string;
  query?: string;
  googleAccessToken?: string | null;
  messageId?: string;
}) {
  return gmailFetch<{
    email?: string;
    statements: GmailStatement[];
    transactions: GmailTransaction[];
    categories: GmailCategoryGroup[];
    message?: string;
  }>("statements", {
    method: "POST",
    body: JSON.stringify({
      statement_password: options?.statementPassword,
      query: options?.query,
      google_access_token: options?.googleAccessToken || undefined,
      message_id: options?.messageId || undefined,
    }),
  });
}

export function importGmailTransactions(transactions: GmailTransaction[]) {
  return importPlaidTransactions(
    transactions.map((txn) => ({
      ...txn,
      description: txn.description_en || txn.description,
    }))
  );
}
