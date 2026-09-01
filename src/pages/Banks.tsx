import { Navigation } from "@/components/Navigation";
import { PlaidBankConnect } from "@/components/PlaidBankConnect";
import { GmailStatementConnect } from "@/components/GmailStatementConnect";

export default function Banks() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="mx-auto max-w-7xl px-4 py-4 sm:py-6 lg:py-8 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Poland banks</h1>
            <p className="text-muted-foreground mt-2">
              Connect Plaid, or import Credit Agricole statements from Gmail.
            </p>
          </div>
          <GmailStatementConnect />
          <PlaidBankConnect />
        </div>
      </main>
    </div>
  );
}
