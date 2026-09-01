import {
  bearer,
  plaidEnvName,
  plaidPost,
  readBody,
  requireUserId,
  send,
} from "../../lib/plaid-http.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      send(res, 405, { error: "POST required" });
      return;
    }
    const body = await readBody(req);
    const userId = requireUserId(bearer(req));
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
      user: { client_user_id: userId },
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
        error:
          /redirect|oauth/i.test(message)
            ? `Add this exact URL in Plaid Dashboard → Team Settings → API → Allowed redirect URIs: ${redirectUri}`
            : message,
      });
    }
  } catch (error) {
    send(res, error.status || 500, { error: error.message || "Could not start Plaid Link" });
  }
}
