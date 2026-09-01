import { runVercelPlaidHandler } from "../../server/plaid-handlers";

export default async function handler(
  req: { method?: string; body?: unknown; headers: Record<string, string | string[] | undefined> },
  res: { status: (code: number) => { json: (body: unknown) => void; end: () => void } }
) {
  await runVercelPlaidHandler("create-link-token", req, res);
}
