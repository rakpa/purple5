import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { POLISH_BANKS } from "./polish-institutions";
import { mapPlaidTransaction } from "./plaid-categories";
import {
  deletePlaidItem,
  getPlaidItem,
  listPlaidItems,
  publicItem,
  savePlaidItem,
  type StoredPlaidAccount,
  type StoredPlaidItem,
} from "./plaid-store";

export interface PlaidApiRequest {
  method: string;
  action: string;
  body: Record<string, unknown>;
  authorization?: string;
}

export interface PlaidApiResponse {
  status: number;
  body: unknown;
}

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function plaidEnvName() {
  return (process.env.PLAID_ENV || "production").toLowerCase();
}

function plaidHost() {
  const env = plaidEnvName();
  if (env === "development") return "https://development.plaid.com";
  return "https://production.plaid.com";
}

function credentials() {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  if (!clientId || !secret) {
    throw new HttpError(
      500,
      "Plaid is not configured. Set PLAID_CLIENT_ID and PLAID_SECRET on Vercel (Production)."
    );
  }
  return { client_id: clientId, secret };
}

async function plaidPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${plaidHost()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...credentials(), ...body }),
  });
  const data = (await response.json().catch(() => ({}))) as T & {
    error_message?: string;
    error_code?: string;
  };
  if (!response.ok) {
    const error = new HttpError(
      response.status >= 400 && response.status < 600 ? response.status : 500,
      data.error_message || `Plaid ${path} failed (${response.status})`
    );
    (error as HttpError & { errorCode?: string }).errorCode = data.error_code;
    throw error;
  }
  return data;
}

function supabaseUrl() {
  return process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
}

function supabaseAnonKey() {
  return process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
}

function userClient(authorization?: string): SupabaseClient | null {
  const url = supabaseUrl();
  const key = supabaseAnonKey();
  if (!url || !key || !authorization) return null;
  return createClient(url, key, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function requireUserId(authorization?: string) {
  const client = userClient(authorization);
  if (client) {
    const { data, error } = await client.auth.getUser();
    if (!error && data.user) {
      return data.user.id;
    }
  }

  throw new HttpError(401, "Sign in required to connect a bank.");
}

function toStoredAccounts(
  accounts: Array<{
    account_id: string;
    name: string;
    official_name?: string | null;
    type: string;
    subtype?: string | null;
    mask?: string | null;
    balances: {
      available?: number | null;
      current?: number | null;
      iso_currency_code?: string | null;
    };
  }>
): StoredPlaidAccount[] {
  return accounts.map((account) => ({
    account_id: account.account_id,
    name: account.name,
    official_name: account.official_name ?? null,
    type: account.type,
    subtype: account.subtype ?? null,
    mask: account.mask ?? null,
    iso_currency_code: account.balances.iso_currency_code ?? "PLN",
    available: account.balances.available ?? null,
    current: account.balances.current ?? null,
  }));
}

async function persistItem(userId: string, item: StoredPlaidItem, authorization?: string) {
  try {
    savePlaidItem(userId, item);
  } catch (error) {
    console.warn("Local Plaid store write failed:", error);
  }
  const client = userClient(authorization);
  if (!client) return;
  const { error } = await client.from("plaid_items").upsert(
    {
      user_id: userId,
      item_id: item.item_id,
      access_token: item.access_token,
      institution_id: item.institution_id,
      institution_name: item.institution_name,
      cursor: item.cursor,
      accounts: item.accounts,
      updated_at: item.updated_at,
    },
    { onConflict: "user_id,item_id" }
  );
  if (error && !/schema cache|does not exist|Could not find the table/i.test(error.message)) {
    console.warn("Failed to persist Plaid item in Supabase:", error.message);
  }
}

async function loadItem(
  userId: string,
  itemId: string,
  authorization?: string
): Promise<StoredPlaidItem | null> {
  const fromFile = getPlaidItem(userId, itemId);
  if (fromFile) return fromFile;

  const client = userClient(authorization);
  if (!client) return null;
  const { data, error } = await client
    .from("plaid_items")
    .select("*")
    .eq("user_id", userId)
    .eq("item_id", itemId)
    .maybeSingle();
  if (error || !data) return null;

  const item: StoredPlaidItem = {
    item_id: data.item_id,
    access_token: data.access_token,
    institution_id: data.institution_id,
    institution_name: data.institution_name,
    cursor: data.cursor || "",
    accounts: data.accounts || [],
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
  try {
    savePlaidItem(userId, item);
  } catch {
    // ignore
  }
  return item;
}

async function listItems(userId: string, authorization?: string) {
  const fromFile = listPlaidItems(userId);
  const client = userClient(authorization);
  if (!client) return fromFile.map(publicItem);

  const { data, error } = await client
    .from("plaid_items")
    .select("item_id, institution_id, institution_name, cursor, accounts, created_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return fromFile.map(publicItem);

  const merged = new Map<string, ReturnType<typeof publicItem>>();
  for (const item of fromFile) {
    merged.set(item.item_id, publicItem(item));
  }
  for (const row of data) {
    merged.set(row.item_id, {
      item_id: row.item_id,
      institution_id: row.institution_id,
      institution_name: row.institution_name,
      cursor: row.cursor || "",
      accounts: row.accounts || [],
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
  }
  return Array.from(merged.values());
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

type PlaidAccountsResponse = {
  accounts: Parameters<typeof toStoredAccounts>[0];
  item: { item_id: string; institution_id?: string | null; institution_name?: string | null };
};

async function exchangeAndStore(userId: string, publicToken: string, authorization?: string) {
  const exchange = await plaidPost<{ access_token: string; item_id: string }>(
    "/item/public_token/exchange",
    { public_token: publicToken }
  );
  const accountsResponse = await plaidPost<PlaidAccountsResponse>("/accounts/get", {
    access_token: exchange.access_token,
  });
  const institutionName =
    accountsResponse.item.institution_name ||
    POLISH_BANKS.find((bank) => bank.institution_id === accountsResponse.item.institution_id)
      ?.name ||
    "Poland bank";

  const now = new Date().toISOString();
  const item: StoredPlaidItem = {
    item_id: exchange.item_id,
    access_token: exchange.access_token,
    institution_id: accountsResponse.item.institution_id ?? null,
    institution_name: institutionName,
    cursor: "",
    accounts: toStoredAccounts(accountsResponse.accounts),
    created_at: now,
    updated_at: now,
  };
  await persistItem(userId, item, authorization);
  return publicItem(item);
}

type PlaidSyncResponse = {
  added: Array<{
    transaction_id: string;
    account_id: string;
    amount: number;
    date: string;
    name?: string | null;
    merchant_name?: string | null;
    iso_currency_code?: string | null;
    pending?: boolean;
    category?: string[] | null;
    personal_finance_category?: { primary?: string | null; detailed?: string | null } | null;
  }>;
  has_more: boolean;
  next_cursor: string;
};

async function syncTransactions(item: StoredPlaidItem) {
  const added: PlaidSyncResponse["added"] = [];
  const isInitial = !item.cursor;
  let cursor = item.cursor || undefined;
  let attempts = 0;
  const maxAttempts = process.env.VERCEL ? 3 : 8;

  while (true) {
    try {
      const response = await plaidPost<PlaidSyncResponse>("/transactions/sync", {
        access_token: item.access_token,
        cursor,
        count: 100,
      });
      added.push(...response.added);
      cursor = response.next_cursor;

      if (response.has_more) {
        continue;
      }

      if (isInitial && added.length === 0 && attempts < maxAttempts) {
        attempts += 1;
        cursor = undefined;
        added.length = 0;
        await sleep(process.env.VERCEL ? 700 : 1500);
        continue;
      }
      break;
    } catch (error: unknown) {
      const err = error as HttpError & { errorCode?: string };
      if (err.errorCode === "PRODUCT_NOT_READY" && attempts < maxAttempts) {
        attempts += 1;
        await sleep(process.env.VERCEL ? 700 : 1500);
        continue;
      }
      throw error;
    }
  }

  item.cursor = cursor || item.cursor;
  item.updated_at = new Date().toISOString();

  return added
    .filter((txn) => !txn.pending && txn.amount !== 0)
    .map(mapPlaidTransaction);
}

function plaidErrorMessage(error: unknown) {
  if (error instanceof HttpError) return error.message;
  const err = error as { message?: string };
  return err.message || "Plaid request failed";
}

export async function handlePlaidApi(req: PlaidApiRequest): Promise<PlaidApiResponse> {
  try {
    if (req.method === "OPTIONS") {
      return { status: 204, body: null };
    }

    const action = req.action.replace(/^\//, "");

    if (req.method === "GET" && (action === "institutions" || action === "")) {
      return {
        status: 200,
        body: {
          env: plaidEnvName(),
          country_codes: ["PL"],
          institutions: POLISH_BANKS,
        },
      };
    }

    const userId = await requireUserId(req.authorization);

    if (req.method === "GET" && action === "items") {
      return { status: 200, body: { items: await listItems(userId, req.authorization) } };
    }

    if (req.method === "POST" && action === "create-link-token") {
      const redirectUri =
        (typeof req.body.redirect_uri === "string" && req.body.redirect_uri) ||
        process.env.PLAID_REDIRECT_URI ||
        "";
      if (!redirectUri) {
        throw new HttpError(
          400,
          "Revolut Open Banking needs a redirect URI. Add https://purple5.vercel.app/banks in Plaid Dashboard → Allowed redirect URIs, and set PLAID_REDIRECT_URI."
        );
      }

      const payload: Record<string, unknown> = {
        user: { client_user_id: userId },
        client_name: "ExpenseTrack",
        language: "en",
        country_codes: ["PL"],
        products: ["transactions"],
        transactions: { days_requested: 180 },
        redirect_uri: redirectUri,
      };
      if (typeof req.body.institution_id === "string" && req.body.institution_id) {
        payload.institution_id = req.body.institution_id;
      }

      try {
        const created = await plaidPost<{ link_token: string; expiration: string }>(
          "/link/token/create",
          payload
        );
        return {
          status: 200,
          body: {
            link_token: created.link_token,
            expiration: created.expiration,
            env: plaidEnvName(),
            country_codes: ["PL"],
          },
        };
      } catch (error: unknown) {
        const message = plaidErrorMessage(error);
        if (redirectUri && /redirect|oauth/i.test(message)) {
          throw new HttpError(
            400,
            `Add this exact URL in Plaid Dashboard → Team Settings → API → Allowed redirect URIs: ${redirectUri}`
          );
        }
        throw error;
      }
    }

    if (req.method === "POST" && action === "exchange") {
      const publicToken = String(req.body.public_token || "");
      if (!publicToken) throw new HttpError(400, "public_token is required");
      const item = await exchangeAndStore(userId, publicToken, req.authorization);
      const stored = await loadItem(userId, item.item_id, req.authorization);
      const transactions = stored ? await syncTransactions(stored) : [];
      if (stored) await persistItem(userId, stored, req.authorization);
      return {
        status: 200,
        body: { item: stored ? publicItem(stored) : item, transactions },
      };
    }

    if (req.method === "POST" && action === "sync") {
      const itemId = String(req.body.item_id || "");
      if (!itemId) throw new HttpError(400, "item_id is required");
      const stored = await loadItem(userId, itemId, req.authorization);
      if (!stored) throw new HttpError(404, "Connected bank not found.");
      const transactions = await syncTransactions(stored);
      await persistItem(userId, stored, req.authorization);
      return {
        status: 200,
        body: { item: publicItem(stored), transactions },
      };
    }

    if (req.method === "POST" && action === "unlink") {
      const itemId = String(req.body.item_id || "");
      if (!itemId) throw new HttpError(400, "item_id is required");
      const stored = await loadItem(userId, itemId, req.authorization);
      if (stored) {
        try {
          await plaidPost("/item/remove", { access_token: stored.access_token });
        } catch (error) {
          console.warn("Plaid item/remove failed:", plaidErrorMessage(error));
        }
      }
      deletePlaidItem(userId, itemId);
      const supabase = userClient(req.authorization);
      if (supabase) {
        await supabase.from("plaid_items").delete().eq("user_id", userId).eq("item_id", itemId);
      }
      return { status: 200, body: { ok: true } };
    }

    throw new HttpError(404, `Unknown Plaid API route: ${action}`);
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return { status: error.status, body: { error: error.message } };
    }
    console.error("Plaid API error:", error);
    return { status: 500, body: { error: plaidErrorMessage(error) } };
  }
}

export function actionFromUrl(url = "") {
  const path = url.split("?")[0];
  const match = path.match(/\/api\/plaid\/?([^/]*)/);
  return match?.[1] || "";
}

export async function runVercelPlaidHandler(
  action: string,
  req: {
    method?: string;
    body?: unknown;
    headers: Record<string, string | string[] | undefined>;
  },
  res: {
    status: (code: number) => { json: (body: unknown) => void; end: () => void };
  }
) {
  try {
    const authorizationHeader = req.headers.authorization;
    const authorization = Array.isArray(authorizationHeader)
      ? authorizationHeader[0]
      : authorizationHeader;
    const body =
      req.body && typeof req.body === "object" && !Array.isArray(req.body)
        ? (req.body as Record<string, unknown>)
        : {};

    const result = await handlePlaidApi({
      method: req.method || "GET",
      action,
      body,
      authorization,
    });

    const response = res.status(result.status);
    if (result.body === null) {
      response.end();
      return;
    }
    response.json(result.body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Plaid function failed";
    console.error("Plaid Vercel function crash:", error);
    res.status(500).json({ error: message });
  }
}
