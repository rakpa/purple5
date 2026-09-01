import { parseCreditAgricoleText, groupByCategory } from "./credit-agricole-pdf.js";

const sample = `
Credit Agricole Bank Polska S.A.
Wyciąg z rachunku za okres od 01.08.2026 do 31.08.2026
Data operacji Data księgowania Opis Kwota Saldo
01.08.2026 01.08.2026 ZAKUP PRZY UŻYCIU KARTY BIEDRONKA -54,20 1200,00
02.08.2026 02.08.2026 PŁATNOŚĆ BLIK UBER -18,50 1181,50
05.08.2026 05.08.2026 PRZELEW PRZYCHODZĄCY WYNAGRODZENIE 3500,00 4681,50
10.08.2026 10.08.2026 ZAKUP KARTY MCDONALD -29,99 4651,51
12.08.2026 12.08.2026 WYPŁATA Z BANKOMATU -200,00 4451,51
`;

const parsed = parseCreditAgricoleText(sample, { idPrefix: "test" });
if (parsed.transactions.length !== 5) {
  throw new Error(`expected 5 txns, got ${parsed.transactions.length}`);
}
const groups = groupByCategory(parsed.transactions);
if (!groups.some((g) => g.category === "Groceries")) throw new Error("missing Groceries");
if (!groups.some((g) => g.category === "TAXI")) throw new Error("missing TAXI");
if (!groups.some((g) => g.category === "Food")) throw new Error("missing Food");
if (!groups.some((g) => g.category === "Cash")) throw new Error("missing Cash");
if (!parsed.transactions.some((t) => t.type === "income" && t.category === "Salary")) {
  throw new Error("missing salary income");
}
console.log("parser ok", parsed.period_start, parsed.period_end, groups.map((g) => g.category));
