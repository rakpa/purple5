import { handlePlaidApi } from "../../server/plaid-handlers";

export const config = {
  maxDuration: 30,
};

export default async function handler(
  req: {
    method?: string;
    query?: Record<string, string | string[] | undefined>;
    body?: unknown;
    headers: Record<string, string | string[] | undefined>;
  },
  res: {
    status: (code: number) => { json: (body: unknown) => void; end: () => void };
    json: (body: unknown) => void;
    end: () => void;
  }
) {
  try {
    const actionParam = req.query?.action;
    const action = Array.isArray(actionParam) ? actionParam[0] : actionParam || "";
    const authorizationHeader = req.headers.authorization;
    const authorization = Array.isArray(authorizationHeader)
      ? authorizationHeader[0]
      : authorizationHeader;
    const body =
      req.body && typeof req.body === "object" && !Array.isArray(req.body)
        ? (req.body as Record<string, unknown>)
        : {};

    const result = await handlePlaidApi({
      method: req.method || "GET",
      action,
      body,
      authorization,
    });

    const response = res.status(result.status);
    if (result.body === null) {
      response.end();
      return;
    }
    response.json(result.body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Plaid function failed";
    console.error("Plaid Vercel function crash:", error);
    res.status(500).json({ error: message });
  }
}
