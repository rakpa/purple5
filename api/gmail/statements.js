import { handleGmailRequest } from "../../lib/gmail-handlers.js";

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  await handleGmailRequest(req, res);
}
