import { handleGmailRequest } from "../../lib/gmail-handlers.js";

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  await handleGmailRequest(req, res);
}
