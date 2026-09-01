const POLISH_TO_ENGLISH = [
  [/zakup przy użyciu karty/gi, "Card purchase"],
  [/zakup kartą/gi, "Card purchase"],
  [/wypłata z bankomatu/gi, "ATM withdrawal"],
  [/wypłata gotówki/gi, "Cash withdrawal"],
  [/przelew przychodzący/gi, "Incoming transfer"],
  [/przelew wychodzący/gi, "Outgoing transfer"],
  [/przelew na rachunek/gi, "Outgoing transfer"],
  [/przelew z rachunku/gi, "Outgoing transfer"],
  [/zwrot za zakup/gi, "Card refund"],
  [/zwrot/gi, "Refund"],
  [/opłata/gi, "Fee"],
  [/prowizja/gi, "Commission"],
  [/odsetki/gi, "Interest"],
  [/doładowanie/gi, "Top-up"],
  [/płatność blik/gi, "BLIK payment"],
  [/blik/gi, "BLIK"],
  [/obciążenie/gi, "Debit"],
  [/uznanie/gi, "Credit"],
  [/wynagrodzenie/gi, "Salary"],
];

function translateDescription(text) {
  let out = text;
  for (const [pattern, english] of POLISH_TO_ENGLISH) {
    out = out.replace(pattern, english);
  }
  return out;
}

function parseAmount(raw) {
  if (!raw) return null;
  const cleaned = String(raw)
    .replace(/\s/g, "")
    .replace(/\u00a0/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

function toIsoDate(raw) {
  const dotted = String(raw).trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (dotted) return `${dotted[3]}-${dotted[2]}-${dotted[1]}`;
  const iso = String(raw).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return iso[0];
  return null;
}

function categorize(description, type) {
  const hay = description.toLowerCase();
  if (type === "income") {
    if (hay.includes("salary") || hay.includes("wynagrodzenie")) return "Salary";
    if (hay.includes("refund") || hay.includes("zwrot")) return "Refund";
    return "Other";
  }
  if (hay.includes("uber") || hay.includes("bolt") || hay.includes("taxi") || hay.includes("freenow")) {
    return "TAXI";
  }
  if (
    hay.includes("biedronka") ||
    hay.includes("lidl") ||
    hay.includes("żabka") ||
    hay.includes("zabka") ||
    hay.includes("auchan") ||
    hay.includes("carrefour") ||
    hay.includes("grocery") ||
    hay.includes("spożyw")
  ) {
    return "Groceries";
  }
  if (
    hay.includes("mcdonald") ||
    hay.includes("kfc") ||
    hay.includes("starbucks") ||
    hay.includes("restaurant") ||
    hay.includes("restauracj") ||
    hay.includes("coffee") ||
    hay.includes("kebab") ||
    hay.includes("pizza")
  ) {
    return "Food";
  }
  if (hay.includes("orlen") || hay.includes("bp ") || hay.includes("shell") || hay.includes("circle k")) {
    return "Transport";
  }
  if (hay.includes("pkp") || hay.includes("koleo") || hay.includes("uber") || hay.includes("mpk") || hay.includes("jakdojade")) {
    return "Transport";
  }
  if (hay.includes("rent") || hay.includes("czynsz") || hay.includes("najem")) return "Poland Rent";
  if (hay.includes("play") || hay.includes("orange") || hay.includes("plus") || hay.includes("t-mobile") || hay.includes("internet")) {
    return "Internet Recharge";
  }
  if (hay.includes("atm") || hay.includes("bankomat") || hay.includes("wypłata") || hay.includes("withdrawal")) {
    return "Cash";
  }
  if (hay.includes("fee") || hay.includes("opłata") || hay.includes("prowizja")) return "Bills";
  if (hay.includes("allegro") || hay.includes("amazon") || hay.includes("shop") || hay.includes("zakup")) {
    return "Shopping";
  }
  return "Other";
}

const LINE_RE =
  /(\d{2}\.\d{2}\.\d{4}|\d{4}-\d{2}-\d{2})\s+(?:(\d{2}\.\d{2}\.\d{4}|\d{4}-\d{2}-\d{2})\s+)?(.+?)\s+(-?[\d\s]+,\d{2})(?:\s+(-?[\d\s]+,\d{2}))?\s*$/;

export function parseCreditAgricoleText(text, extras = {}) {
  const lines = String(text)
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const transactions = [];
  for (const line of lines) {
    if (/^(lp|data|opis|kwota|saldo|strona|wyciąg|credit agricole)/i.test(line)) continue;
    const match = line.match(LINE_RE);
    if (!match) continue;
    const date = toIsoDate(match[1]);
    const amount = parseAmount(match[4]);
    if (!date || amount === null || amount === 0) continue;
    const description = match[3].replace(/\s{2,}/g, " ").trim();
    if (/^\d+$/.test(description)) continue;
    const type = amount < 0 ? "expense" : "income";
    const abs = Math.abs(amount);
    const translated = translateDescription(description);
    transactions.push({
      date,
      description,
      description_en: translated === description ? description : translated,
      amount: abs,
      type,
      category: categorize(`${description} ${translated}`, type),
      iso_currency_code: "PLN",
      pending: false,
      plaid_transaction_id: extras.idPrefix
        ? `${extras.idPrefix}-${date}-${abs.toFixed(2)}-${transactions.length}`
        : undefined,
      plaid_account_id: extras.accountId || "credit-agricole",
    });
  }

  const period =
    String(text).match(/od\s+(\d{2}\.\d{2}\.\d{4}|\d{4}-\d{2}-\d{2})\s+do\s+(\d{2}\.\d{2}\.\d{4}|\d{4}-\d{2}-\d{2})/i) ||
    String(text).match(/(\d{2}\.\d{2}\.\d{4}|\d{4}-\d{2}-\d{2})\s*[-–]\s*(\d{2}\.\d{2}\.\d{4}|\d{4}-\d{2}-\d{2})/);

  return {
    bank: "Credit Agricole Bank Polska S.A.",
    period_start: period ? toIsoDate(period[1]) : null,
    period_end: period ? toIsoDate(period[2]) : null,
    transactions,
    line_count: lines.length,
  };
}

export async function extractPdfText(buffer, password) {
  let pdfjs;
  try {
    pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  } catch {
    pdfjs = await import("pdfjs-dist/build/pdf.mjs");
  }
  try {
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      password: password || "",
      isEvalSupported: false,
      disableFontFace: true,
      useSystemFonts: true,
      verbosity: 0,
    });
    const pdf = await loadingTask.promise;
    const pages = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      let lastY = null;
      const lines = [];
      let current = [];
      for (const item of content.items) {
        const str = item.str || "";
        if (!str) continue;
        const y = item.transform ? item.transform[5] : null;
        if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) {
          lines.push(current.join(" ").replace(/\s+/g, " ").trim());
          current = [];
        }
        current.push(str);
        lastY = y;
      }
      if (current.length) lines.push(current.join(" ").replace(/\s+/g, " ").trim());
      pages.push(lines.filter(Boolean).join("\n"));
    }
    return pages.join("\n");
  } catch (error) {
    const message = error?.message || String(error);
    if (/password/i.test(message) || error?.name === "PasswordException") {
      const wrapped = new Error(
        "This Credit Agricole PDF is password-protected. Save the statement password (often PESEL or the PIN from the bank) then fetch again."
      );
      wrapped.status = 400;
      throw wrapped;
    }
    throw error;
  }
}

export function groupByCategory(transactions) {
  const groups = new Map();
  for (const txn of transactions) {
    const key = txn.category || "Other";
    const current = groups.get(key) || { category: key, count: 0, expense: 0, income: 0, transactions: [] };
    current.count += 1;
    if (txn.type === "income") current.income += txn.amount;
    else current.expense += txn.amount;
    current.transactions.push(txn);
    groups.set(key, current);
  }
  return Array.from(groups.values()).sort((a, b) => b.expense + b.income - (a.expense + a.income));
}
