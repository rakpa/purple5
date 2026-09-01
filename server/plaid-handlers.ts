import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  CountryCode,
  type Transaction as PlaidTransaction,
} from "plaid";
import { POLISH_SANDBOX_BANKS } from "./polish-institutions";
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
  return (process.env.PLAID_ENV || "sandbox").toLowerCase();
}

function getPlaidClient() {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  if (!clientId || !secret) {
    throw new HttpError(
      500,
      "Plaid is not configured. Set PLAID_CLIENT_ID and PLAID_SECRET in the server environment."
    );
  }

  const env = plaidEnvName();
  const basePath =
    env === "production"
      ? PlaidEnvironments.production
      : env === "development"
        ? PlaidEnvironments.development
        : PlaidEnvironments.sandbox;

  return new PlaidApi(
    new Configuration({
      basePath,
      baseOptions: {
        headers: {
          "PLAID-CLIENT-ID": clientId,
          "PLAID-SECRET": secret,
        },
      },
    })
  );
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

  if (plaidEnvName() === "sandbox" && process.env.PLAID_ALLOW_UNAUTHENTICATED === "true") {
    return "sandbox-local";
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
  savePlaidItem(userId, item);
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
  savePlaidItem(userId, item);
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

async function exchangeAndStore(
  client: PlaidApi,
  userId: string,
  publicToken: string,
  authorization?: string
) {
  const exchange = await client.itemPublicTokenExchange({ public_token: publicToken });
  const accessToken = exchange.data.access_token;
  const itemId = exchange.data.item_id;

  const accountsResponse = await client.accountsGet({ access_token: accessToken });
  const institutionName =
    accountsResponse.data.item.institution_name ||
    POLISH_SANDBOX_BANKS.find((bank) => bank.institution_id === accountsResponse.data.item.institution_id)
      ?.name ||
    "Poland bank";

  const now = new Date().toISOString();
  const item: StoredPlaidItem = {
    item_id: itemId,
    access_token: accessToken,
    institution_id: accountsResponse.data.item.institution_id ?? null,
    institution_name: institutionName,
    cursor: "",
    accounts: toStoredAccounts(accountsResponse.data.accounts),
    created_at: now,
    updated_at: now,
  };
  await persistItem(userId, item, authorization);
  return publicItem(item);
}

async function syncTransactions(client: PlaidApi, item: StoredPlaidItem) {
  const added: PlaidTransaction[] = [];
  const isInitial = !item.cursor;
  let cursor = item.cursor || undefined;
  let attempts = 0;

  while (true) {
    try {
      const response = await client.transactionsSync({
        access_token: item.access_token,
        cursor,
        count: 100,
      });
      added.push(...response.data.added);
      cursor = response.data.next_cursor;

      if (response.data.has_more) {
        continue;
      }

      if (isInitial && added.length === 0 && attempts < 8) {
        attempts += 1;
        cursor = undefined;
        added.length = 0;
        await sleep(1500);
        continue;
      }
      break;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error_code?: string } } };
      if (err.response?.data?.error_code === "PRODUCT_NOT_READY" && attempts < 8) {
        attempts += 1;
        await sleep(1500);
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
  const err = error as {
    response?: { data?: { error_message?: string; error_code?: string } };
    message?: string;
  };
  return (
    err.response?.data?.error_message ||
    err.message ||
    "Plaid request failed"
  );
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
          institutions: POLISH_SANDBOX_BANKS,
        },
      };
    }

    const userId = await requireUserId(req.authorization);
    const client = getPlaidClient();

    if (req.method === "GET" && action === "items") {
      return { status: 200, body: { items: await listItems(userId, req.authorization) } };
    }

    if (req.method === "POST" && action === "create-link-token") {
      const redirectUri =
        (typeof req.body.redirect_uri === "string" && req.body.redirect_uri) ||
        process.env.PLAID_REDIRECT_URI ||
        "";

      const request = {
        user: { client_user_id: userId },
        client_name: "ExpenseTrack",
        language: "en" as const,
        country_codes: [CountryCode.Pl],
        products: [Products.Transactions],
        transactions: { days_requested: 90 },
      };

      try {
        const created = await client.linkTokenCreate(
          redirectUri ? { ...request, redirect_uri: redirectUri } : request
        );
        return {
          status: 200,
          body: {
            link_token: created.data.link_token,
            expiration: created.data.expiration,
            env: plaidEnvName(),
            country_codes: ["PL"],
          },
        };
      } catch (error: unknown) {
        if (redirectUri) {
          const fallback = await client.linkTokenCreate(request);
          return {
            status: 200,
            body: {
              link_token: fallback.data.link_token,
              expiration: fallback.data.expiration,
              env: plaidEnvName(),
              country_codes: ["PL"],
              redirect_uri_skipped: true,
            },
          };
        }
        throw error;
      }
    }

    if (req.method === "POST" && action === "exchange") {
      const publicToken = String(req.body.public_token || "");
      if (!publicToken) throw new HttpError(400, "public_token is required");
      const item = await exchangeAndStore(client, userId, publicToken, req.authorization);
      return { status: 200, body: { item } };
    }

    if (req.method === "POST" && action === "sandbox-connect") {
      if (plaidEnvName() !== "sandbox") {
        throw new HttpError(400, "Sandbox connect is only available in the Plaid sandbox environment.");
      }
      const institutionId = String(req.body.institution_id || POLISH_SANDBOX_BANKS[0].institution_id);
      const known = POLISH_SANDBOX_BANKS.some((bank) => bank.institution_id === institutionId);
      if (!known) {
        throw new HttpError(400, "Choose a supported Poland sandbox bank.");
      }

      const created = await client.sandboxPublicTokenCreate({
        institution_id: institutionId,
        initial_products: [Products.Transactions],
        options: {
          override_username: "user_good",
          override_password: "pass_good",
        },
      });
      const item = await exchangeAndStore(
        client,
        userId,
        created.data.public_token,
        req.authorization
      );
      await sleep(1500);
      const stored = await loadItem(userId, item.item_id, req.authorization);
      const transactions = stored ? await syncTransactions(client, stored) : [];
      if (stored) await persistItem(userId, stored, req.authorization);
      return { status: 200, body: { item: stored ? publicItem(stored) : item, transactions } };
    }

    if (req.method === "POST" && action === "sync") {
      const itemId = String(req.body.item_id || "");
      if (!itemId) throw new HttpError(400, "item_id is required");
      const stored = await loadItem(userId, itemId, req.authorization);
      if (!stored) throw new HttpError(404, "Connected bank not found.");
      const transactions = await syncTransactions(client, stored);
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
          await client.itemRemove({ access_token: stored.access_token });
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
