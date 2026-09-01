import fs from "node:fs";
import path from "node:path";

export interface StoredPlaidAccount {
  account_id: string;
  name: string;
  official_name: string | null;
  type: string;
  subtype: string | null;
  mask: string | null;
  iso_currency_code: string | null;
  available: number | null;
  current: number | null;
}

export interface StoredPlaidItem {
  item_id: string;
  access_token: string;
  institution_id: string | null;
  institution_name: string;
  cursor: string;
  accounts: StoredPlaidAccount[];
  created_at: string;
  updated_at: string;
}

interface StoreFile {
  items: Record<string, Record<string, StoredPlaidItem>>;
}

function storePath() {
  if (process.env.VERCEL) {
    return path.join("/tmp", "plaid-items.json");
  }
  return path.join(process.cwd(), ".data", "plaid-items.json");
}

function emptyStore(): StoreFile {
  return { items: {} };
}

function readStore(): StoreFile {
  try {
    const raw = fs.readFileSync(storePath(), "utf8");
    const parsed = JSON.parse(raw) as StoreFile;
    return parsed.items ? parsed : emptyStore();
  } catch {
    return emptyStore();
  }
}

function writeStore(store: StoreFile) {
  const file = storePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(store, null, 2));
}

export function savePlaidItem(userId: string, item: StoredPlaidItem) {
  const store = readStore();
  store.items[userId] ??= {};
  store.items[userId][item.item_id] = item;
  writeStore(store);
}

export function getPlaidItem(userId: string, itemId: string): StoredPlaidItem | null {
  return readStore().items[userId]?.[itemId] ?? null;
}

export function listPlaidItems(userId: string): StoredPlaidItem[] {
  const items = readStore().items[userId] ?? {};
  return Object.values(items).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function deletePlaidItem(userId: string, itemId: string) {
  const store = readStore();
  if (store.items[userId]) {
    delete store.items[userId][itemId];
    writeStore(store);
  }
}

export function publicItem(item: StoredPlaidItem) {
  const { access_token: _accessToken, ...rest } = item;
  return rest;
}
