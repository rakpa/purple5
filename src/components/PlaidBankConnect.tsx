import { useCallback, useEffect, useMemo, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Landmark, Link2, Loader2, RefreshCw, Unplug, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  connectPolandSandboxBank,
  createPlaidLinkToken,
  exchangePlaidPublicToken,
  getPlaidInstitutions,
  getPlaidItems,
  importPlaidTransactions,
  syncPlaidItem,
  unlinkPlaidItem,
  type MappedPlaidTransaction,
  type PlaidItem,
} from "@/lib/plaid";
import { formatCurrency } from "@/lib/utils";

const LINK_TOKEN_KEY = "plaid_link_token";
const REVOLUT_PL = "ins_132675";

async function importAndNotify(transactions: MappedPlaidTransaction[], institutionName: string) {
  const result = await importPlaidTransactions(transactions);
  if (result.imported > 0) {
    toast.success(
      `Imported ${result.imported} ${institutionName} transaction${result.imported === 1 ? "" : "s"}`
    );
  } else if (result.skipped > 0) {
    toast.success("Bank connected. No new transactions to import.");
  } else {
    toast.success(`${institutionName} connected.`);
  }
  return result;
}

function PlaidLinkLauncher({
  token,
  onSuccess,
  onExit,
}: {
  token: string;
  onSuccess: (publicToken: string) => void;
  onExit: () => void;
}) {
  const isOAuthRedirect = window.location.search.includes("oauth_state_id=");
  const config = {
    token,
    onSuccess: (publicToken: string) => onSuccess(publicToken),
    onExit: () => onExit(),
    ...(isOAuthRedirect ? { receivedRedirectUri: window.location.href } : {}),
  };
  const { open, ready } = usePlaidLink(config);

  useEffect(() => {
    if (ready) {
      open();
    }
  }, [open, ready]);

  return null;
}

export function PlaidBankConnect({ compact = false }: { compact?: boolean }) {
  const queryClient = useQueryClient();
  const [selectedBank, setSelectedBank] = useState("ins_132922");
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [openingLink, setOpeningLink] = useState(false);

  const institutionsQuery = useQuery({
    queryKey: ["plaid-institutions"],
    queryFn: getPlaidInstitutions,
    staleTime: 5 * 60 * 1000,
  });

  const itemsQuery = useQuery({
    queryKey: ["plaid-items"],
    queryFn: getPlaidItems,
  });

  const refreshFinance = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["plaid-items"] }),
      queryClient.invalidateQueries({ queryKey: ["transactions"] }),
    ]);
  };

  const connectMutation = useMutation({
    mutationFn: async (institutionId: string) => {
      const result = await connectPolandSandboxBank(institutionId);
      await importAndNotify(result.transactions, result.item.institution_name);
      return result;
    },
    onSuccess: async (result) => {
      queryClient.setQueryData(["plaid-items"], (current: { items?: PlaidItem[] } | undefined) => {
        const existing = current?.items?.filter((item) => item.item_id !== result.item.item_id) ?? [];
        return { items: [result.item, ...existing] };
      });
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (item: PlaidItem) => {
      const result = await syncPlaidItem(item.item_id);
      await importAndNotify(result.transactions, item.institution_name);
      return result;
    },
    onSuccess: async () => {
      await refreshFinance();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: unlinkPlaidItem,
    onSuccess: async () => {
      toast.success("Bank disconnected");
      await refreshFinance();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleExchange = useCallback(
    async (publicToken: string) => {
      try {
        const result = await exchangePlaidPublicToken(publicToken);
        if (result.transactions?.length) {
          await importAndNotify(result.transactions, result.item.institution_name);
        } else {
          const synced = await syncPlaidItem(result.item.item_id);
          await importAndNotify(synced.transactions, result.item.institution_name);
        }
        queryClient.setQueryData(["plaid-items"], (current: { items?: PlaidItem[] } | undefined) => {
          const existing = current?.items?.filter((item) => item.item_id !== result.item.item_id) ?? [];
          return { items: [result.item, ...existing] };
        });
        await queryClient.invalidateQueries({ queryKey: ["transactions"] });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to connect bank");
      } finally {
        localStorage.removeItem(LINK_TOKEN_KEY);
        setLinkToken(null);
        setOpeningLink(false);
        if (window.location.search.includes("oauth_state_id=")) {
          window.history.replaceState(null, "", window.location.pathname);
        }
      }
    },
    [queryClient]
  );

  const startPlaidLink = async (institutionId?: string) => {
    try {
      setOpeningLink(true);
      const created = await createPlaidLinkToken({
        redirectUri: `${window.location.origin}/banks`,
        institutionId,
      });
      localStorage.setItem(LINK_TOKEN_KEY, created.link_token);
      setLinkToken(created.link_token);
    } catch (error) {
      setOpeningLink(false);
      toast.error(error instanceof Error ? error.message : "Could not start Plaid Link");
    }
  };

  useEffect(() => {
    if (!window.location.search.includes("oauth_state_id=")) return;
    const stored = localStorage.getItem(LINK_TOKEN_KEY);
    if (stored) {
      setLinkToken(stored);
      setOpeningLink(true);
    }
  }, []);

  const items = useMemo(() => itemsQuery.data?.items ?? [], [itemsQuery.data?.items]);
  const institutions =
    institutionsQuery.data?.institutions?.length
      ? institutionsQuery.data.institutions
      : [
          { institution_id: "ins_132922", name: "PKO Bank Polski" },
          { institution_id: "ins_132987", name: "mBank" },
          { institution_id: "ins_132948", name: "ING Bank Śląski" },
          { institution_id: "ins_132924", name: "Bank Pekao" },
          { institution_id: "ins_132959", name: "Bank Millennium" },
          { institution_id: "ins_132949", name: "Alior Bank" },
          { institution_id: "ins_132675", name: "Revolut (PL)" },
        ];
  const envLabel = institutionsQuery.data?.env || "sandbox";

  const totalBalance = useMemo(() => {
    return items.reduce((sum, item) => {
      return (
        sum +
        item.accounts.reduce((accountSum, account) => accountSum + (account.current ?? 0), 0)
      );
    }, 0);
  }, [items]);

  if (compact) {
    const first = items[0];
    return (
      <Card className="rounded-2xl shadow-card">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-foreground">Poland bank</p>
                <Badge variant="secondary" className="rounded-full">
                  Plaid {envLabel}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {first
                  ? `${first.institution_name} · ${formatCurrency(totalBalance)}`
                  : "Connect your real Revolut account and import PLN transactions."}
              </p>
            </div>
          </div>
          {first ? (
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => syncMutation.mutate(first)}
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Sync
            </Button>
          ) : (
            <Button
              className="rounded-xl"
              onClick={() => startPlaidLink(REVOLUT_PL)}
              disabled={openingLink}
            >
              {openingLink ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wallet className="h-4 w-4" />
              )}
              Connect Revolut
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Landmark className="h-5 w-5" />
          Connect Revolut
        </CardTitle>
        <CardDescription>
          Log in to your real Revolut account with Plaid Open Banking and import PLN transactions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="rounded-full">
            Environment: {envLabel}
          </Badge>
          <Badge variant="outline" className="rounded-full">
            Country: Poland (PL)
          </Badge>
          <Badge variant="outline" className="rounded-full">
            Currency: PLN
          </Badge>
        </div>

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-4">
          <div>
            <p className="text-sm font-medium text-foreground">Your real Revolut</p>
            <p className="text-sm text-muted-foreground mt-1">
              Opens Revolut’s Open Banking login. This is not the sandbox test bank. You will leave this app, sign in at Revolut, then return here.
            </p>
            {envLabel !== "production" && (
              <p className="text-sm text-destructive mt-2">
                Plaid is still in <span className="font-medium">sandbox</span>. That cannot access your live Revolut. In the Plaid Dashboard copy the <span className="font-medium">Production</span> secret, then set Vercel <span className="font-mono">PLAID_ENV=production</span> and <span className="font-mono">PLAID_SECRET</span> to that production secret. Also add <span className="font-mono">{typeof window !== "undefined" ? `${window.location.origin}/banks` : "https://purple5.vercel.app/banks"}</span> under Allowed redirect URIs.
              </p>
            )}
          </div>
          <Button
            size="lg"
            className="rounded-xl"
            onClick={() => startPlaidLink(REVOLUT_PL)}
            disabled={openingLink}
          >
            {openingLink ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Link2 className="h-4 w-4" />
            )}
            Connect my Revolut
          </Button>
        </div>

        <div className="rounded-xl border border-border p-4 space-y-3">
          <div>
            <p className="text-sm font-medium text-foreground">Another Polish bank</p>
            <p className="text-sm text-muted-foreground mt-1">
              PKO, mBank, ING, Pekao, and others. Same Open Banking login. Add this site’s /banks URL in Plaid Allowed redirect URIs.
            </p>
          </div>
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => startPlaidLink()}
            disabled={openingLink}
          >
            {openingLink ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Link2 className="h-4 w-4" />
            )}
            Open Plaid Link
          </Button>
        </div>

        {envLabel !== "production" && (
        <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-4">
          <div>
            <p className="text-sm font-medium text-foreground">Sandbox test data</p>
            <p className="text-sm text-muted-foreground mt-1">
              Fake Polish bank data with <span className="font-mono">user_good / pass_good</span>. This will not log into your real Revolut.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedBank} onValueChange={setSelectedBank}>
              <SelectTrigger className="h-11 rounded-xl sm:max-w-xs">
                <SelectValue placeholder="Choose a Poland bank" />
              </SelectTrigger>
              <SelectContent>
                {institutions.map((bank) => (
                  <SelectItem key={bank.institution_id} value={bank.institution_id}>
                    {bank.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="lg"
              className="rounded-xl"
              onClick={() => connectMutation.mutate(selectedBank)}
              disabled={connectMutation.isPending}
            >
              {connectMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wallet className="h-4 w-4" />
              )}
              Connect sandbox bank
            </Button>
          </div>
        </div>
        )}

        {linkToken && (
          <PlaidLinkLauncher
            token={linkToken}
            onSuccess={handleExchange}
            onExit={() => {
              setOpeningLink(false);
              setLinkToken(null);
            }}
          />
        )}

        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Connected accounts</p>
          {itemsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading connected banks…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No Polish bank connected yet.</p>
          ) : (
            items.map((item) => (
              <div key={item.item_id} className="rounded-xl border border-border p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{item.institution_name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.accounts.length} account{item.accounts.length === 1 ? "" : "s"} · {envLabel}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => syncMutation.mutate(item)}
                      disabled={syncMutation.isPending}
                    >
                      {syncMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      Sync transactions
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-xl text-destructive"
                      onClick={() => unlinkMutation.mutate(item.item_id)}
                      disabled={unlinkMutation.isPending}
                    >
                      <Unplug className="h-4 w-4" />
                      Disconnect
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {item.accounts.map((account) => (
                    <div key={account.account_id} className="rounded-lg bg-muted/50 px-3 py-2">
                      <p className="text-sm font-medium text-foreground">
                        {account.name}
                        {account.mask ? ` ···${account.mask}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {account.subtype || account.type} ·{" "}
                        {formatCurrency(account.current ?? 0)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
