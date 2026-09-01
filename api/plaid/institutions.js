const BANKS = [
  { institution_id: "ins_132922", name: "PKO Bank Polski" },
  { institution_id: "ins_132987", name: "mBank" },
  { institution_id: "ins_132948", name: "ING Bank Śląski" },
  { institution_id: "ins_132924", name: "Bank Pekao" },
  { institution_id: "ins_132959", name: "Bank Millennium" },
  { institution_id: "ins_132949", name: "Alior Bank" },
  { institution_id: "ins_132675", name: "Revolut (PL)" },
];

export default function handler(_req, res) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.end(
    JSON.stringify({
      env: process.env.PLAID_ENV || "sandbox",
      country_codes: ["PL"],
      institutions: BANKS,
    })
  );
}
