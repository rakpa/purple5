import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  getGmailStatus,
  getStoredStatementPassword,
  importGmailTransactions,
  saveGmailStatementPassword,
  storeStatementPassword,
  type GmailCategoryGroup,
} from "@/lib/gmail";
import { syncGmailFromGoogleLogin } from "@/lib/gmail-session";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";

export function GmailStatementConnect() {
  const queryClient = useQueryClient();
  const [password, setPassword] = useState(() => getStoredStatementPassword());
  const [category, setCategory] = useState("all");
  const [loginEmail, setLoginEmail] = useState<string | null>(null);
  const autoFetched = useRef(false);
  const [result, setResult] = useState<{
    statements: { subject: string; filename: string; date: string; transaction_count: number; text_preview?: string }[];
    transactions: GmailCategoryGroup["transactions"];
    categories: GmailCategoryGroup[];
    message?: string;
  } | null>(null);

  const statusQuery = useQuery({
    queryKey: ["gmail-status"],
    queryFn: getGmailStatus,
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setLoginEmail(data.user?.email ?? null);
    });
    void syncGmailFromGoogleLogin()
      .then(async () => {
        await queryClient.invalidateQueries({ queryKey: ["gmail-status"] });
      })
      .catch(() => {});
  }, [queryClient]);

  const savePasswordMutation = useMutation({
    mutationFn: () => saveGmailStatementPassword(password),
    onSuccess: async () => {
      storeStatementPassword(password);
      toast.success("Statement password saved");
      await queryClient.invalidateQueries({ queryKey: ["gmail-status"] });
      fetchMutation.mutate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const fetchMutation = useMutation({
    mutationFn: async () => {
      const pin = password || getStoredStatementPassword();
      if (pin) storeStatementPassword(pin);
      const { data } = await supabase.auth.getSession();
      return fetchGmailStatements({
        statementPassword: pin || undefined,
        googleAccessToken: data.session?.provider_token,
      });
    },
    onSuccess: (payload) => {
      setResult(payload);
      setCategory("all");
      if (payload.message) toast.message(payload.message);
      else toast.success(`Found ${payload.transactions.length} transactions`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  useEffect(() => {
    if (autoFetched.current) return;
    const pin = password || getStoredStatementPassword();
    if (!pin) return;
    let cancelled = false;
    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled || autoFetched.current || !data.session?.provider_token) return;
      autoFetched.current = true;
      fetchMutation.mutate();
    });
    return () => {
      cancelled = true;
    };
    // Fetch once when Settings opens with a saved PIN and a live Google token.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [password]);

  const importMutation = useMutation({
    mutationFn: () => importGmailTransactions(filteredTransactions),
    onSuccess: async (payload) => {
      toast.success(`Imported ${payload.imported} transactions`);
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const email = statusQuery.data?.email || loginEmail;
  const filteredTransactions = useMemo(() => {
    const txns = result?.transactions ?? [];
    if (category === "all") return txns;
    return txns.filter((txn) => txn.category === category);
  }, [result, category]);

  return (
    <Card className="rounded-2xl shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Gmail bank statements
        </CardTitle>
        <CardDescription>
          Statement emails are read from the Google account you already used to sign in. There is no second Connect or authorize step.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="rounded-full">
            {email ? `Using ${email}` : "Using your Google login"}
          </Badge>
          <Badge variant="outline" className="rounded-full">
            Credit Agricole
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Enter the Credit Agricole PDF password, then this screen fetches emails titled
          &quot;Wyciąg elektroniczny&quot; from the same Google account. Saving the password starts
          the fetch. If Google asks for extra permission, allow it once.
        </p>

        <div className="space-y-2">
          <Label htmlFor="ca-pdf-password">Credit Agricole PDF password</Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              id="ca-pdf-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={statusQuery.data?.has_password ? "Saved — enter to replace" : "Statement PIN"}
              className="h-11 rounded-xl"
            />
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => savePasswordMutation.mutate()}
              disabled={!password || savePasswordMutation.isPending}
            >
              Save password
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            This unlocks the bank PDF. It is not your Gmail password.
          </p>
        </div>

        <Button
          className="rounded-xl"
          onClick={() => fetchMutation.mutate()}
          disabled={fetchMutation.isPending}
        >
          {fetchMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          Fetch statements
        </Button>

        {result && (
          <div className="space-y-4">
            {result.statements.map((statement) => (
              <div key={`${statement.gmail_message_id}-${statement.filename}`} className="rounded-xl border border-border p-3">
                <p className="text-sm font-medium text-foreground">{statement.subject || statement.filename}</p>
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
                <p className="text-sm text-muted-foreground">No transactions in this category.</p>
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
