import { GmailStatementConnect } from "@/components/GmailStatementConnect";

// Compatibility wrapper: Plaid bank linking has been removed from the product UI.
// Existing imports now show the Gmail Credit Agricole statement fetcher instead.
export function PlaidBankConnect({ compact: _compact = false }: { compact?: boolean }) {
  return <GmailStatementConnect />;
}
