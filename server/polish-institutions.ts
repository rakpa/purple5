export const POLISH_BANKS = [
  { institution_id: "ins_132922", name: "PKO Bank Polski" },
  { institution_id: "ins_132987", name: "mBank" },
  { institution_id: "ins_132948", name: "ING Bank Śląski" },
  { institution_id: "ins_132924", name: "Bank Pekao" },
  { institution_id: "ins_132959", name: "Bank Millennium" },
  { institution_id: "ins_132949", name: "Alior Bank" },
  { institution_id: "ins_132675", name: "Revolut (PL)" },
] as const;

export type PolishBank = (typeof POLISH_BANKS)[number];
