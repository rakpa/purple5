import { bearer, deleteStoredItem, loadStoredItem, plaidPost, readBody, send } from "../../lib/plaid-http.js";

export default async function handler(req, res) {
  try {
    const body = await readBody(req);
    const itemId = String(body.item_id || "");
    const authorization = bearer(req);
    const stored = itemId ? await loadStoredItem(authorization, itemId) : null;
    if (stored?.access_token) {
      try {
        await plaidPost("/item/remove", { access_token: stored.access_token });
      } catch {
        // ignore
      }
    }
    if (itemId) await deleteStoredItem(authorization, itemId);
    send(res, 200, { ok: true });
  } catch (error) {
    send(res, error.status || 500, { error: error.message || "Unlink failed" });
  }
}
