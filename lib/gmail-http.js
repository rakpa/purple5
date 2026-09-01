import { createHmac } from "node:crypto";

export function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

export function sendRedirect(res, location) {
  res.statusCode = 302;
  res.setHeader("Location", location);
  res.end();
}

export async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export function bearer(req) {
  const header = req.headers?.authorization;
  return Array.isArray(header) ? header[0] : header || "";
}

export function requestUrl(req) {
  const raw = req.url || "/";
  if (raw.startsWith("http")) return new URL(raw);
  const host = req.headers?.host || "localhost";
  const proto = req.headers?.["x-forwarded-proto"] || "http";
  return new URL(raw, `${proto}://${host}`);
}

function userIdFromAuth(authorization) {
  try {
    const token = authorization.replace(/^Bearer\s+/i, "");
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    return payload.sub || null;
  } catch {
    return null;
  }
}

export function requireUserId(authorization) {
  const userId = userIdFromAuth(authorization);
  if (!userId) {
    const error = new Error("Sign in to ExpenseTrack first, then connect Gmail.");
    error.status = 401;
    throw error;
  }
  return userId;
}

function supabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  return { url, key };
}

async function supabaseRest(authorization, path, init = {}) {
  const { url, key } = supabaseConfig();
  if (!url || !key) return { ok: false, status: 500, data: { message: "Supabase is not configured." } };
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: authorization || `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers || {}),
    },
  });
  const data = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, data };
}

function googleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  return { clientId, clientSecret };
}

export function gmailRedirectUri(req, body = {}) {
  if (typeof body.redirect_uri === "string" && body.redirect_uri) return body.redirect_uri;
  if (process.env.GMAIL_REDIRECT_URI) return process.env.GMAIL_REDIRECT_URI;
  const url = requestUrl(req);
  return `${url.origin}/settings`;
}

function signingSecret() {
  const { clientSecret } = googleConfig();
  return clientSecret || process.env.SUPABASE_ANON_KEY || "gmail-state";
}

export function signState(payload) {
  const json = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = createHmac("sha256", signingSecret()).update(json).digest("base64url");
  return `${json}.${mac}`;
}

export function verifyState(state) {
  const [json, mac] = String(state || "").split(".");
  if (!json || !mac) return null;
  const expected = createHmac("sha256", signingSecret()).update(json).digest("base64url");
  if (expected !== mac) return null;
  try {
    const payload = JSON.parse(Buffer.from(json, "base64url").toString());
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function isMissingGmailTable(detail) {
  return /does not exist|schema cache|Could not find/i.test(String(detail || ""));
}

export function publicConnection(row) {
  if (!row) return { connected: false };
  return {
    connected: true,
    email: row.email || null,
    has_password: Boolean(row.statement_password),
    updated_at: row.updated_at || null,
  };
}

export async function loadConnection(authorization, userId) {
  const result = await supabaseRest(
    authorization,
    `gmail_connections?user_id=eq.${userId}&select=*&limit=1`
  );
  if (!result.ok) {
    if (isMissingGmailTable(JSON.stringify(result.data || ""))) return null;
    return null;
  }
  return Array.isArray(result.data) ? result.data[0] || null : null;
}

export async function saveConnection(authorization, userId, fields) {
  const payload = {
    user_id: userId,
    ...fields,
    updated_at: new Date().toISOString(),
  };
  if (!payload.refresh_token) payload.refresh_token = "";
  const result = await supabaseRest(authorization, "gmail_connections?on_conflict=user_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(payload),
  });
  if (!result.ok) {
    const detail = JSON.stringify(result.data || "");
    if (isMissingGmailTable(detail)) return null;
    const error = new Error(result.data?.message || "Could not save Gmail connection.");
    error.status = 500;
    throw error;
  }
  return Array.isArray(result.data) ? result.data[0] : result.data;
}

export async function deleteConnection(authorization, userId) {
  await supabaseRest(authorization, `gmail_connections?user_id=eq.${userId}`, { method: "DELETE" });
}

export function googleAuthUrl({ userId, redirectUri, returnTo }) {
  const { clientId, clientSecret } = googleConfig();
  if (!clientId || !clientSecret) {
    const error = new Error(
      "Gmail OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on Vercel (same Google Cloud OAuth client as Sign in with Google). Enable the Gmail API and add this redirect URI: " +
        redirectUri
    );
    error.status = 500;
    throw error;
  }
  const state = signState({
    userId,
    redirectUri,
    returnTo: returnTo || "/settings",
    exp: Date.now() + 15 * 60 * 1000,
  });
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "https://www.googleapis.com/auth/gmail.readonly email");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeCode(code, redirectUri) {
  const { clientId, clientSecret } = googleConfig();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error_description || data.error || "Google token exchange failed");
    error.status = 400;
    throw error;
  }
  return data;
}

export async function refreshAccessToken(refreshToken) {
  const { clientId, clientSecret } = googleConfig();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(
      data.error_description || "Gmail access expired. Disconnect and connect Gmail again."
    );
    error.status = 401;
    throw error;
  }
  return data;
}

export async function googleUserEmail(accessToken) {
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await response.json().catch(() => ({}));
  return data.email || null;
}

async function gmailGet(accessToken, path) {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const apiMessage = data.error?.message || `Gmail API failed (${response.status})`;
    const insufficient =
      response.status === 403 || /insufficient|access not configured|gmail api/i.test(apiMessage);
    const error = new Error(
      insufficient
        ? "Google blocked Gmail access. Enable the Gmail API in Google Cloud (same OAuth client as Sign in with Google), add scope gmail.readonly, add yourself as a test user, then sign out and sign in again. Allow statement-email access on the Google screen."
        : apiMessage
    );
    error.status = response.status === 401 || response.status === 403 ? response.status : 500;
    throw error;
  }
  return data;
}

export async function validAccessToken(authorization, userId, connection) {
  const expires = connection.access_token_expires_at
    ? new Date(connection.access_token_expires_at).getTime()
    : 0;
  if (connection.access_token && expires - 60_000 > Date.now()) {
    return connection.access_token;
  }
  if (!connection.refresh_token) {
    const error = new Error("Gmail is not connected. Connect Gmail again.");
    error.status = 401;
    throw error;
  }
  const refreshed = await refreshAccessToken(connection.refresh_token);
  const accessToken = refreshed.access_token;
  await saveConnection(authorization, userId, {
    email: connection.email,
    refresh_token: connection.refresh_token,
    statement_password: connection.statement_password,
    access_token: accessToken,
    access_token_expires_at: new Date(Date.now() + (refreshed.expires_in || 3600) * 1000).toISOString(),
  }).catch(() => null);
  return accessToken;
}

export const DEFAULT_STATEMENT_QUERY =
  'filename:pdf (subject:"Wyciąg elektroniczny" OR subject:wyciąg OR "credit agricole" OR creditagricole OR ca24)';

export function inferBank(from = "", subject = "") {
  const hay = `${from} ${subject}`.toLowerCase();
  if (hay.includes("credit agricole") || hay.includes("creditagricole") || hay.includes("ca24")) {
    return "Credit Agricole";
  }
  if (hay.includes("revolut")) return "Revolut";
  if (hay.includes("mbank")) return "mBank";
  if (hay.includes("ing bank") || hay.includes("@ing.pl")) return "ING";
  if (hay.includes("pkobp") || hay.includes("pko bp") || hay.includes("pko.pl")) return "PKO BP";
  if (hay.includes("santander")) return "Santander";
  if (hay.includes("millennium")) return "Bank Millennium";
  if (hay.includes("pekao")) return "Pekao";
  if (hay.includes("alior")) return "Alior";
  return "Bank statement";
}

export async function listStatementMessages(accessToken, query, maxResults = 12) {
  const q = encodeURIComponent(query || DEFAULT_STATEMENT_QUERY);
  const listed = await gmailGet(accessToken, `messages?q=${q}&maxResults=${maxResults}`);
  return listed.messages || [];
}

export async function getMessageSummary(accessToken, messageId) {
  const message = await gmailGet(
    accessToken,
    `messages/${messageId}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`
  );
  const headers = Object.fromEntries(
    (message.payload?.headers || []).map((header) => [header.name.toLowerCase(), header.value])
  );
  return {
    gmail_message_id: message.id,
    subject: headers.subject || "",
    from: headers.from || "",
    date: headers.date || "",
    snippet: message.snippet || "",
    bank: inferBank(headers.from, headers.subject),
  };
}

export async function downloadPdfAttachments(accessToken, messageId) {
  const message = await gmailGet(accessToken, `messages/${messageId}?format=full`);
  const files = [];
  const walk = (part) => {
    if (!part) return;
    if (Array.isArray(part.parts)) part.parts.forEach(walk);
    const filename = part.filename || "";
    const mime = part.mimeType || "";
    if (part.body?.attachmentId && (mime.includes("pdf") || filename.toLowerCase().endsWith(".pdf"))) {
      files.push({
        filename: filename || "statement.pdf",
        attachmentId: part.body.attachmentId,
        mimeType: mime,
      });
    }
  };
  walk(message.payload);
  const headers = Object.fromEntries(
    (message.payload?.headers || []).map((header) => [header.name.toLowerCase(), header.value])
  );
  const attachments = [];
  for (const file of files) {
    const raw = await gmailGet(
      accessToken,
      `messages/${messageId}/attachments/${file.attachmentId}`
    );
    attachments.push({
      filename: file.filename,
      buffer: Buffer.from(raw.data.replace(/-/g, "+").replace(/_/g, "/"), "base64"),
    });
  }
  return {
    id: message.id,
    subject: headers.subject || "",
    from: headers.from || "",
    date: headers.date || "",
    attachments,
  };
}

export { supabaseConfig };
