import { useState, useMemo } from "react";
import { Sparkles, Search, TrendingUp, TrendingDown, Loader2, Calendar, Filter, X, ArrowUp, ArrowDown, MapPin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getTransactions } from "@/lib/transactions";
import { getCategories } from "@/lib/categories";
import { getCurrencyEntries } from "@/lib/currency-entries";
import { format, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays } from "date-fns";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { formatCurrency, cn, capitalizeFirst } from "@/lib/utils";
import { formatPLN, formatINR } from "@/lib/currency-format";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import type { Transaction } from "@/types/transaction";
import type { CurrencyEntry } from "@/types/currency-entry";

interface QueryResult {
  total: number;
  count: number;
  type: "expense" | "income" | "both";
  category?: string;
  period: string;
  query: string;
  transactions?: Transaction[];
}

export default function AISummary() {
  const [query, setQuery] = useState("");
  const [parsedQuery, setParsedQuery] = useState<QueryResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Quick filter states
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<"expense" | "income" | "all">("all");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [useQuickFilters, setUseQuickFilters] = useState(false);

  // Fetch all categories for better matching
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(),
  });

  // Parse natural language query
  const parseQuery = (userQuery: string, availableCategories: string[]): { filters: any; queryInfo: QueryResult } | null => {
    const lowerQuery = userQuery.toLowerCase();
    
    // Determine transaction type
    let type: "expense" | "income" | undefined = undefined;
    if (lowerQuery.includes("spent") || lowerQuery.includes("expense") || lowerQuery.includes("cost")) {
      type = "expense";
    } else if (lowerQuery.includes("earned") || lowerQuery.includes("income") || lowerQuery.includes("received")) {
      type = "income";
    }

    // Match against actual categories from database - prioritize exact matches
    let matchedCategory: string | undefined = undefined;
    const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 2);
    
    // First, try exact phrase matching (e.g., "poland rent" should match "Poland Rent")
    // Sort categories by length (longer first) to match more specific categories first
    const sortedCategories = [...availableCategories].sort((a, b) => b.length - a.length);
    
    for (const category of sortedCategories) {
      const lowerCategory = category.toLowerCase();
      // Check if query contains the full category name as a phrase
      if (lowerQuery.includes(lowerCategory)) {
        matchedCategory = category;
        break;
      }
    }
    
    // If no exact phrase match, try word-by-word matching (all category words must be in query)
    if (!matchedCategory) {
      for (const category of sortedCategories) {
        const lowerCategory = category.toLowerCase();
        const categoryWords = lowerCategory.split(/\s+/).filter(w => w.length > 2);
        // Check if all significant words from category are present in query
        if (categoryWords.length > 0) {
          const allWordsMatch = categoryWords.every(catWord => 
            queryWords.some(qWord => qWord === catWord || qWord.includes(catWord) || catWord.includes(qWord))
          );
          if (allWordsMatch) {
            matchedCategory = category;
            break;
          }
        }
      }
    }

    // Fallback to keyword matching if no exact category match
    if (!matchedCategory) {
      const categoryKeywords: { [key: string]: string[] } = {
        "rent": ["rent", "rental"],
        "groceries": ["grocery", "groceries", "food"],
        "transport": ["transport", "taxi", "uber", "bolt"],
        "subscriptions": ["subscription", "subscriptions"],
        "bills": ["bill", "bills", "utility"],
        "entertainment": ["entertainment", "movie", "cinema"],
        "health": ["health", "medical", "doctor"],
        "education": ["education", "school", "learning"],
      };

      for (const [category, keywords] of Object.entries(categoryKeywords)) {
        if (keywords.some(keyword => lowerQuery.includes(keyword))) {
          // Try to find a matching category in the database
          const found = availableCategories.find(cat => 
            cat.toLowerCase().includes(category) || category.includes(cat.toLowerCase())
          );
          if (found) {
            matchedCategory = found;
            break;
          }
        }
      }
    }

    // Extract time period
    let startDate: Date | undefined = undefined;
    let endDate: Date = new Date();
    let periodLabel = "";

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Check for specific time periods - check more specific ones first
    if (lowerQuery.includes("today")) {
      startDate = today;
      endDate = today;
      periodLabel = "Today";
    } else if (lowerQuery.includes("yesterday")) {
      const yesterday = subDays(today, 1);
      startDate = yesterday;
      endDate = yesterday;
      periodLabel = "Yesterday";
    } else if (lowerQuery.includes("this week")) {
      const dayOfWeek = now.getDay();
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      startDate = subDays(today, daysFromMonday);
      endDate = today;
      periodLabel = "This Week";
    } else if (lowerQuery.includes("last week")) {
      const dayOfWeek = now.getDay();
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const lastWeekEnd = subDays(today, daysFromMonday + 1);
      const lastWeekStart = subDays(lastWeekEnd, 6);
      startDate = lastWeekStart;
      endDate = lastWeekEnd;
      periodLabel = "Last Week";
    } else if (lowerQuery.includes("last 7 days") || lowerQuery.includes("past 7 days")) {
      startDate = subDays(today, 7);
      endDate = today;
      periodLabel = "Last 7 Days";
    } else if (lowerQuery.includes("last 30 days") || lowerQuery.includes("past 30 days")) {
      startDate = subDays(today, 30);
      endDate = today;
      periodLabel = "Last 30 Days";
    } else if (lowerQuery.includes("last 6 month") || lowerQuery.includes("last 6 months")) {
      startDate = subMonths(today, 6);
      endDate = today;
      periodLabel = "Last 6 Months";
    } else if (lowerQuery.includes("last 3 month") || lowerQuery.includes("last 3 months")) {
      startDate = subMonths(today, 3);
      endDate = today;
      periodLabel = "Last 3 Months";
    } else if (lowerQuery.includes("last month")) {
      const lastMonth = subMonths(now, 1);
      startDate = startOfMonth(lastMonth);
      endDate = endOfMonth(lastMonth);
      periodLabel = "Last Month";
    } else if (lowerQuery.includes("this month")) {
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
      periodLabel = "This Month";
    } else if (lowerQuery.includes("this year")) {
      startDate = startOfYear(now);
      endDate = endOfYear(now);
      periodLabel = "This Year";
    } else if (lowerQuery.includes("last year")) {
      const lastYear = now.getFullYear() - 1;
      startDate = new Date(lastYear, 0, 1);
      endDate = new Date(lastYear, 11, 31);
      periodLabel = "Last Year";
    } else {
      // Default to this month if no period specified
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
      periodLabel = "This Month";
    }

    const filters: any = {
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
    };

    if (type) {
      filters.type = type;
    }

    const queryInfo: QueryResult = {
      total: 0,
      count: 0,
      type: type || "both",
      category: matchedCategory,
      period: periodLabel,
      query: userQuery,
    };

    return { filters, queryInfo };
  };

  // Build filters from quick filter UI
  const buildQuickFilters = () => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date();
    let periodLabel = "";

    if (customStartDate && customEndDate) {
      startDate = customStartDate;
      endDate = customEndDate;
      periodLabel = `${format(customStartDate, "MMM dd")} - ${format(customEndDate, "MMM dd, yyyy")}`;
    } else {
      // Default to this month
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
      periodLabel = "This Month";
    }

    const filters: any = {
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
    };

    if (selectedType && selectedType !== "all") {
      filters.type = selectedType;
    }

    return { filters, periodLabel };
  };

  // Fetch transactions based on parsed query or quick filters
  const { data: transactions = [], isLoading, refetch } = useQuery({
    queryKey: ["transactions", parsedQuery ? parsedQuery.query : "quick", selectedCategory, selectedType, customStartDate, customEndDate],
    queryFn: () => {
      if (useQuickFilters) {
        const { filters } = buildQuickFilters();
        return getTransactions(filters);
      }
      if (!parsedQuery) return Promise.resolve([]);
      const categoryNames = categories.map(c => c.name);
      const parseResult = parseQuery(parsedQuery.query, categoryNames);
      if (!parseResult) return Promise.resolve([]);
      return getTransactions(parseResult.filters);
    },
    enabled: (!!parsedQuery || useQuickFilters) && categories.length > 0,
  });

  // Check if query might relate to India/currency entries
  const shouldFetchCurrencyEntries = useMemo(() => {
    if (!parsedQuery && !useQuickFilters) return false;
    
    const queryText = parsedQuery?.query.toLowerCase() || "";
    const categoryText = parsedQuery?.category?.toLowerCase() || selectedCategory?.toLowerCase() || "";
    
    // Keywords that might indicate India/currency entries
    const indiaKeywords = ["poland", "rent", "india", "pln", "inr", "currency", "polish"];
    
    // Check if query or category contains India-related keywords
    const hasIndiaKeyword = indiaKeywords.some(keyword => 
      queryText.includes(keyword) || categoryText.includes(keyword)
    );
    
    return hasIndiaKeyword;
  }, [parsedQuery, useQuickFilters, selectedCategory]);

  // Get date range for currency entries
  const currencyEntriesDateRange = useMemo(() => {
    if (useQuickFilters) {
      const { filters } = buildQuickFilters();
      return {
        startDate: filters.startDate,
        endDate: filters.endDate,
      };
    }
    if (!parsedQuery) return null;
    const categoryNames = categories.map(c => c.name);
    const parseResult = parseQuery(parsedQuery.query, categoryNames);
    if (!parseResult) return null;
    return {
      startDate: parseResult.filters.startDate,
      endDate: parseResult.filters.endDate,
    };
  }, [parsedQuery, useQuickFilters, selectedCategory, selectedType, customStartDate, customEndDate, categories]);

  // Fetch currency entries if query relates to India
  const { data: currencyEntries = [], isLoading: isLoadingCurrencyEntries } = useQuery({
    queryKey: ["currency-entries", currencyEntriesDateRange?.startDate, currencyEntriesDateRange?.endDate],
    queryFn: () => {
      if (!currencyEntriesDateRange) return Promise.resolve([]);
      return getCurrencyEntries({
        startDate: currencyEntriesDateRange.startDate,
        endDate: currencyEntriesDateRange.endDate,
      });
    },
    enabled: shouldFetchCurrencyEntries && !!currencyEntriesDateRange,
  });

  // Filter currency entries by description if query mentions specific terms
  const filteredCurrencyEntries = useMemo(() => {
    if (!parsedQuery || currencyEntries.length === 0) return currencyEntries;
    
    const queryText = parsedQuery.query.toLowerCase();
    const queryWords = queryText.split(/\s+/).filter(w => w.length > 2);
    
    // If query mentions specific description keywords, filter entries
    if (queryWords.length > 0) {
      return currencyEntries.filter(entry => {
        const entryDesc = entry.description.toLowerCase();
        // Check if any significant word from query appears in description
        return queryWords.some(word => entryDesc.includes(word));
      });
    }
    
    return currencyEntries;
  }, [currencyEntries, parsedQuery]);

  // Calculate result when transactions are loaded
  const result = useMemo(() => {
    if (!useQuickFilters && !parsedQuery) return null;

    let filteredTransactions: Transaction[] = transactions;
    let periodLabel = "";
    let type: "expense" | "income" | "both" = "both";

    if (useQuickFilters) {
      const { periodLabel: label } = buildQuickFilters();
      periodLabel = label;
      if (selectedType && selectedType !== "all") {
        type = selectedType;
      }
      
      // Filter by category if selected
      if (selectedCategory && selectedCategory !== "all") {
        filteredTransactions = transactions.filter(t => {
          const transactionCategory = t.category.toLowerCase().trim();
          const queryCategory = selectedCategory.toLowerCase().trim();
          return transactionCategory === queryCategory;
        });
      }
    } else if (parsedQuery) {
      periodLabel = parsedQuery.period;
      type = parsedQuery.type;
      
      // Filter by category if specified
      if (parsedQuery.category) {
        filteredTransactions = transactions.filter(t => {
          const transactionCategory = t.category.toLowerCase().trim();
          const queryCategory = parsedQuery.category!.toLowerCase().trim();
          return transactionCategory === queryCategory;
        });
      }
    }

    // Calculate total
    const total = filteredTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const count = filteredTransactions.length;

    return {
      total,
      count,
      type,
      category: useQuickFilters ? (selectedCategory !== "all" ? selectedCategory : undefined) : parsedQuery?.category,
      period: periodLabel,
      query: useQuickFilters ? "Quick Filter" : parsedQuery?.query || "",
      transactions: filteredTransactions,
    };
  }, [transactions, parsedQuery, useQuickFilters, selectedCategory, selectedType, customStartDate, customEndDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) {
      toast.error("Please enter a query");
      return;
    }

    setIsProcessing(true);
    setUseQuickFilters(false);
    const categoryNames = categories.map(c => c.name);
    const parseResult = parseQuery(query, categoryNames);
    
    if (!parseResult) {
      toast.error("Could not understand your query. Please try rephrasing.");
      setIsProcessing(false);
      return;
    }

    setParsedQuery(parseResult.queryInfo);
    setIsProcessing(false);
    setTimeout(() => refetch(), 100);
  };

  const handleQuickFilter = () => {
    setUseQuickFilters(true);
    setParsedQuery(null);
    setQuery("");
    setTimeout(() => refetch(), 100);
  };

  const clearQuickFilters = () => {
    setSelectedCategory("all");
    setSelectedType("all");
    setCustomStartDate(undefined);
    setCustomEndDate(undefined);
    setUseQuickFilters(false);
    setParsedQuery(null);
  };

  const clearSearch = () => {
    setQuery("");
    setParsedQuery(null);
    setUseQuickFilters(false);
    setIsProcessing(false);
  };

  const quickFilterQueries = [
    { label: "Total expenses this month", query: "Total expenses this month" },
    { label: "Total income this month", query: "Total income this month" },
    { label: "Expenses last month", query: "Total expenses last month" },
    { label: "Expenses last 3 months", query: "Total expenses in last 3 months" },
  ];

  const expenseCategories = useMemo(() => {
    return categories
      .filter(c => c.type === "expense" && c.name && typeof c.name === "string" && c.name.trim() !== "")
      .map(c => c.name.trim())
      .filter((name): name is string => name !== "" && name.length > 0); // Ensure no empty strings
  }, [categories]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="mx-auto max-w-4xl px-4 py-4 sm:py-6 lg:py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-card-foreground flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Summary
          </h1>
          <p className="text-sm text-muted-foreground">
            Ask questions about your finances or use quick filters to analyze your spending
          </p>
        </div>

        {/* Quick Filters */}
        <Card className="mb-6 rounded-2xl shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Quick Filters
            </CardTitle>
            <CardDescription>
              Filter by category, type, and date range
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Select value={selectedType || "all"} onValueChange={(value) => {
                  setSelectedType(value as "expense" | "income" | "all");
                  setUseQuickFilters(true);
                }}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Transaction Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="expense">Expenses</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedCategory || "all"} onValueChange={(value) => {
                  setSelectedCategory(value);
                  setUseQuickFilters(true);
                }}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Category (Optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {expenseCategories
                      .filter((cat) => cat && cat.trim() !== "")
                      .map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="rounded-xl w-full justify-start text-left font-normal">
                      <Calendar className="mr-2 h-4 w-4" />
                      {customStartDate && customEndDate ? (
                        `${format(customStartDate, "MMM dd")} - ${format(customEndDate, "MMM dd, yyyy")}`
                      ) : (
                        <span>Select Date Range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-xl" align="start">
                    <div className="p-4 space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Start Date</label>
                        <CalendarComponent
                          mode="single"
                          selected={customStartDate}
                          onSelect={(date) => {
                            setCustomStartDate(date);
                            setUseQuickFilters(true);
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
                            setUseQuickFilters(true);
                            if (date && customStartDate) {
                              setIsDatePickerOpen(false);
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
                            setCustomStartDate(startOfMonth(new Date()));
                            setCustomEndDate(endOfMonth(new Date()));
                            setUseQuickFilters(true);
                            setIsDatePickerOpen(false);
                          }}
                          className="flex-1"
                        >
                          This Month
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            const lastMonth = subMonths(new Date(), 1);
                            setCustomStartDate(startOfMonth(lastMonth));
                            setCustomEndDate(endOfMonth(lastMonth));
                            setUseQuickFilters(true);
                            setIsDatePickerOpen(false);
                          }}
                          className="flex-1"
                        >
                          Last Month
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleQuickFilter}
                  disabled={selectedType === "all" && selectedCategory === "all" && !customStartDate}
                  className="rounded-xl flex-1"
                >
                  Apply Filters
                </Button>
                {(selectedType !== "all" || selectedCategory !== "all" || customStartDate) && (
                  <Button
                    variant="outline"
                    onClick={clearQuickFilters}
                    className="rounded-xl"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Query Input */}
        <Card className="mb-8 rounded-2xl shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Ask a Question</CardTitle>
            <CardDescription>
              Examples: "How much I spent on Poland rent in last 6 months" or "Total expenses this month"
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Input
                    type="text"
                    placeholder="e.g., How much I spent on Poland rent in last 6 months?"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setUseQuickFilters(false);
                    }}
                    className="h-11 rounded-xl border-input bg-background shadow-sm pr-10"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-muted transition-colors"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
                <div className="flex gap-2 sm:flex-row">
                  <Button
                    type="submit"
                    disabled={isProcessing || !query.trim()}
                    className="h-11 rounded-xl bg-primary hover:bg-primary/90 text-white px-4 sm:px-6 flex-1 sm:flex-initial min-w-[100px] sm:min-w-[120px]"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Search className="h-4 w-4 sm:mr-2" />
                        <span>Search</span>
                      </>
                    )}
                  </Button>
                  {result && (
                    <Button
                      type="button"
                      onClick={clearSearch}
                      variant="outline"
                      className="h-11 rounded-xl px-4 sm:px-6 flex-shrink-0"
                    >
                      <X className="h-4 w-4 sm:mr-2" />
                      <span>Clear</span>
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <Card className="rounded-2xl shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Result</CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-2">
                <span>{result.period}</span>
                {result.category && (
                  <>
                    <span>•</span>
                    <Badge variant="secondary">{result.category}</Badge>
                  </>
                )}
                {result.type !== "both" && (
                  <>
                    <span>•</span>
                    <Badge variant={result.type === "expense" ? "destructive" : "default"}>
                      {result.type}
                    </Badge>
                  </>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-6 rounded-xl bg-muted/50">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
                      <p className="text-3xl font-bold text-foreground">
                        {formatCurrency(result.total)}
                      </p>
                    </div>
                    <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
                      {result.type === "expense" ? (
                        <TrendingDown className="h-8 w-8 text-red-600" />
                      ) : result.type === "income" ? (
                        <TrendingUp className="h-8 w-8 text-green-600" />
                      ) : (
                        <Sparkles className="h-8 w-8 text-primary" />
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-background border border-border">
                      <p className="text-xs text-muted-foreground mb-1">Transactions</p>
                      <p className="text-xl font-semibold text-foreground">{result.count}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-background border border-border">
                      <p className="text-xs text-muted-foreground mb-1">Average</p>
                      <p className="text-xl font-semibold text-foreground">
                        {result.count > 0 ? formatCurrency(result.total / result.count) : formatCurrency(0)}
                      </p>
                    </div>
                  </div>

                  {result.count === 0 && (
                    <div className="py-8 text-center text-muted-foreground">
                      No transactions found matching your criteria.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Transaction Details List */}
        {result && result.count > 0 && result.transactions && (
          <Card className="rounded-2xl shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Transaction Details</CardTitle>
              <CardDescription>
                {result.count} {result.count === 1 ? 'transaction' : 'transactions'} found
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {result.transactions.map((transaction) => {
                  const isIncome = transaction.type === "income";
                  
                  return (
                    <div
                      key={transaction.id}
                      className="group flex items-center justify-between rounded-xl border border-border bg-background p-4 transition-all hover:border-primary/20 hover:shadow-sm"
                    >
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        {/* Icon */}
                        <div
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold",
                            isIncome
                              ? "bg-green-100 text-green-600"
                              : "bg-red-100 text-red-600"
                          )}
                        >
                          {isIncome ? (
                            <ArrowUp className="h-5 w-5" />
                          ) : (
                            <ArrowDown className="h-5 w-5" />
                          )}
                        </div>

                        {/* Details */}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-foreground">
                            {capitalizeFirst(transaction.category)}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {transaction.description && (
                              <p className="text-sm text-muted-foreground truncate">
                                {transaction.description} •
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(transaction.date), "MMM dd, yyyy")}
                            </p>
                            {transaction.category && (
                              <>
                                <span className="text-muted-foreground">•</span>
                                <Badge variant="outline" className="text-xs">
                                  {transaction.category}
                                </Badge>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "text-base font-semibold whitespace-nowrap",
                            isIncome ? "text-green-600" : "text-red-600"
                          )}
                        >
                          {isIncome ? "+" : "-"}
                          {formatCurrency(Math.abs(Number(transaction.amount)))}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* India Currency Entries Details */}
        {shouldFetchCurrencyEntries && filteredCurrencyEntries.length > 0 && (
          <Card className="rounded-2xl shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                India Currency Entries
              </CardTitle>
              <CardDescription>
                {filteredCurrencyEntries.length} {filteredCurrencyEntries.length === 1 ? 'entry' : 'entries'} found matching your query
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingCurrencyEntries ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredCurrencyEntries.map((entry: CurrencyEntry) => (
                    <div
                      key={entry.id}
                      className="group flex items-center justify-between rounded-xl border border-border bg-background p-4 transition-all hover:border-primary/20 hover:shadow-sm"
                    >
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        {/* Icon */}
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                          <MapPin className="h-5 w-5" />
                        </div>

                        {/* Details */}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-foreground">
                            {capitalizeFirst(entry.description)}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(entry.date), "MMM dd, yyyy")}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Amounts */}
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground mb-1">PLN</p>
                          <p className="text-base font-semibold text-blue-600 whitespace-nowrap">
                            {formatPLN(entry.pln_amount)} PLN
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground mb-1">INR</p>
                          <p className="text-base font-semibold text-orange-600 whitespace-nowrap">
                            {formatINR(entry.inr_amount)} INR
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Summary */}
                  {filteredCurrencyEntries.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                          <p className="text-xs text-blue-600 mb-1">Total PLN</p>
                          <p className="text-lg font-semibold text-blue-700">
                            {formatPLN(filteredCurrencyEntries.reduce((sum, e) => sum + parseFloat(e.pln_amount.toString()), 0))} PLN
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-orange-50 border border-orange-200">
                          <p className="text-xs text-orange-600 mb-1">Total INR</p>
                          <p className="text-lg font-semibold text-orange-700">
                            {formatINR(filteredCurrencyEntries.reduce((sum, e) => sum + parseFloat(e.inr_amount.toString()), 0))} INR
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Example Queries */}
        {!result && (
          <Card className="rounded-2xl shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Example Queries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {quickFilterQueries.map((item, index) => (
                  <div 
                    key={index}
                    className="p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => {
                      setQuery(item.query);
                      setUseQuickFilters(false);
                    }}
                  >
                    <p className="text-sm font-medium">{item.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
