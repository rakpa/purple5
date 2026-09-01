import {
  bearer,
  loadStoredItem,
  persistItem,
  publicItem,
  readBody,
  send,
  syncTransactions,
} from "../../lib/plaid-http.js";

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      send(res, 405, { error: "POST required" });
      return;
    }
    const body = await readBody(req);
    const itemId = String(body.item_id || "");
    if (!itemId) {
      send(res, 400, { error: "item_id is required" });
      return;
    }
    const authorization = bearer(req);
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
  } catch (error) {
    send(res, error.status || 500, { error: error.message || "Sync failed" });
  }
}
