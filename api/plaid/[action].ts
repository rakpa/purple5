import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handlePlaidApi } from "../../server/plaid-handlers";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const actionParam = req.query.action;
  const action = Array.isArray(actionParam) ? actionParam[0] : actionParam || "";
  const authorizationHeader = req.headers.authorization;
  const authorization = Array.isArray(authorizationHeader)
    ? authorizationHeader[0]
    : authorizationHeader;

  const result = await handlePlaidApi({
    method: req.method || "GET",
    action,
    body: (req.body && typeof req.body === "object" ? req.body : {}) as Record<string, unknown>,
    authorization,
  });

  res.status(result.status);
  if (result.body === null) {
    res.end();
    return;
  }
  res.json(result.body);
}
