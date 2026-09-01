import { handleGmailRequest } from "../../lib/gmail-handlers.js";

export default async function handler(req, res) {
  await handleGmailRequest(req, res);
}
