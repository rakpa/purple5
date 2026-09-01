import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { handleGmailRequest } from "../lib/gmail-handlers.js";

function readRawBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

export function gmailApiPlugin(env: Record<string, string>): Plugin {
  return {
    name: "gmail-api",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith("/api/gmail")) {
          next();
          return;
        }
        void (async () => {
          for (const [key, value] of Object.entries(env)) {
            if (process.env[key] === undefined) process.env[key] = value;
          }
          if (req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS") {
            const raw = await readRawBody(req as IncomingMessage);
            (req as IncomingMessage & { body?: unknown }).body = raw
              ? JSON.parse(raw)
              : {};
          }
          await handleGmailRequest(req as IncomingMessage, res as ServerResponse);
        })().catch((error) => {
          console.error(error);
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Gmail API failed" }));
        });
      });
    },
  };
}
