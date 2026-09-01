import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2, Mail, RefreshCw, Unplug } from "lucide-react";
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
  disconnectGmail,
  fetchGmailStatements,
  finishGmailConnect,
  getGmailStatus,
  importGmailTransactions,
  saveGmailStatementPassword,
  startGmailConnect,
  type GmailCategoryGroup,
} from "@/lib/gmail";
import { formatCurrency } from "@/lib/utils";

export function GmailStatementConnect() {
  const queryClient = useQueryClient();
  const [password, setPassword] = useState("");
  const [category, setCategory] = useState("all");
  const [result, setResult] = useState<{
    statements: { subject: string; filename: string; date: string; transaction_count: number; text_preview?: string }[];
    transactions: GmailCategoryGroup["transactions"];
    categories: GmailCategoryGroup[];
    message?: string;
  } | null>(null);

  const finishingOAuth = useRef(false);

  const statusQuery = useQuery({
    queryKey: ["gmail-status"],
    queryFn: getGmailStatus,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    if (!code || !state || !state.includes(".")) return;
    if (finishingOAuth.current) return;
    finishingOAuth.current = true;
    const redirectUri = `${window.location.origin}/settings`;
    window.history.replaceState(null, "", window.location.pathname);
    finishGmailConnect(code, state, redirectUri)
      .then(async (payload) => {
        toast.success(`Gmail connected${payload.email ? `: ${payload.email}` : ""}`);
        await queryClient.invalidateQueries({ queryKey: ["gmail-status"] });
      })
      .catch((error) => {
        finishingOAuth.current = false;
        toast.error(error instanceof Error ? error.message : "Could not finish Gmail connect");
      });
  }, [queryClient]);

  const connectMutation = useMutation({
    mutationFn: async () => {
      const redirectUri = `${window.location.origin}/settings`;
      const started = await startGmailConnect(redirectUri, "/settings");
      window.location.href = started.url;
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const savePasswordMutation = useMutation({
    mutationFn: () => saveGmailStatementPassword(password),
    onSuccess: async () => {
      toast.success("Statement password saved");
      await queryClient.invalidateQueries({ queryKey: ["gmail-status"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const fetchMutation = useMutation({
    mutationFn: () => fetchGmailStatements({ statementPassword: password || undefined }),
    onSuccess: (payload) => {
      setResult(payload);
      setCategory("all");
      if (payload.message) toast.message(payload.message);
      else toast.success(`Found ${payload.transactions.length} transactions`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const importMutation = useMutation({
    mutationFn: () => importGmailTransactions(filteredTransactions),
    onSuccess: async (payload) => {
      toast.success(`Imported ${payload.imported} transactions`);
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectGmail,
    onSuccess: async () => {
      toast.success("Gmail disconnected");
      setResult(null);
      await queryClient.invalidateQueries({ queryKey: ["gmail-status"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const connected = statusQuery.data?.connected;
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
          Connect Gmail, then fetch Credit Agricole emails titled “Wyciąg elektroniczny”. The PDF is unlocked with your statement password and transactions are grouped by category.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={connected ? "secondary" : "outline"} className="rounded-full">
            {connected ? `Connected: ${statusQuery.data?.email || "Gmail"}` : "Not connected"}
          </Badge>
          <Badge variant="outline" className="rounded-full">
            Credit Agricole
          </Badge>
        </div>

        {!connected ? (
          <Button
            size="lg"
            className="rounded-xl"
            onClick={() => connectMutation.mutate()}
            disabled={connectMutation.isPending}
          >
            {connectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Connect Gmail
          </Button>
        ) : (
          <div className="space-y-4">
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
                Credit Agricole sends a password-protected PDF. This is not your Gmail password.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
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
              <Button
                variant="ghost"
                className="rounded-xl text-destructive"
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending}
              >
                <Unplug className="h-4 w-4" />
                Disconnect
              </Button>
            </div>
          </div>
        )}

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
