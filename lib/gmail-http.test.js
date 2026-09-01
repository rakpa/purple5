import { gmailApiError, hasGmailReadonlyScope, inferBank, isMissingGmailTable, publicConnection } from "./gmail-http.js";

if (inferBank("Credit Agricole <noreply@credit-agricole.pl>", "Wyciąg elektroniczny") !== "Credit Agricole") {
  throw new Error("should infer Credit Agricole");
}
if (inferBank("Revolut <noreply@revolut.com>", "Statement") !== "Revolut") {
  throw new Error("should infer Revolut");
}

if (!isMissingGmailTable('{"code":"PGRST205","message":"Could not find the table \'public.gmail_connections\' in the schema cache"}')) {
  throw new Error("should detect missing gmail_connections table");
}
if (isMissingGmailTable("permission denied")) {
  throw new Error("should not treat other errors as a missing table");
}

if (!hasGmailReadonlyScope("email profile https://www.googleapis.com/auth/gmail.readonly")) {
  throw new Error("should detect gmail.readonly");
}
if (hasGmailReadonlyScope("email profile")) {
  throw new Error("should not treat login scopes as Gmail");
}

const scopeErr = gmailApiError(
  { error: { message: "Request had insufficient authentication scopes.", status: "PERMISSION_DENIED", details: [{ reason: "ACCESS_TOKEN_SCOPE_INSUFFICIENT" }] } },
  403
);
if (scopeErr.code !== "gmail_scope_missing") throw new Error("expected gmail_scope_missing");

const apiErr = gmailApiError(
  { error: { message: "Gmail API has not been used in project 123 before or it is disabled. Enable it by visiting https://console.developers.google.com/apis/api/gmail.googleapis.com/overview?project=123 then retry. If you enabled this API recently, wait a few minutes for the action to propagate to our systems and retry." } },
  403
);
if (apiErr.code !== "gmail_api_disabled") throw new Error("expected gmail_api_disabled");
if (!apiErr.message.includes("https://console.developers.google.com")) throw new Error("should keep Google enable URL");

const empty = publicConnection(null);
if (empty.connected !== false) throw new Error("null connection should be disconnected");

console.log("gmail-http helpers ok");
