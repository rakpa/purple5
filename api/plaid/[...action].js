import { handlePlaidRequest } from "../../lib/plaid-route.js";

export const config = { maxDuration: 60 };

function withCaughtUrl(req) {
  const raw = req.query?.action;
  const parts = Array.isArray(raw) ? raw : raw ? [raw] : [];
  if (parts.length) req.url = `/api/plaid/${parts.join("/")}`;
  return req;
}

export default async function handler(req, res) {
  await handlePlaidRequest(withCaughtUrl(req), res);
}
