import { bearer, listStoredItems, send } from "../../lib/plaid-http.js";

export default async function handler(req, res) {
  try {
    const items = await listStoredItems(bearer(req));
    send(res, 200, { items });
  } catch (error) {
    send(res, 200, { items: [] });
  }
}
