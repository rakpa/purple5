import { useState, useMemo } from "react";
import { Search, TrendingUp, TrendingDown, ArrowUp, ArrowDown, Edit2, Trash2, ChevronDown, Calendar } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTransactions, deleteTransaction } from "@/lib/transactions";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from "date-fns";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from "recharts";
import { toast } from "sonner";
import { cn, capitalizeFirst } from "@/lib/utils";
import type { Transaction } from "@/types/transaction";
import { EditTransactionDialog } from "@/components/EditTransactionDialog";

const COLORS = {
  income: "#22c55e",
  expense: "#ef4444",
  hdfc: "#14b8a6",
  amex: "#ef4444",
  subscriptions: "#ef4444",
  groceries: "#3b82f6",
};

type DateFilterType = "this-month" | "last-month" | "this-year" | "custom";

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("expense");
  const [dateFilter, setDateFilter] = useState<DateFilterType>("this-month");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);
  const [isCustomDateOpen, setIsCustomDateOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Calculate date range based on filter type
  const dateRange = useMemo(() => {
    const now = new Date();
    
    switch (dateFilter) {
      case "this-month":
        return {
          start: format(startOfMonth(now), "yyyy-MM-dd"),
          end: format(endOfMonth(now), "yyyy-MM-dd"),
          label: "This Month",
        };
      case "last-month":
        const lastMonth = subMonths(now, 1);
        return {
          start: format(startOfMonth(lastMonth), "yyyy-MM-dd"),
          end: format(endOfMonth(lastMonth), "yyyy-MM-dd"),
          label: "Last Month",
        };
      case "this-year":
        return {
          start: format(startOfYear(now), "yyyy-MM-dd"),
          end: format(endOfYear(now), "yyyy-MM-dd"),
          label: "This Year",
        };
      case "custom":
        if (customStartDate && customEndDate) {
          return {
            start: format(customStartDate, "yyyy-MM-dd"),
            end: format(customEndDate, "yyyy-MM-dd"),
            label: `${format(customStartDate, "MMM dd")} - ${format(customEndDate, "MMM dd, yyyy")}`,
          };
        }
        // Fallback to this month if custom dates not set
        return {
          start: format(startOfMonth(now), "yyyy-MM-dd"),
          end: format(endOfMonth(now), "yyyy-MM-dd"),
          label: "Custom Date",
        };
      default:
        return {
          start: format(startOfMonth(now), "yyyy-MM-dd"),
          end: format(endOfMonth(now), "yyyy-MM-dd"),
          label: "This Month",
        };
    }
  }, [dateFilter, customStartDate, customEndDate]);

  // Fetch transactions based on date range
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions", { startDate: dateRange.start, endDate: dateRange.end }],
    queryFn: () => getTransactions({ startDate: dateRange.start, endDate: dateRange.end }),
  });

  // Calculate metrics
  const metrics = useMemo(() => {
    const income = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const expenses = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const balance = income - expenses;

    return { income, expenses, balance };
  }, [transactions]);

  // Prepare chart data
  const expenseBreakdown = useMemo(() => {
    const expenseTransactions = transactions.filter((t) => t.type === "expense");
    const categoryMap = new Map<string, number>();

    expenseTransactions.forEach((t) => {
      const category = t.category;
      const current = categoryMap.get(category) || 0;
      categoryMap.set(category, current + Number(t.amount));
    });

    return Array.from(categoryMap.entries())
      .map(([category, amount]) => ({
        category,
        amount: Number(amount.toFixed(2)),
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  const incomeBreakdown = useMemo(() => {
    const incomeTransactions = transactions.filter((t) => t.type === "income");
    const categoryMap = new Map<string, number>();

    incomeTransactions.forEach((t) => {
      const category = t.category;
      const current = categoryMap.get(category) || 0;
      categoryMap.set(category, current + Number(t.amount));
    });

    return Array.from(categoryMap.entries())
      .map(([category, amount]) => ({
        category,
        amount: Number(amount.toFixed(2)),
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);


  // Recent transactions (filtered and sorted)
  const recentTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        const searchLower = searchQuery.toLowerCase();
        return (
          !searchQuery ||
          t.description?.toLowerCase().includes(searchLower) ||
          t.category.toLowerCase().includes(searchLower)
        );
      })
      .slice(0, 10)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchQuery]);

  const deleteMutation = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      toast.success("Transaction deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete transaction: ${error.message}`);
    },
  });

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this transaction?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsEditDialogOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString("pl-PL", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} PLN`;
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      // Check if date is today
      if (date.toDateString() === today.toDateString()) {
        return "Today";
      }
      // Check if date is yesterday
      if (date.toDateString() === yesterday.toDateString()) {
        return "Yesterday";
      }
      // For mobile, use shorter format
      return format(date, "MMM dd, yyyy");
    } catch {
      return dateString;
    }
  };

  const getCategoryColor = (category: string) => {
    const lower = category.toLowerCase();
    if (lower.includes("hdfc")) return COLORS.hdfc;
    if (lower.includes("amex")) return COLORS.amex;
    if (lower.includes("subscription")) return COLORS.subscriptions;
    if (lower.includes("grocery")) return COLORS.groceries;
    return COLORS.expense;
  };

  const chartConfig = useMemo(() => {
    const config: Record<string, { label: string; color?: string }> = {
      amount: {
        label: "Amount",
      },
    };

    expenseBreakdown.forEach((item) => {
      config[item.category] = {
        label: item.category,
        color: getCategoryColor(item.category),
      };
    });

    incomeBreakdown.forEach((item) => {
      config[item.category] = {
        label: item.category,
        color: COLORS.income,
      };
    });

    return config;
  }, [expenseBreakdown, incomeBreakdown]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="mx-auto max-w-7xl px-4 py-4 sm:py-6 lg:py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-xl font-semibold text-card-foreground">Dashboard</h1>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {dateFilter === "custom" ? (
              <Popover open={isCustomDateOpen} onOpenChange={setIsCustomDateOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="rounded-xl gap-2">
                    <Calendar className="h-4 w-4" />
                    {customStartDate && customEndDate
                      ? `${format(customStartDate, "MMM dd")} - ${format(customEndDate, "MMM dd, yyyy")}`
                      : "Select Date Range"}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-xl" align="end">
                  <div className="p-4 space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Start Date</label>
                      <CalendarComponent
                        mode="single"
                        selected={customStartDate}
                        onSelect={(date) => {
                          setCustomStartDate(date);
                          if (date && customEndDate && date > customEndDate) {
                            setCustomEndDate(undefined);
                          }
                        }}
                        className="rounded-md border"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">End Date</label>
                      <CalendarComponent
                        mode="single"
                        selected={customEndDate}
                        onSelect={(date) => {
                          if (date && customStartDate && date < customStartDate) {
                            toast.error("End date must be after start date");
                            return;
                          }
                          setCustomEndDate(date);
                          if (date && customStartDate) {
                            setIsCustomDateOpen(false);
                          }
                        }}
                        disabled={(date) => customStartDate ? date < customStartDate : false}
                        className="rounded-md border"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setDateFilter("this-month");
                          setCustomStartDate(undefined);
                          setCustomEndDate(undefined);
                          setIsCustomDateOpen(false);
                        }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      {customStartDate && customEndDate && (
                        <Button
                          onClick={() => setIsCustomDateOpen(false)}
                          className="flex-1"
                        >
                          Apply
                        </Button>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="rounded-xl gap-2">
                    {dateRange.label}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl">
                  <DropdownMenuItem
                    onClick={() => {
                      setDateFilter("this-month");
                      setCustomStartDate(undefined);
                      setCustomEndDate(undefined);
                    }}
                    className="rounded-lg"
                  >
                    This Month
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setDateFilter("last-month");
                      setCustomStartDate(undefined);
                      setCustomEndDate(undefined);
                    }}
                    className="rounded-lg"
                  >
                    Last Month
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setDateFilter("this-year");
                      setCustomStartDate(undefined);
                      setCustomEndDate(undefined);
                    }}
                    className="rounded-lg"
                  >
                    This Year
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setDateFilter("custom");
                      setIsCustomDateOpen(true);
                    }}
                    className="rounded-lg"
                  >
                    Custom Date
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="mb-8 grid gap-6 md:grid-cols-3">
          {/* Current Balance */}
          <Card className="rounded-2xl shadow-card">
            <CardHeader className="pb-3">
              <CardDescription>Current Balance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xl font-semibold text-foreground">
                    {formatCurrency(metrics.balance)}
                  </p>
                  <p
                    className={cn(
                      "mt-2 flex items-center gap-1 text-sm font-medium",
                      metrics.balance >= 0 ? "text-green-600" : "text-red-600"
                    )}
                  >
                    {metrics.balance >= 0 ? (
                      <>
                        <TrendingUp className="h-4 w-4" />
                        Positive balance
                      </>
                    ) : (
                      <>
                        <TrendingDown className="h-4 w-4" />
                        Negative balance
                      </>
                    )}
                  </p>
                </div>
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-xl",
                    metrics.balance >= 0 ? "bg-green-100" : "bg-red-100"
                  )}
                >
                  {metrics.balance >= 0 ? (
                    <TrendingUp className={cn("h-6 w-6", metrics.balance >= 0 ? "text-green-600" : "text-red-600")} />
                  ) : (
                    <TrendingDown className="h-6 w-6 text-red-600" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Income */}
          <Card className="rounded-2xl shadow-card">
            <CardHeader className="pb-3">
              <CardDescription>{dateRange.label} Income</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xl font-semibold text-foreground">
                    {formatCurrency(metrics.income)}
                  </p>
                  <p className="mt-2 flex items-center gap-1 text-sm font-medium text-green-600">
                    <ArrowUp className="h-4 w-4" />
                    Money coming in
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
                  <ArrowUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expenses */}
          <Card className="rounded-2xl shadow-card">
            <CardHeader className="pb-3">
              <CardDescription>{dateRange.label} Expenses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xl font-semibold text-foreground">
                    {formatCurrency(metrics.expenses)}
                  </p>
                  <p className="mt-2 flex items-center gap-1 text-sm font-medium text-red-600">
                    <ArrowDown className="h-4 w-4" />
                    Money going out
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
                  <ArrowDown className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Financial Overview */}
        <Card className="mb-8 rounded-2xl shadow-card">
          <CardHeader>
            <CardTitle>Financial Overview</CardTitle>
            <CardDescription>Track your balance, income, and expenses over time</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="flex rounded-xl bg-muted p-1">
                <TabsTrigger 
                  value="income" 
                  className={cn(
                    "flex-1 rounded-lg py-2.5 text-sm font-medium transition-all",
                    "data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-sm",
                    "data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground"
                  )}
                >
                  Income Breakdown
                </TabsTrigger>
                <TabsTrigger 
                  value="expense" 
                  className={cn(
                    "flex-1 rounded-lg py-2.5 text-sm font-medium transition-all",
                    "data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-sm",
                    "data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground"
                  )}
                >
                  Expense Breakdown
                </TabsTrigger>
              </TabsList>

              <TabsContent value="income" className="mt-6">
                {incomeBreakdown.length > 0 ? (
                  <>
                    <div className="mb-4 flex flex-wrap gap-4">
                      {incomeBreakdown.map((item) => (
                        <div key={item.category} className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: COLORS.income }}
                          />
                          <span className="text-sm text-muted-foreground">
                            {capitalizeFirst(item.category)}: {formatCurrency(item.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <ChartContainer config={chartConfig} className="h-[300px]">
                      <ResponsiveContainer>
                        <BarChart data={incomeBreakdown.map(item => ({ ...item, category: capitalizeFirst(item.category) }))}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="category" />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar 
                            dataKey="amount" 
                            fill={COLORS.income} 
                            radius={[8, 8, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </>
                ) : (
                  <div className="py-12 text-center text-muted-foreground">
                    No income data available
                  </div>
                )}
              </TabsContent>

              <TabsContent value="expense" className="mt-6">
                {expenseBreakdown.length > 0 ? (
                  <>
                    <div className="mb-4 flex flex-wrap gap-4">
                      {expenseBreakdown.map((item) => (
                        <div key={item.category} className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: getCategoryColor(item.category) }}
                          />
                          <span className="text-sm text-muted-foreground">
                            {capitalizeFirst(item.category)}: {formatCurrency(item.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <ChartContainer config={chartConfig} className="h-[300px]">
                      <ResponsiveContainer>
                        <BarChart data={expenseBreakdown.map(item => ({ ...item, category: capitalizeFirst(item.category) }))}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="category" />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar
                            dataKey="amount"
                            radius={[8, 8, 0, 0]}
                          >
                            {expenseBreakdown.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={getCategoryColor(entry.category)} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </>
                ) : (
                  <div className="py-12 text-center text-muted-foreground">
                    No expense data available
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="rounded-2xl shadow-card">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Your latest financial activities</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 rounded-xl border-input bg-background pl-10 shadow-sm"
              />
            </div>

            {/* Transaction List */}
            {isLoading ? (
              <div className="py-12 text-center text-muted-foreground">
                Loading transactions...
              </div>
            ) : recentTransactions.length > 0 ? (
              <div className="space-y-2 sm:space-y-3">
                {recentTransactions.map((transaction) => {
                  const isIncome = transaction.type === "income";
                  
                  return (
                    <div
                      key={transaction.id}
                      className="group flex items-center gap-3 sm:gap-4 rounded-xl border border-border bg-background p-3 sm:p-4 transition-all hover:border-primary/20 hover:shadow-sm"
                    >
                      {/* Icon */}
                      <div
                        className={cn(
                          "flex h-12 w-12 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl",
                          isIncome
                            ? "bg-green-100 text-green-600"
                            : "bg-red-100 text-red-600"
                        )}
                      >
                        {isIncome ? (
                          <ArrowUp className="h-5 w-5 sm:h-5 sm:w-5" />
                        ) : (
                          <ArrowDown className="h-5 w-5 sm:h-5 sm:w-5" />
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <p className="font-medium text-foreground text-sm sm:text-base line-clamp-2 break-words">
                          {capitalizeFirst(transaction.category)}
                        </p>
                        <div className="flex flex-col gap-0.5">
                          {transaction.description && (
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">
                              {transaction.description}
                            </p>
                          )}
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            {formatDate(transaction.date)}
                          </p>
                        </div>
                      </div>

                      {/* Amount & Actions */}
                      <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3 shrink-0">
                        <span
                          className={cn(
                            "text-sm sm:text-base font-semibold whitespace-nowrap",
                            isIncome ? "text-green-600" : "text-red-600"
                          )}
                        >
                          {isIncome ? "+" : "-"}
                          {formatCurrency(Math.abs(Number(transaction.amount)))}
                        </span>

                        <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => handleEdit(transaction)}
                          >
                            <Edit2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-red-600"
                            onClick={() => handleDelete(transaction.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                No transactions found
              </div>
            )}
          </CardContent>
        </Card>

        <EditTransactionDialog
          transaction={editingTransaction}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
        />
      </main>
    </div>
  );
}

