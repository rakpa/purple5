import {
  bearer,
  deleteConnection,
  downloadPdfAttachments,
  exchangeCode,
  gmailRedirectUri,
  googleAuthUrl,
  googleUserEmail,
  listStatementMessages,
  loadConnection,
  publicConnection,
  readBody,
  requestUrl,
  requireUserId,
  saveConnection,
  send,
  validAccessToken,
  verifyState,
} from "./gmail-http.js";
import { extractPdfText, groupByCategory, parseCreditAgricoleText } from "./credit-agricole-pdf.js";

function actionFromUrl(url = "") {
  const path = url.split("?")[0];
  const match = path.match(/\/api\/gmail\/?([^/?]*)/);
  return match?.[1] || "";
}

export async function handleGmailRequest(req, res) {
  try {
    const url = requestUrl(req);
    const action = actionFromUrl(url.pathname + url.search);
    const authorization = bearer(req);

    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (action === "auth" && (req.method === "GET" || req.method === "POST")) {
      const userId = requireUserId(authorization);
      const body = req.method === "POST" ? await readBody(req) : {};
      const redirectUri = gmailRedirectUri(req, body);
      const returnTo = typeof body.return_to === "string" ? body.return_to : "/settings";
      send(res, 200, { url: googleAuthUrl({ userId, redirectUri, returnTo }) });
      return;
    }

    if (action === "exchange" && req.method === "POST") {
      const userId = requireUserId(authorization);
      const body = await readBody(req);
      const state = verifyState(body.state);
      if (!state?.userId || state.userId !== userId) {
        send(res, 400, { error: "Invalid Gmail OAuth state. Click Connect Gmail again." });
        return;
      }
      const redirectUri = body.redirect_uri || state.redirectUri;
      const tokens = await exchangeCode(String(body.code || ""), redirectUri);
      if (!tokens.refresh_token) {
        send(res, 400, {
          error:
            "Google did not return a refresh token. In Google Cloud enable the Gmail API, add scope gmail.readonly, add this app as a test user, then connect again.",
        });
        return;
      }
      const email = await googleUserEmail(tokens.access_token);
      await saveConnection(authorization, userId, {
        email,
        refresh_token: tokens.refresh_token,
        access_token: tokens.access_token,
        access_token_expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
      });
      send(res, 200, { ok: true, email });
      return;
    }

    if (action === "session" && req.method === "POST") {
      const userId = requireUserId(authorization);
      const body = await readBody(req);
      const existing = await loadConnection(authorization, userId).catch(() => null);
      const refreshToken = String(body.refresh_token || existing?.refresh_token || "");
      const accessToken = String(body.access_token || existing?.access_token || "");
      if (!refreshToken && !accessToken) {
        send(res, 200, { ok: true, email: body.email || existing?.email || null });
        return;
      }
      await saveConnection(authorization, userId, {
        email: body.email || existing?.email || null,
        refresh_token: refreshToken,
        access_token: accessToken || null,
        access_token_expires_at: accessToken
          ? new Date(Date.now() + (Number(body.expires_in) || 3600) * 1000).toISOString()
          : existing?.access_token_expires_at,
        statement_password: existing?.statement_password || null,
      });
      send(res, 200, { ok: true, email: body.email || existing?.email || null });
      return;
    }
    if (action === "status") {
      const userId = requireUserId(authorization);
      const connected = await loadConnection(authorization, userId);
      send(res, 200, publicConnection(connected));
      return;
    }

    if (action === "password" && req.method === "POST") {
      const userId = requireUserId(authorization);
      const body = await readBody(req);
      const existing = await loadConnection(authorization, userId).catch(() => null);
      await saveConnection(authorization, userId, {
        email: existing?.email || null,
        refresh_token: existing?.refresh_token || "",
        access_token: existing?.access_token || null,
        access_token_expires_at: existing?.access_token_expires_at || null,
        statement_password: String(body.statement_password || ""),
      });
      send(res, 200, { ok: true, has_password: true });
      return;
    }

    if (action === "disconnect" && req.method === "POST") {
      const userId = requireUserId(authorization);
      await deleteConnection(authorization, userId);
      send(res, 200, { ok: true });
      return;
    }

    if (action === "statements" && req.method === "POST") {
      const userId = requireUserId(authorization);
      const body = await readBody(req);
      const connected = await loadConnection(authorization, userId).catch(() => null);
      const sessionToken =
        typeof body.google_access_token === "string" ? body.google_access_token : "";
      const password = String(body.statement_password || connected?.statement_password || "");
      if (!password) {
        send(res, 400, {
          error: "Enter the Credit Agricole PDF password, save it, then fetch statements.",
        });
        return;
      }
      let accessToken = sessionToken;
      if (!accessToken && connected?.refresh_token) {
        accessToken = await validAccessToken(authorization, userId, connected);
      } else if (!accessToken && connected?.access_token) {
        accessToken = connected.access_token;
      }
      if (!accessToken) {
        send(res, 400, {
          error:
            "Sign out and sign in with the same Google account once so statement emails can be read. Gmail uses your login — there is no second Connect step.",
        });
        return;
      }
      const query =
        typeof body.query === "string" && body.query
          ? body.query
          : 'subject:"Wyciąg elektroniczny" filename:pdf';
      const messages = await listStatementMessages(accessToken, query);
      if (messages.length === 0) {
        send(res, 200, {
          statements: [],
          transactions: [],
          categories: [],
          message: "No matching statement emails. Search used: " + query,
        });
        return;
      }

      const statements = [];
      const allTransactions = [];
      for (const message of messages.slice(0, 5)) {
        const downloaded = await downloadPdfAttachments(accessToken, message.id);
        for (const file of downloaded.attachments) {
          const text = await extractPdfText(file.buffer, password);
          const parsed = parseCreditAgricoleText(text, {
            idPrefix: `ca-${downloaded.id}`,
            accountId: "credit-agricole",
          });
          const withIds = parsed.transactions.map((txn, index) => ({
            ...txn,
            plaid_transaction_id: txn.plaid_transaction_id || `ca-${downloaded.id}-${index}`,
          }));
          statements.push({
            gmail_message_id: downloaded.id,
            subject: downloaded.subject,
            from: downloaded.from,
            date: downloaded.date,
            filename: file.filename,
            period_start: parsed.period_start,
            period_end: parsed.period_end,
            bank: parsed.bank,
            text_preview: text.slice(0, 8000),
            transaction_count: withIds.length,
          });
          allTransactions.push(...withIds);
        }
      }

      send(res, 200, {
        email: connected?.email,
        statements,
        transactions: allTransactions,
        categories: groupByCategory(allTransactions),
      });
      return;
    }

    send(res, 404, { error: `Unknown Gmail API route: ${action}` });
  } catch (error) {
    send(res, error.status || 500, { error: error.message || "Gmail request failed" });
  }
}

export { actionFromUrl };
