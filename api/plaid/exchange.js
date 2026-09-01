import {
  bearer,
  exchangeToItem,
  persistItem,
  publicItem,
  readBody,
  requireUserId,
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
    const publicToken = String(body.public_token || "");
    if (!publicToken) {
      send(res, 400, { error: "public_token is required" });
      return;
    }
    const authorization = bearer(req);
    requireUserId(authorization);
    const item = await exchangeToItem(publicToken);
    const synced = await syncTransactions(item.access_token, "");
    item.cursor = synced.cursor;
    await persistItem(authorization, item);
    send(res, 200, { item: publicItem(item), transactions: synced.transactions });
  } catch (error) {
    send(res, error.status || 500, { error: error.message || "Failed to connect bank" });
  }
}
