import {
  BANKS,
  bearer,
  deleteStoredItem,
  exchangeToItem,
  listStoredItems,
  loadStoredItem,
  persistItem,
  plaidEnvName,
  plaidPost,
  publicItem,
  readBody,
  requireUserId,
  send,
  syncTransactions,
} from "./plaid-http.js";

function actionFromUrl(url = "") {
  const path = String(url || "").split("?")[0];
  const match = path.match(/\/api\/plaid\/?([^/?]*)/);
  if (match?.[1]) return match[1];
  try {
    const parsed = new URL(url, "http://localhost");
    const action = parsed.searchParams.get("action");
    if (action) return action.split("/")[0];
  } catch {
    /* ignore */
  }
  return "";
}

export async function handlePlaidRequest(req, res) {
  try {
    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }

    const action = actionFromUrl(req.url || "");
    const authorization = bearer(req);

    if (action === "institutions" || action === "") {
      send(res, 200, {
        env: plaidEnvName(),
        country_codes: ["PL"],
        institutions: BANKS,
      });
      return;
    }

    if (action === "items") {
      try {
        send(res, 200, { items: await listStoredItems(authorization) });
      } catch {
        send(res, 200, { items: [] });
      }
      return;
    }

    if (action === "create-link-token" && req.method === "POST") {
      const body = await readBody(req);
      requireUserId(authorization);
      const redirectUri =
        (typeof body.redirect_uri === "string" && body.redirect_uri) ||
        process.env.PLAID_REDIRECT_URI ||
        "";
      const institutionId =
        typeof body.institution_id === "string" && body.institution_id
          ? body.institution_id
          : undefined;
      if (!redirectUri) {
        send(res, 400, {
          error:
            "Revolut Open Banking needs a redirect URI. Add https://purple5.vercel.app/banks in Plaid Dashboard → Team Settings → API → Allowed redirect URIs, and set PLAID_REDIRECT_URI to that URL on Vercel.",
        });
        return;
      }
      const payload = {
        user: { client_user_id: requireUserId(authorization) },
        client_name: "ExpenseTrack",
        language: "en",
        country_codes: ["PL"],
        products: ["transactions"],
        transactions: { days_requested: 180 },
        redirect_uri: redirectUri,
      };
      if (institutionId) payload.institution_id = institutionId;
      try {
        const created = await plaidPost("/link/token/create", payload);
        send(res, 200, {
          link_token: created.link_token,
          expiration: created.expiration,
          env: plaidEnvName(),
          country_codes: ["PL"],
        });
      } catch (error) {
        const message = error.message || "";
        send(res, error.status || 400, {
          error: /redirect|oauth/i.test(message)
            ? `Add this exact URL in Plaid Dashboard → Team Settings → API → Allowed redirect URIs: ${redirectUri}`
            : message,
        });
      }
      return;
    }

    if (action === "exchange" && req.method === "POST") {
      const body = await readBody(req);
      const publicToken = String(body.public_token || "");
      if (!publicToken) {
        send(res, 400, { error: "public_token is required" });
        return;
      }
      requireUserId(authorization);
      const item = await exchangeToItem(publicToken);
      const synced = await syncTransactions(item.access_token, "");
      item.cursor = synced.cursor;
      await persistItem(authorization, item);
      send(res, 200, { item: publicItem(item), transactions: synced.transactions });
      return;
    }

    if (action === "sync" && req.method === "POST") {
      const body = await readBody(req);
      const itemId = String(body.item_id || "");
      if (!itemId) {
        send(res, 400, { error: "item_id is required" });
        return;
      }
      const stored = await loadStoredItem(authorization, itemId);
      if (!stored?.access_token) {
        send(res, 404, {
          error: "Bank connection was not saved. Run supabase-plaid-setup.sql, then connect Revolut again.",
        });
        return;
      }
      const synced = await syncTransactions(stored.access_token, stored.cursor || "");
      stored.cursor = synced.cursor;
      stored.updated_at = new Date().toISOString();
      await persistItem(authorization, stored);
      send(res, 200, { item: publicItem(stored), transactions: synced.transactions });
      return;
    }

    if (action === "unlink" && req.method === "POST") {
      const body = await readBody(req);
      const itemId = String(body.item_id || "");
      const stored = itemId ? await loadStoredItem(authorization, itemId) : null;
      if (stored?.access_token) {
        try {
          await plaidPost("/item/remove", { access_token: stored.access_token });
        } catch {
          /* ignore */
        }
      }
      if (itemId) await deleteStoredItem(authorization, itemId);
      send(res, 200, { ok: true });
      return;
    }

    send(res, 404, { error: `Unknown Plaid API route: ${action}` });
  } catch (error) {
    send(res, error.status || 500, { error: error.message || "Plaid request failed" });
  }
}

export { actionFromUrl };
