import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { actionFromUrl, handlePlaidApi } from "./plaid-handlers";

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function handle(
  req: IncomingMessage,
  res: ServerResponse,
  env: Record<string, string>
) {
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }

  const raw = req.method === "GET" || req.method === "HEAD" ? "" : await readBody(req);
  let body: Record<string, unknown> = {};
  if (raw) {
    try {
      body = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Invalid JSON body" }));
      return;
    }
  }

  const result = await handlePlaidApi({
    method: req.method || "GET",
    action: actionFromUrl(req.url),
    body,
    authorization: req.headers.authorization,
  });

  res.statusCode = result.status;
  if (result.body === null) {
    res.end();
    return;
  }
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(result.body));
}

export function plaidApiPlugin(env: Record<string, string>): Plugin {
  return {
    name: "plaid-api",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith("/api/plaid")) {
          next();
          return;
        }
        void handle(req, res, env).catch((error) => {
          console.error(error);
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Plaid API failed" }));
        });
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith("/api/plaid")) {
          next();
          return;
        }
        void handle(req, res, env).catch((error) => {
          console.error(error);
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Plaid API failed" }));
        });
      });
    },
  };
}
