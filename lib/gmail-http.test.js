import { isMissingGmailTable, publicConnection } from "./gmail-http.js";

if (!isMissingGmailTable('{"code":"PGRST205","message":"Could not find the table \'public.gmail_connections\' in the schema cache"}')) {
  throw new Error("should detect missing gmail_connections table");
}
if (isMissingGmailTable("permission denied")) {
  throw new Error("should not treat other errors as a missing table");
}

const empty = publicConnection(null);
if (empty.connected !== false) throw new Error("null connection should be disconnected");

console.log("gmail-http helpers ok");
