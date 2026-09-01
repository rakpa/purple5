import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2, Mail, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchGmailStatements,
  getStoredStatementPassword,
  importGmailTransactions,
  searchGmailStatements,
  storeStatementPassword,
  type GmailCategoryGroup,
  type GmailStatementMatch,
} from "@/lib/gmail";
import { syncGmailFromGoogleLogin } from "@/lib/gmail-session";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";

function formatMailDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value || "";
  return parsed.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function GmailStatementConnect() {
  const queryClient = useQueryClient();
  const [loginEmail, setLoginEmail] = useState<string | null>(null);
  const [matches, setMatches] = useState<GmailStatementMatch[]>([]);
  const [selected, setSelected] = useState<GmailStatementMatch | null>(null);
  const [password, setPassword] = useState(() => getStoredStatementPassword());
  const [category, setCategory] = useState("all");
  const [result, setResult] = useState<{
    statements: { subject: string; filename: string; date: string; transaction_count: number; bank?: string }[];
    transactions: GmailCategoryGroup["transactions"];
    categories: GmailCategoryGroup[];
    message?: string;
  } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setLoginEmail(data.user?.email ?? null);
    });
    void syncGmailFromGoogleLogin().catch(() => {});
  }, []);

  const searchMutation = useMutation({
    mutationFn: async () => {
      const { data } = await supabase.auth.getSession();
      return searchGmailStatements({
        googleAccessToken: data.session?.provider_token,
      });
    },
    onSuccess: (payload) => {
      setMatches(payload.statements || []);
      setSelected(null);
      setResult(null);
      if (payload.message) toast.message(payload.message);
      else toast.success(`Found ${payload.statements.length} statement email${payload.statements.length === 1 ? "" : "s"}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const openMutation = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Select a statement email first.");
      const pin = password || getStoredStatementPassword();
      if (!pin) throw new Error("Enter the PDF password for this statement.");
      storeStatementPassword(pin);
      const { data } = await supabase.auth.getSession();
      return fetchGmailStatements({
        statementPassword: pin,
        googleAccessToken: data.session?.provider_token,
        messageId: selected.gmail_message_id,
      });
    },
    onSuccess: (payload) => {
      setResult(payload);
      setCategory("all");
      if (payload.message) toast.message(payload.message);
      else toast.success(`Loaded ${payload.transactions.length} transactions`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const filteredTransactions = useMemo(() => {
    const txns = result?.transactions ?? [];
    if (category === "all") return txns;
    return txns.filter((txn) => txn.category === category);
  }, [result, category]);

  const importMutation = useMutation({
    mutationFn: () => importGmailTransactions(filteredTransactions),
    onSuccess: async (payload) => {
      toast.success(`Imported ${payload.imported} transactions`);
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const email = loginEmail;

  return (
    <Card className="rounded-2xl shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Fetch your bank statement
        </CardTitle>
        <CardDescription>
          Search the Google account already used to sign in, pick a statement, then unlock the PDF.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="rounded-full">
            {email ? `Email already connected: ${email}` : "Using your Google login"}
          </Badge>
        </div>

        <Button
          className="rounded-xl"
          onClick={() => searchMutation.mutate()}
          disabled={searchMutation.isPending}
        >
          {searchMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          Fetch your bank statement
        </Button>

        {matches.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Which statement do you want to open?</p>
            <div className="space-y-2">
              {matches.map((item) => {
                const active = selected?.gmail_message_id === item.gmail_message_id;
                return (
                  <button
                    key={item.gmail_message_id}
                    type="button"
                    onClick={() => {
                      setSelected(item);
                      setResult(null);
                    }}
                    className={`w-full text-left rounded-xl border p-3 transition-colors ${
                      active ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <p className="text-sm font-medium text-foreground">{item.bank}</p>
                    <p className="text-sm text-foreground mt-0.5">{item.subject || "Bank statement PDF"}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatMailDate(item.date)}
                      {item.from ? ` · ${item.from}` : ""}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {selected && (
          <div className="space-y-3 rounded-xl border border-border p-4">
            <p className="text-sm font-medium text-foreground">
              Unlock {selected.bank}
            </p>
            <p className="text-xs text-muted-foreground">
              This is the PDF password from the bank (statement PIN), not your Gmail password.
            </p>
            <div className="space-y-2">
              <Label htmlFor="statement-pdf-password">Statement PDF password</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  id="statement-pdf-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Statement PIN"
                  className="h-11 rounded-xl"
                />
                <Button
                  className="rounded-xl"
                  onClick={() => openMutation.mutate()}
                  disabled={openMutation.isPending || !password}
                >
                  {openMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  Load statement
                </Button>
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.statements.map((statement) => (
              <div key={`${statement.subject}-${statement.filename}`} className="rounded-xl border border-border p-3">
                <p className="text-sm font-medium text-foreground">{statement.bank || statement.subject}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {statement.filename} · {statement.transaction_count} transactions
                </p>
              </div>
            ))}

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-11 rounded-xl sm:max-w-xs">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {(result.categories || []).map((group) => (
                    <SelectItem key={group.category} value={group.category}>
                      {group.category} ({group.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => importMutation.mutate()}
                disabled={importMutation.isPending || filteredTransactions.length === 0}
              >
                {importMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Import {filteredTransactions.length} into ExpenseTrack
              </Button>
            </div>

            <div className="space-y-2">
              {filteredTransactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No transactions in this statement.</p>
              ) : (
                filteredTransactions.map((txn) => (
                  <div key={txn.plaid_transaction_id} className="rounded-lg bg-muted/50 px-3 py-2 flex justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{txn.description_en || txn.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {txn.date} · {txn.category}
                        {txn.description_en && txn.description_en !== txn.description ? ` · ${txn.description}` : ""}
                      </p>
                    </div>
                    <p className={`text-sm font-medium ${txn.type === "income" ? "text-green-600" : "text-foreground"}`}>
                      {txn.type === "income" ? "+" : "-"}
                      {formatCurrency(txn.amount)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
