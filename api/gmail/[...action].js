import { handleGmailRequest } from "../../lib/gmail-handlers.js";

export const config = { maxDuration: 60 };

function withCaughtUrl(req) {
  const raw = req.query?.action;
  const parts = Array.isArray(raw) ? raw : raw ? [raw] : [];
  if (parts.length) req.url = `/api/gmail/${parts.join("/")}`;
  return req;
}

export default async function handler(req, res) {
  await handleGmailRequest(withCaughtUrl(req), res);
}
