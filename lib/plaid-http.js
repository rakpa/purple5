const BANKS = [
  { institution_id: "ins_132922", name: "PKO Bank Polski" },
  { institution_id: "ins_132987", name: "mBank" },
  { institution_id: "ins_132948", name: "ING Bank Śląski" },
  { institution_id: "ins_132924", name: "Bank Pekao" },
  { institution_id: "ins_132959", name: "Bank Millennium" },
  { institution_id: "ins_132949", name: "Alior Bank" },
  { institution_id: "ins_132675", name: "Revolut (PL)" },
];

export const REVOLUT_PL_INSTITUTION_ID = "ins_132675";

export function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

export function plaidEnvName() {
  return (process.env.PLAID_ENV || "sandbox").toLowerCase();
}

function plaidHost() {
  const env = plaidEnvName();
  if (env === "production") return "https://production.plaid.com";
  if (env === "development") return "https://development.plaid.com";
  return "https://sandbox.plaid.com";
}

export async function plaidPost(path, body) {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  if (!clientId || !secret) {
    const error = new Error("Plaid is not configured. Set PLAID_CLIENT_ID and PLAID_SECRET on Vercel.");
    error.status = 500;
    throw error;
  }
  const response = await fetch(`${plaidHost()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, secret, ...body }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(friendlyPlaidError(data.error_message, data.error_code));
    error.status = response.status === 400 ? 400 : 500;
    error.code = data.error_code;
    throw error;
  }
  return data;
}

function friendlyPlaidError(message = "", code = "") {
  if (/country code/i.test(message) || (code === "INVALID_FIELD" && /country/i.test(message))) {
    return "Plaid Production is on, but Poland is not enabled on this account yet. In Plaid Dashboard open Support → Request product access and ask for Transactions in Poland (PL). Direct link: https://dashboard.plaid.com/support/new/product-and-development/product-troubleshooting/request-product-access";
  }
  if (/Data Transparency/i.test(message)) {
    return "Finish Link customization: https://dashboard.plaid.com/link/data-transparency-v5 — add at least one Data Transparency use case (Personal finance / budgeting).";
  }
  return message || "Plaid request failed";
}

export async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export function bearer(req) {
  const header = req.headers?.authorization;
  return Array.isArray(header) ? header[0] : header || "";
}

function userIdFromAuth(authorization) {
  try {
    const token = authorization.replace(/^Bearer\s+/i, "");
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    return payload.sub || null;
  } catch {
    return null;
  }
}

export function requireUserId(authorization) {
  const userId = userIdFromAuth(authorization);
  if (!userId) {
    const error = new Error("Sign in to ExpenseTrack first, then connect Revolut.");
    error.status = 401;
    throw error;
  }
  return userId;
}

function supabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  return { url, key };
}

async function supabaseRest(authorization, path, init = {}) {
  const { url, key } = supabaseConfig();
  if (!url || !key) return { ok: false, data: null };
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: authorization || `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers || {}),
    },
  });
  const data = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, data };
}

export function publicItem(item) {
  if (!item) return item;
  const { access_token: _ignored, ...rest } = item;
  return rest;
}

export function mapAccounts(accounts) {
  return (accounts || []).map((account) => ({
    account_id: account.account_id,
    name: account.name,
    official_name: account.official_name || null,
    type: account.type,
    subtype: account.subtype || null,
    mask: account.mask || null,
    iso_currency_code: account.balances?.iso_currency_code || "PLN",
    available: account.balances?.available ?? null,
    current: account.balances?.current ?? null,
  }));
}

export function mapTxn(txn) {
  const type = txn.amount < 0 ? "income" : "expense";
  const description = txn.merchant_name || txn.name || "Plaid transaction";
  const haystack = `${(txn.category || []).join(" ")} ${description}`.toLowerCase();
  let category = "Other";
  if (type === "expense") {
    if (haystack.includes("taxi") || haystack.includes("uber")) category = "TAXI";
    else if (
      haystack.includes("food") ||
      haystack.includes("restaurant") ||
      haystack.includes("coffee") ||
      haystack.includes("mcdonald") ||
      haystack.includes("starbucks")
    ) {
      category = "Food";
    } else if (haystack.includes("grocery")) category = "Groceries";
    else if (haystack.includes("travel") || haystack.includes("transport")) category = "Transport";
    else if (haystack.includes("shop") || haystack.includes("merchandise")) category = "Shopping";
    else if (haystack.includes("rent")) category = "Poland Rent";
  }
  const pfc = txn.personal_finance_category || {};
  if (pfc.detailed === "TRANSPORTATION_TAXIS_AND_RIDE_SHARES") category = "TAXI";
  if (pfc.primary === "FOOD_AND_DRINK") category = "Food";
  if (pfc.primary === "TRANSPORTATION" && category === "Other") category = "Transport";
  return {
    plaid_transaction_id: txn.transaction_id,
    plaid_account_id: txn.account_id,
    type,
    amount: Math.abs(Number(txn.amount) || 0),
    date: txn.date,
    description,
    category,
    iso_currency_code: txn.iso_currency_code || "PLN",
    pending: Boolean(txn.pending),
  };
}

export async function persistItem(authorization, item) {
  const userId = requireUserId(authorization);
  const { url, key } = supabaseConfig();
  if (!url || !key) {
    const error = new Error("Supabase is not configured on the server.");
    error.status = 500;
    throw error;
  }
  const result = await supabaseRest(authorization, "plaid_items?on_conflict=user_id,item_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      user_id: userId,
      item_id: item.item_id,
      access_token: item.access_token,
      institution_id: item.institution_id,
      institution_name: item.institution_name,
      cursor: item.cursor || "",
      accounts: item.accounts || [],
      updated_at: new Date().toISOString(),
    }),
  });
  if (!result.ok) {
    const detail = JSON.stringify(result.data || "");
    const error = new Error(
      /does not exist|schema cache|Could not find/i.test(detail)
        ? "Bank connection table is missing. Run supabase-plaid-setup.sql in the Supabase SQL editor, then connect Revolut again."
        : result.data?.message || result.data?.error || "Could not save the bank connection."
    );
    error.status = 500;
    throw error;
  }
}

export async function listStoredItems(authorization) {
  const userId = userIdFromAuth(authorization);
  if (!userId) return [];
  const result = await supabaseRest(
    authorization,
    `plaid_items?user_id=eq.${userId}&select=item_id,institution_id,institution_name,cursor,accounts,created_at,updated_at&order=created_at.desc`
  );
  if (!result.ok || !Array.isArray(result.data)) return [];
  return result.data;
}

export async function loadStoredItem(authorization, itemId) {
  const userId = userIdFromAuth(authorization);
  if (!userId) return null;
  const result = await supabaseRest(
    authorization,
    `plaid_items?user_id=eq.${userId}&item_id=eq.${encodeURIComponent(itemId)}&select=*`
  );
  if (!result.ok || !Array.isArray(result.data) || !result.data[0]) return null;
  return result.data[0];
}

export async function deleteStoredItem(authorization, itemId) {
  const userId = userIdFromAuth(authorization);
  if (!userId) return;
  await supabaseRest(
    authorization,
    `plaid_items?user_id=eq.${userId}&item_id=eq.${encodeURIComponent(itemId)}`,
    { method: "DELETE" }
  );
}

export async function exchangeToItem(publicToken) {
  const exchanged = await plaidPost("/item/public_token/exchange", {
    public_token: publicToken,
  });
  const accounts = await plaidPost("/accounts/get", {
    access_token: exchanged.access_token,
  });
  const institutionId = accounts.item?.institution_id || null;
  const institutionName =
    accounts.item?.institution_name ||
    BANKS.find((bank) => bank.institution_id === institutionId)?.name ||
    "Poland bank";
  const now = new Date().toISOString();
  return {
    item_id: exchanged.item_id,
    access_token: exchanged.access_token,
    institution_id: institutionId,
    institution_name: institutionName,
    cursor: "",
    accounts: mapAccounts(accounts.accounts),
    created_at: now,
    updated_at: now,
  };
}

export async function syncTransactions(accessToken, existingCursor) {
  const added = [];
  let cursor = existingCursor || undefined;
  const isInitial = !existingCursor;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const data = await plaidPost("/transactions/sync", {
      access_token: accessToken,
      cursor,
      count: 100,
    });
    added.push(...(data.added || []));
    cursor = data.next_cursor;
    if (data.has_more) {
      attempt -= 1;
      continue;
    }
    if (!isInitial || added.length > 0) break;
    await new Promise((resolve) => setTimeout(resolve, 800));
    cursor = undefined;
  }
  return {
    cursor: cursor || existingCursor || "",
    transactions: added.filter((txn) => !txn.pending && txn.amount !== 0).map(mapTxn),
  };
}

export { BANKS };
