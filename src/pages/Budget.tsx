import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  format,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import {
  Building2,
  ShoppingCart,
  Wallet,
  Calendar,
  ChevronDown,
  Plus,
  TrendingUp,
} from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { BudgetDialog } from "@/components/BudgetDialog";
import { CategoryIcon } from "@/components/CategoryIcon";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { getTransactions } from "@/lib/transactions";
import { getBudgets } from "@/lib/budgets";
import { getCategories } from "@/lib/categories";
import { cn, capitalizeFirst, formatCurrency } from "@/lib/utils";

type BudgetStatus = "over" | "match" | "under";

/** Over budget → red, on target (matches) → green, under budget → yellow */
function getBudgetStatus(spent: number, limit: number): BudgetStatus {
  if (limit <= 0) return "under";
  if (spent > limit) return "over";
  const percentUsed = (spent / limit) * 100;
  if (percentUsed >= 85) return "match";
  return "under";
}

const statusStyles: Record<
  BudgetStatus,
  { remaining: string; progressClass: string }
> = {
  over: {
    remaining: "text-red-600",
    progressClass: "[&>div]:bg-red-500",
  },
  match: {
    remaining: "text-green-600",
    progressClass: "[&>div]:bg-green-500",
  },
  under: {
    remaining: "text-yellow-600",
    progressClass: "[&>div]:bg-yellow-500",
  },
};

function buildMonthOptionsForYear(year: number) {
  const options: { label: string; month: number; year: number }[] = [];
  for (let month = 1; month <= 12; month++) {
    const d = new Date(year, month - 1, 1);
    options.push({
      label: format(d, "MMMM yyyy"),
      month,
      year,
    });
  }
  return options;
}

function getDefaultPeriod(year: number) {
  const options = buildMonthOptionsForYear(year);
  const now = new Date();
  return (
    options.find((o) => o.month === now.getMonth() + 1 && o.year === year) ?? options[0]
  );
}

const BUDGET_YEAR = 2026;

export default function Budget() {
  const monthOptions = useMemo(() => buildMonthOptionsForYear(BUDGET_YEAR), []);
  const [selectedPeriod, setSelectedPeriod] = useState(() => getDefaultPeriod(BUDGET_YEAR));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<string | undefined>();
  const [editAmount, setEditAmount] = useState<number | undefined>();
  const [editRepeatMonthly, setEditRepeatMonthly] = useState<boolean | undefined>();

  const periodDate = useMemo(
    () => new Date(selectedPeriod.year, selectedPeriod.month - 1, 1),
    [selectedPeriod]
  );

  const dateRange = useMemo(
    () => ({
      start: format(startOfMonth(periodDate), "yyyy-MM-dd"),
      end: format(endOfMonth(periodDate), "yyyy-MM-dd"),
    }),
    [periodDate]
  );

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ["transactions", { startDate: dateRange.start, endDate: dateRange.end }],
    queryFn: () => getTransactions({ startDate: dateRange.start, endDate: dateRange.end }),
  });

  const { data: budgets = [], isLoading: budgetsLoading } = useQuery({
    queryKey: ["budgets", selectedPeriod.month, selectedPeriod.year],
    queryFn: () => getBudgets(selectedPeriod.month, selectedPeriod.year),
  });

  const { data: expenseCategories = [] } = useQuery({
    queryKey: ["categories", "expense"],
    queryFn: () => getCategories("expense"),
  });

  const { data: allCategories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(),
  });

  const categoryIconMap = useMemo(
    () => new Map(allCategories.map((cat) => [cat.name.trim().toLowerCase(), cat.icon])),
    [allCategories]
  );

  const spentByCategory = useMemo(() => {
    const map = new Map<string, number>();
    transactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const key = t.category.trim();
        map.set(key, (map.get(key) || 0) + Number(t.amount));
      });
    return map;
  }, [transactions]);

  const categoryBudgets = useMemo(() => {
    return budgets.map((budget) => {
      const spent = spentByCategory.get(budget.category) || 0;
      const limit = Number(budget.amount);
      const remaining = Math.max(limit - spent, 0);
      const percentUsed = limit > 0 ? Math.round((spent / limit) * 100) : 0;
      const status = getBudgetStatus(spent, limit);
      return {
        ...budget,
        spent,
        limit,
        remaining,
        percentUsed,
        status,
        icon: categoryIconMap.get(budget.category.trim().toLowerCase()) || "Circle",
      };
    });
  }, [budgets, spentByCategory, categoryIconMap]);

  const summary = useMemo(() => {
    const totalBudgeted = categoryBudgets.reduce((sum, b) => sum + b.limit, 0);
    const totalSpent = categoryBudgets.reduce((sum, b) => sum + b.spent, 0);
    const remaining = Math.max(totalBudgeted - totalSpent, 0);
    const percentOfBudget =
      totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0;
    return { totalBudgeted, totalSpent, remaining, percentOfBudget };
  }, [categoryBudgets]);

  const openNewBudget = (category?: string, amount?: number, repeatMonthly?: boolean) => {
    setEditCategory(category);
    setEditAmount(amount);
    setEditRepeatMonthly(repeatMonthly);
    setDialogOpen(true);
  };

  const isLoading = transactionsLoading || budgetsLoading;

  return (
    <div className="min-h-screen bg-muted/40">
      <Navigation />

      <main className="mx-auto max-w-7xl px-4 py-4 sm:py-6 lg:py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Budget Overview
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Track and manage your spending goals.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="rounded-xl bg-card shadow-sm gap-2 min-w-[140px] justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {selectedPeriod.label}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl max-h-64 overflow-y-auto">
                {monthOptions.map((opt) => (
                  <DropdownMenuItem
                    key={`${opt.year}-${opt.month}`}
                    onClick={() => setSelectedPeriod(opt)}
                    className="rounded-lg cursor-pointer"
                  >
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              className="rounded-xl bg-foreground text-background hover:bg-foreground/90 gap-2"
              onClick={() => openNewBudget()}
            >
              <Plus className="h-4 w-4" />
              New Budget
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <Card className="rounded-2xl border-0 shadow-card bg-card">
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Total Budgeted
                  </p>
                  <p className="mt-2 text-xl font-semibold text-foreground">
                    {isLoading ? "—" : formatCurrency(summary.totalBudgeted)}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Target across all categories
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 shadow-card bg-card">
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Total Spent
                  </p>
                  <p className="mt-2 text-xl font-semibold text-foreground">
                    {isLoading ? "—" : formatCurrency(summary.totalSpent)}
                  </p>
                  <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3 text-green-600" />
                    {summary.percentOfBudget}% of total budget
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 shadow-card bg-card relative overflow-hidden">
            <CardContent className="p-5 sm:p-6 relative z-10">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Remaining
                  </p>
                  <p className="mt-2 text-xl font-semibold text-green-600">
                    {isLoading ? "—" : formatCurrency(summary.remaining)}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">Available to spend</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                  <Wallet className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
            <Wallet className="absolute -bottom-4 -right-4 h-24 w-24 text-green-100/80 pointer-events-none" />
          </Card>
        </div>

        {/* Category breakdown */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Category Breakdown</h2>
          <Link
            to="/categories"
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
          >
            View all
          </Link>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading budget data...</p>
        ) : categoryBudgets.length === 0 ? (
          <Card className="rounded-2xl border-0 shadow-card bg-card">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground mb-4">
                No budgets set for {selectedPeriod.label}. Add expense transactions and set category budgets to track spending.
              </p>
              <Button className="rounded-xl" onClick={() => openNewBudget()}>
                <Plus className="h-4 w-4 mr-2" />
                Create your first budget
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categoryBudgets.map((item) => {
              const styles = statusStyles[item.status];
              return (
                <Card
                  key={item.id}
                  className="rounded-2xl border-0 shadow-card bg-card cursor-pointer hover:shadow-elevated transition-shadow"
                  onClick={() => openNewBudget(item.category, item.limit, item.repeat_monthly)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <CategoryIcon iconName={item.icon} size={18} />
                        <span className="font-semibold text-foreground truncate">
                          {capitalizeFirst(item.category)}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-muted-foreground">Remaining</p>
                        <p className={cn("text-sm font-bold", styles.remaining)}>
                          {formatCurrency(item.remaining)}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Spent: {formatCurrency(item.spent)} / {formatCurrency(item.limit)}
                    </p>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="sr-only">Progress</span>
                      <span className="text-xs font-medium text-muted-foreground ml-auto">
                        {item.percentUsed}%
                      </span>
                    </div>
                    <Progress
                      value={Math.min(item.percentUsed, 100)}
                      className={cn("h-2 bg-muted", styles.progressClass)}
                    />
                  </CardContent>
                </Card>
              );
            })}

            {/* Add category card */}
            <button
              type="button"
              onClick={() => openNewBudget()}
              className="rounded-2xl border-2 border-dashed border-muted-foreground/30 bg-muted/30 p-5 text-left hover:bg-muted/50 hover:border-muted-foreground/50 transition-colors min-h-[160px] flex flex-col items-center justify-center"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
                <Plus className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-semibold text-foreground">Add Category</p>
              <p className="mt-1 text-xs text-muted-foreground text-center max-w-[200px]">
                Create a new budget tracking category
              </p>
            </button>
          </div>
        )}
      </main>

      <BudgetDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        expenseCategories={expenseCategories}
        month={selectedPeriod.month}
        year={selectedPeriod.year}
        preselectedCategory={editCategory}
        existingAmount={editAmount}
        existingRepeatMonthly={editRepeatMonthly}
      />
    </div>
  );
}
