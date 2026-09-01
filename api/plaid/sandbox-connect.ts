import { runVercelPlaidHandler } from "../../server/plaid-handlers";

export const config = { maxDuration: 30 };

export default async function handler(
  req: { method?: string; body?: unknown; headers: Record<string, string | string[] | undefined> },
  res: { status: (code: number) => { json: (body: unknown) => void; end: () => void } }
) {
  await runVercelPlaidHandler("sandbox-connect", req, res);
}
