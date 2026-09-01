const BANKS = [
  { institution_id: "ins_132922", name: "PKO Bank Polski" },
  { institution_id: "ins_132987", name: "mBank" },
  { institution_id: "ins_132948", name: "ING Bank Śląski" },
  { institution_id: "ins_132924", name: "Bank Pekao" },
  { institution_id: "ins_132959", name: "Bank Millennium" },
  { institution_id: "ins_132949", name: "Alior Bank" },
  { institution_id: "ins_132675", name: "Revolut (PL)" },
];

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function plaidHost() {
  const env = (process.env.PLAID_ENV || "sandbox").toLowerCase();
  if (env === "production") return "https://production.plaid.com";
  if (env === "development") return "https://development.plaid.com";
  return "https://sandbox.plaid.com";
}

async function plaidPost(path, body) {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  if (!clientId || !secret) {
    const error = new Error("Plaid is not configured. Set PLAID_CLIENT_ID and PLAID_SECRET on Vercel Production.");
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
    const error = new Error(data.error_message || `Plaid ${path} failed (${response.status})`);
    error.status = 500;
    throw error;
  }
  return data;
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function mapTxn(txn) {
  const type = txn.amount < 0 ? "income" : "expense";
  const description = txn.merchant_name || txn.name || "Plaid transaction";
  const haystack = `${(txn.category || []).join(" ")} ${description}`.toLowerCase();
  let category = "Other";
  if (type === "expense") {
    if (haystack.includes("taxi") || haystack.includes("uber")) category = "TAXI";
    else if (haystack.includes("food") || haystack.includes("restaurant") || haystack.includes("coffee") || haystack.includes("mcdonald") || haystack.includes("starbucks")) category = "Food";
    else if (haystack.includes("grocery")) category = "Groceries";
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

function publicItem(item) {
  const { access_token: _ignored, ...rest } = item;
  return rest;
}

function mapAccounts(accounts) {
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

async function syncTransactions(accessToken) {
  const added = [];
  let cursor;
  for (let attempt = 0; attempt < 4; attempt += 1) {
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
    if (added.length > 0) break;
    await new Promise((resolve) => setTimeout(resolve, 700));
    cursor = undefined;
  }
  return added.filter((txn) => !txn.pending && txn.amount !== 0).map(mapTxn);
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      send(res, 405, { error: "Use POST to connect a sandbox bank." });
      return;
    }
    if ((process.env.PLAID_ENV || "sandbox").toLowerCase() !== "sandbox") {
      send(res, 400, { error: "Sandbox connect is only available when PLAID_ENV=sandbox." });
      return;
    }

    const body = await readBody(req);
    const institutionId = String(body.institution_id || BANKS[0].institution_id);
    const bank = BANKS.find((item) => item.institution_id === institutionId);
    if (!bank) {
      send(res, 400, { error: "Choose a supported Poland sandbox bank." });
      return;
    }

    const created = await plaidPost("/sandbox/public_token/create", {
      institution_id: institutionId,
      initial_products: ["transactions"],
      options: { override_username: "user_good", override_password: "pass_good" },
    });
    const exchanged = await plaidPost("/item/public_token/exchange", {
      public_token: created.public_token,
    });
    const accounts = await plaidPost("/accounts/get", {
      access_token: exchanged.access_token,
    });
    const transactions = await syncTransactions(exchanged.access_token);
    const now = new Date().toISOString();
    send(res, 200, {
      item: publicItem({
        item_id: exchanged.item_id,
        access_token: exchanged.access_token,
        institution_id: institutionId,
        institution_name: accounts.item?.institution_name || bank.name,
        cursor: "",
        accounts: mapAccounts(accounts.accounts),
        created_at: now,
        updated_at: now,
      }),
      transactions,
    });
  } catch (error) {
    send(res, error.status || 500, { error: error.message || "Plaid request failed" });
  }
}
