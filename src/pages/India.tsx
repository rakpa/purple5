import { useState, useMemo, useEffect } from "react";
import { TrendingUp, TrendingDown, ArrowUp, ArrowDown, MapPin, Calendar, Edit2, Trash2, Filter } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCurrencyEntries, createCurrencyEntry, updateCurrencyEntry, deleteCurrencyEntry } from "@/lib/currency-entries";
import { getCategories } from "@/lib/categories";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from "recharts";
import { cn, capitalizeFirst } from "@/lib/utils";
import { formatPLN, formatINR } from "@/lib/currency-format";
import { toast } from "sonner";
import type { CurrencyEntry } from "@/types/currency-entry";
import { CategoryIcon } from "@/components/CategoryIcon";

type DateFilterType = "this-month" | "last-month" | "this-year" | "custom";

export default function India() {
  const [dateFilter, setDateFilter] = useState<DateFilterType>("this-year");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);
  const [isCustomDateOpen, setIsCustomDateOpen] = useState(false);
  
  // Form state
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formPlnAmount, setFormPlnAmount] = useState("");
  const [formInrAmount, setFormInrAmount] = useState("");
  const [editingEntry, setEditingEntry] = useState<CurrencyEntry | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState("pln");
  const [entriesTableView, setEntriesTableView] = useState<"entries" | "category-wise">("entries");
  const [draftTableView, setDraftTableView] = useState<"entries" | "category-wise">("entries");
  const [tableCategoryFilter, setTableCategoryFilter] = useState<string>("all");
  const [draftTableCategoryFilter, setDraftTableCategoryFilter] = useState<string>("all");
  const [tableStartDate, setTableStartDate] = useState<Date | undefined>(undefined);
  const [tableEndDate, setTableEndDate] = useState<Date | undefined>(undefined);
  const [draftTableStartDate, setDraftTableStartDate] = useState<Date | undefined>(undefined);
  const [draftTableEndDate, setDraftTableEndDate] = useState<Date | undefined>(undefined);
  const [isTableDatePickerOpen, setIsTableDatePickerOpen] = useState(false);
  
  const queryClient = useQueryClient();

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(),
  });

  // Open popover when custom date filter is selected (only if dates are not set)
  useEffect(() => {
    if (dateFilter === "custom" && !isCustomDateOpen && (!customStartDate || !customEndDate)) {
      // Small delay to ensure dropdown closes first
      const timer = setTimeout(() => {
        setIsCustomDateOpen(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [dateFilter]);

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

  // Fetch currency entries
  const { data: currencyEntries = [], isLoading: isLoadingEntries } = useQuery({
    queryKey: ["currency-entries", { startDate: dateRange.start, endDate: dateRange.end }],
    queryFn: () => getCurrencyEntries({ startDate: dateRange.start, endDate: dateRange.end }),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createCurrencyEntry,
    onSuccess: (data, variables) => {
      toast.success("Currency entry added successfully!");
      
      // Check if the added entry's date is outside the current filter range
      const entryDate = new Date(variables.date + 'T00:00:00'); // Add time to avoid timezone issues
      const currentStart = new Date(dateRange.start + 'T00:00:00');
      const currentEnd = new Date(dateRange.end + 'T23:59:59');
      
      // If entry date is outside current filter range, adjust the filter
      if (entryDate < currentStart || entryDate > currentEnd) {
        const entryMonth = entryDate.getMonth();
        const entryYear = entryDate.getFullYear();
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        // If entry is from last month, switch to "last-month" filter
        if (entryYear === currentYear && entryMonth === currentMonth - 1) {
          setDateFilter("last-month");
        } 
        // If entry is from this year but different month, switch to "this-year" filter
        else if (entryYear === currentYear) {
          setDateFilter("this-year");
        }
        // Otherwise, set custom date range to include the entry's month
        else {
          setDateFilter("custom");
          const entryStartOfMonth = new Date(entryYear, entryMonth, 1);
          const entryEndOfMonth = new Date(entryYear, entryMonth + 1, 0);
          setCustomStartDate(entryStartOfMonth);
          setCustomEndDate(entryEndOfMonth);
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["currency-entries"] });
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Failed to add entry: ${error.message}`);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { date: string; description: string; category?: string; pln_amount: number; inr_amount: number } }) =>
      updateCurrencyEntry(id, data),
    onSuccess: () => {
      toast.success("Currency entry updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["currency-entries"] });
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Failed to update entry: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteCurrencyEntry,
    onSuccess: () => {
      toast.success("Currency entry deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["currency-entries"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete entry: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormDescription("");
    setFormCategory("");
    setFormPlnAmount("");
    setFormInrAmount("");
    setEditingEntry(null);
    setIsEditMode(false);
  };

  const handleEdit = (entry: CurrencyEntry) => {
    setEditingEntry(entry);
    setFormDate(entry.date);
    setFormDescription(entry.description);
    setFormCategory(entry.category || "");
    setFormPlnAmount(entry.pln_amount.toString());
    setFormInrAmount(entry.inr_amount.toString());
    setIsEditMode(true);
  };

  const toggleEditMode = () => {
    if (isEditMode) {
      resetForm();
    } else {
      setIsEditMode(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formDescription || !formPlnAmount || !formInrAmount) {
      toast.error("Please fill in all fields");
      return;
    }

    const plnAmount = parseFloat(formPlnAmount);
    const inrAmount = parseFloat(formInrAmount);

    if (isNaN(plnAmount) || isNaN(inrAmount)) {
      toast.error("Please enter valid amounts");
      return;
    }

    if (editingEntry) {
      updateMutation.mutate({
        id: editingEntry.id,
        data: {
          date: formDate,
          description: formDescription,
          category: formCategory || undefined,
          pln_amount: plnAmount,
          inr_amount: inrAmount,
        },
      });
    } else {
      createMutation.mutate({
        date: formDate,
        description: formDescription,
        category: formCategory || undefined,
        pln_amount: plnAmount,
        inr_amount: inrAmount,
      });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this entry?")) {
      deleteMutation.mutate(id);
    }
  };

  // Calculate metrics from currency entries
  const metrics = useMemo(() => {
    const totalPln = currencyEntries.reduce((sum, entry) => sum + parseFloat(entry.pln_amount.toString()), 0);
    const totalInr = currencyEntries.reduce((sum, entry) => sum + parseFloat(entry.inr_amount.toString()), 0);
    
    return { 
      totalPln, 
      totalInr, 
      count: currencyEntries.length 
    };
  }, [currencyEntries]);

  // Prepare chart data for PLN breakdown by category
  const plnBreakdown = useMemo(() => {
    const categoryMap = new Map<string, number>();

    currencyEntries.forEach((entry) => {
      const category = entry.category || "Uncategorized";
      const current = categoryMap.get(category) || 0;
      categoryMap.set(category, current + parseFloat(entry.pln_amount.toString()));
    });

    return Array.from(categoryMap.entries())
      .map(([category, amount]) => ({
        category,
        amount: Number(amount.toFixed(2)),
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [currencyEntries]);

  // Prepare chart data for INR breakdown by category
  const inrBreakdown = useMemo(() => {
    const categoryMap = new Map<string, number>();

    currencyEntries.forEach((entry) => {
      const category = entry.category || "Uncategorized";
      const current = categoryMap.get(category) || 0;
      categoryMap.set(category, current + parseFloat(entry.inr_amount.toString()));
    });

    return Array.from(categoryMap.entries())
      .map(([category, amount]) => ({
        category,
        amount: Number(amount.toFixed(2)),
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [currencyEntries]);

  const filteredTableEntries = useMemo(() => {
    return currencyEntries.filter((entry) => {
      const categoryMatch =
        tableCategoryFilter === "all" ||
        (entry.category || "Uncategorized").trim().toLowerCase() === tableCategoryFilter.trim().toLowerCase();

      const entryDate = new Date(`${entry.date}T00:00:00`);
      const startMatch = !tableStartDate || entryDate >= new Date(new Date(tableStartDate).setHours(0, 0, 0, 0));
      const endMatch = !tableEndDate || entryDate <= new Date(new Date(tableEndDate).setHours(23, 59, 59, 999));

      return categoryMatch && startMatch && endMatch;
    });
  }, [currencyEntries, tableCategoryFilter, tableStartDate, tableEndDate]);

  const handleApplyTableFilters = () => {
    if (draftTableStartDate && draftTableEndDate && draftTableEndDate < draftTableStartDate) {
      toast.error("End date must be after start date");
      return;
    }
    setEntriesTableView(draftTableView);
    setTableCategoryFilter(draftTableCategoryFilter);
    setTableStartDate(draftTableStartDate);
    setTableEndDate(draftTableEndDate);
  };

  const handleClearTableFilters = () => {
    setDraftTableView("entries");
    setDraftTableCategoryFilter("all");
    setDraftTableStartDate(undefined);
    setDraftTableEndDate(undefined);
    setEntriesTableView("entries");
    setTableCategoryFilter("all");
    setTableStartDate(undefined);
    setTableEndDate(undefined);
  };

  // Detailed category-wise summary for quick analysis
  const categoryWiseDetails = useMemo(() => {
    const categoryMap = new Map<
      string,
      { count: number; totalPln: number; totalInr: number }
    >();

    filteredTableEntries.forEach((entry) => {
      const category = entry.category || "Uncategorized";
      const current = categoryMap.get(category) || {
        count: 0,
        totalPln: 0,
        totalInr: 0,
      };

      categoryMap.set(category, {
        count: current.count + 1,
        totalPln: current.totalPln + parseFloat(entry.pln_amount.toString()),
        totalInr: current.totalInr + parseFloat(entry.inr_amount.toString()),
      });
    });

    return Array.from(categoryMap.entries())
      .map(([category, details]) => ({
        category,
        count: details.count,
        totalPln: Number(details.totalPln.toFixed(2)),
        totalInr: Number(details.totalInr.toFixed(2)),
      }))
      .sort((a, b) => b.totalPln - a.totalPln);
  }, [filteredTableEntries]);


  const getCategoryColor = (category: string) => {
    const lower = category.toLowerCase();
    if (lower.includes("rent")) return "#14b8a6";
    if (lower.includes("food")) return "#3b82f6";
    if (lower.includes("transport")) return "#ef4444";
    if (lower.includes("utilities")) return "#f59e0b";
    return "#8b5cf6";
  };

  const chartConfig = useMemo(() => {
    const config: Record<string, { label: string; color?: string }> = {
      amount: {
        label: "Amount",
      },
    };

    plnBreakdown.forEach((item) => {
      config[item.category] = {
        label: item.category,
        color: getCategoryColor(item.category),
      };
    });

    inrBreakdown.forEach((item) => {
      config[item.category] = {
        label: item.category,
        color: getCategoryColor(item.category),
      };
    });

    return config;
  }, [plnBreakdown, inrBreakdown]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const day = date.getDate();
      const month = format(date, "MMMM");
      const year = date.getFullYear();
      
      // Add ordinal suffix (st, nd, rd, th)
      const getOrdinalSuffix = (day: number) => {
        if (day > 3 && day < 21) return "th";
        switch (day % 10) {
          case 1: return "st";
          case 2: return "nd";
          case 3: return "rd";
          default: return "th";
        }
      };
      
      return `${day}${getOrdinalSuffix(day)} ${month}, ${year}`;
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-card-foreground flex items-center gap-2 font-sans">
              <MapPin className="h-5 w-5 text-primary" />
              India Currency Entries
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Track your PLN and INR currency conversions
            </p>
          </div>
          <div className="flex items-center gap-2">
            {dateFilter === "custom" ? (
              <Popover open={isCustomDateOpen} onOpenChange={(open) => {
                setIsCustomDateOpen(open);
                // If closing and no dates selected, reset to default filter
                if (!open && !customStartDate && !customEndDate) {
                  setDateFilter("this-year");
                }
              }}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="rounded-xl gap-2">
                    {dateRange.label}
                    <Calendar className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent 
                  className="w-auto p-0 rounded-xl" 
                  align="end"
                >
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
                            return;
                          }
                          setCustomEndDate(date);
                          // Close popover after both dates are selected
                          if (date && customStartDate) {
                            setTimeout(() => {
                              setIsCustomDateOpen(false);
                            }, 100);
                          }
                        }}
                        disabled={(date) => customStartDate ? date < customStartDate : false}
                        className="rounded-md border"
                      />
                    </div>
                    {customStartDate && customEndDate && (
                      <Button
                        onClick={() => setIsCustomDateOpen(false)}
                        className="w-full"
                      >
                        Apply Filter
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="rounded-xl gap-2">
                    {dateRange.label}
                    <Calendar className="h-4 w-4" />
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
        <div className="mb-8 grid gap-6 md:grid-cols-2">
          {/* Total PLN */}
          <Card className="rounded-2xl shadow-card">
            <CardHeader className="pb-3">
              <CardDescription>Total PLN</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xl font-semibold text-foreground">
                    {formatPLN(metrics.totalPln)} PLN
                  </p>
                  <p className="mt-2 flex items-center gap-1 text-sm font-medium text-blue-600">
                    <ArrowUp className="h-4 w-4" />
                    Polish Zloty
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
                  <ArrowUp className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total INR */}
          <Card className="rounded-2xl shadow-card">
            <CardHeader className="pb-3">
              <CardDescription>Total INR</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xl font-semibold text-foreground">
                    {formatINR(metrics.totalInr)} INR
                  </p>
                  <p className="mt-2 flex items-center gap-1 text-sm font-medium text-orange-600">
                    <ArrowDown className="h-4 w-4" />
                    Indian Rupee
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100">
                  <ArrowDown className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Financial Overview Dashboard */}
        <Card className="mb-8 rounded-2xl shadow-card">
          <CardHeader>
            <CardTitle>Financial Overview</CardTitle>
            <CardDescription>Track your PLN and INR amounts by category</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="flex rounded-xl bg-muted p-1">
                <TabsTrigger 
                  value="pln" 
                  className={cn(
                    "flex-1 rounded-lg py-2.5 text-sm font-medium transition-all",
                    "data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm",
                    "data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground"
                  )}
                >
                  PLN Breakdown
                </TabsTrigger>
                <TabsTrigger 
                  value="inr" 
                  className={cn(
                    "flex-1 rounded-lg py-2.5 text-sm font-medium transition-all",
                    "data-[state=active]:bg-orange-600 data-[state=active]:text-white data-[state=active]:shadow-sm",
                    "data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground"
                  )}
                >
                  INR Breakdown
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pln" className="mt-6">
                {plnBreakdown.length > 0 ? (
                  <>
                    <div className="mb-4 flex flex-wrap gap-4">
                      {plnBreakdown.map((item) => (
                        <div key={item.category} className="flex items-center gap-2">
                          {(() => {
                            const category = categories.find(
                              (cat) => cat.name === item.category
                            );

                            return category ? (
                              <CategoryIcon
                                iconName={category.icon}
                                size={12}
                                className="p-0 shadow-none"
                              />
                            ) : (
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: getCategoryColor(item.category) }}
                              />
                            );
                          })()}
                          <span className="text-sm text-muted-foreground">
                            {capitalizeFirst(item.category)}: {formatPLN(item.amount)} PLN
                          </span>
                        </div>
                      ))}
                    </div>
                    <ChartContainer config={chartConfig} className="h-[300px]">
                      <ResponsiveContainer>
                        <BarChart data={plnBreakdown.map(item => ({ ...item, category: capitalizeFirst(item.category) }))}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="category" />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar 
                            dataKey="amount" 
                            radius={[8, 8, 0, 0]}
                          >
                            {plnBreakdown.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={getCategoryColor(entry.category)} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </>
                ) : (
                  <div className="py-12 text-center text-muted-foreground">
                    No PLN data available
                  </div>
                )}
              </TabsContent>

              <TabsContent value="inr" className="mt-6">
                {inrBreakdown.length > 0 ? (
                  <>
                    <div className="mb-4 flex flex-wrap gap-4">
                      {inrBreakdown.map((item) => (
                        <div key={item.category} className="flex items-center gap-2">
                          {(() => {
                            const category = categories.find(
                              (cat) => cat.name === item.category
                            );

                            return category ? (
                              <CategoryIcon
                                iconName={category.icon}
                                size={12}
                                className="p-0 shadow-none"
                              />
                            ) : (
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: getCategoryColor(item.category) }}
                              />
                            );
                          })()}
                          <span className="text-sm text-muted-foreground">
                            {capitalizeFirst(item.category)}: {formatINR(item.amount)} INR
                          </span>
                        </div>
                      ))}
                    </div>
                    <ChartContainer config={chartConfig} className="h-[300px]">
                      <ResponsiveContainer>
                        <BarChart data={inrBreakdown.map(item => ({ ...item, category: capitalizeFirst(item.category) }))}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="category" />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar 
                            dataKey="amount" 
                            radius={[8, 8, 0, 0]}
                          >
                            {inrBreakdown.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={getCategoryColor(entry.category)} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </>
                ) : (
                  <div className="py-12 text-center text-muted-foreground">
                    No INR data available
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Currency Entry Form */}
        <Card className="mb-8 rounded-2xl shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold font-sans">Add Currency Entry</CardTitle>
            <CardDescription className="font-sans">Enter PLN and INR amounts for India transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 mobile-form-layout">
                {/* Date Picker */}
                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <div className="relative flex-1">
                      <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      <Input
                        type="text"
                        placeholder="Pick a date"
                        value={format(new Date(formDate), "MMM dd, yyyy")}
                        readOnly
                        onClick={() => setIsDatePickerOpen(true)}
                        className="h-11 rounded-xl border-input bg-background pl-10 shadow-sm cursor-pointer"
                      />
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-xl" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={new Date(formDate)}
                      onSelect={(date) => {
                        if (date) {
                          setFormDate(format(date, "yyyy-MM-dd"));
                          setIsDatePickerOpen(false);
                        }
                      }}
                      className="rounded-md border"
                    />
                  </PopoverContent>
                </Popover>

                {/* Description */}
                <Input
                  type="text"
                  placeholder="Description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="flex-1 h-11 rounded-xl border-input bg-background shadow-sm"
                  required
                />

                {/* Category */}
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger className="flex-1 h-11 rounded-xl border-input bg-background shadow-sm">
                    <SelectValue placeholder="Category (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>
                        <div className="flex items-center gap-2">
                          <CategoryIcon iconName={cat.icon} size={18} />
                          {cat.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* PLN Amount */}
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Amount (PLN)"
                  value={formPlnAmount}
                  onChange={(e) => setFormPlnAmount(e.target.value)}
                  className="flex-1 h-11 rounded-xl border-input bg-background shadow-sm"
                  required
                />

                {/* INR Amount */}
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Amount (INR)"
                  value={formInrAmount}
                  onChange={(e) => setFormInrAmount(e.target.value)}
                  className="flex-1 h-11 rounded-xl border-input bg-background shadow-sm"
                  required
                />

                {/* Add Button */}
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-6 whitespace-nowrap"
                >
                  {editingEntry ? "UPDATE" : "ADD"}
                </Button>

                {/* Edit Mode Toggle Button */}
                <Button
                  type="button"
                  onClick={toggleEditMode}
                  className={cn(
                    "h-11 rounded-xl text-white border-0 px-6 whitespace-nowrap",
                    isEditMode
                      ? "bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                      : "bg-gray-600 hover:bg-gray-700"
                  )}
                >
                  {isEditMode ? "CANCEL EDIT" : "EDIT"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Currency Entries Table */}
        <Card className="mb-8 rounded-2xl shadow-card overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg font-semibold font-sans">Currency Entries</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="border-b border-border p-4 sm:p-6">
              <div className="mb-2 flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <h3 className="text-base font-semibold">Quick Filters</h3>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">
                Filter by category and date range
              </p>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:max-w-3xl">
                  <Select value={draftTableCategoryFilter} onValueChange={setDraftTableCategoryFilter}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="Uncategorized">Uncategorized</SelectItem>
                    </SelectContent>
                  </Select>

                  <Popover open={isTableDatePickerOpen} onOpenChange={setIsTableDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start rounded-xl text-left font-normal">
                        <Calendar className="mr-2 h-4 w-4" />
                        {draftTableStartDate && draftTableEndDate ? (
                          `${format(draftTableStartDate, "MMM dd")} - ${format(draftTableEndDate, "MMM dd, yyyy")}`
                        ) : (
                          <span>Select Date Range</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto rounded-xl p-0" align="start">
                      <div className="space-y-4 p-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Start Date</label>
                          <CalendarComponent
                            mode="single"
                            selected={draftTableStartDate}
                            onSelect={(date) => {
                              setDraftTableStartDate(date);
                              if (date && draftTableEndDate && date > draftTableEndDate) {
                                setDraftTableEndDate(undefined);
                              }
                            }}
                            className="rounded-md border"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">End Date</label>
                          <CalendarComponent
                            mode="single"
                            selected={draftTableEndDate}
                            onSelect={setDraftTableEndDate}
                            disabled={(date) => (draftTableStartDate ? date < draftTableStartDate : false)}
                            className="rounded-md border"
                          />
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={handleApplyTableFilters} className="rounded-xl px-5">
                    Apply Filters
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClearTableFilters}
                    className="rounded-xl px-5"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </div>
            {isLoadingEntries ? (
              <div className="py-12 text-center text-muted-foreground">Loading entries...</div>
            ) : filteredTableEntries.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  {/* Table Header */}
                  <thead>
                    <tr className="bg-black text-white">
                      <th className="px-3 sm:px-5 py-3 sm:py-4 text-left text-xs font-semibold font-sans border-r border-gray-700 min-w-[120px] sm:w-48">Date</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold font-sans border-r border-gray-700 min-w-[100px]">Description</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold font-sans border-r border-gray-700 min-w-[100px]">Category</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-right text-xs font-semibold font-sans border-r border-gray-700 min-w-[100px] sm:w-40">Amount (PLN)</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-right text-xs font-semibold font-sans border-r border-gray-700 min-w-[100px] sm:w-40">Amount (INR)</th>
                      {isEditMode && entriesTableView === "entries" && (
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-center text-xs font-semibold font-sans min-w-[80px] sm:w-24">Actions</th>
                      )}
                    </tr>
                  </thead>
                  {/* Table Body */}
                  <tbody>
                    {entriesTableView === "entries"
                      ? filteredTableEntries.map((entry, index) => (
                          <tr
                            key={entry.id}
                            className={cn(
                              "group border-b border-gray-300 transition-colors hover:bg-muted/50",
                              index % 2 === 0 ? "bg-background" : "bg-muted/30"
                            )}
                          >
                            <td className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm text-foreground font-sans border-r border-gray-300 min-w-[120px] sm:w-48 whitespace-nowrap">
                              {formatDate(entry.date)}
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-foreground font-sans border-r border-gray-300 min-w-[100px]">
                              <div className="max-w-[120px] sm:max-w-none break-words overflow-hidden">
                                {entry.description}
                              </div>
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-foreground font-sans border-r border-gray-300 min-w-[100px]">
                              {entry.category ? (
                                <div className="flex items-center gap-2">
                                  {(() => {
                                    const category = categories.find(cat => cat.name === entry.category);
                                    return category ? (
                                      <>
                                        <CategoryIcon iconName={category.icon} size={16} />
                                        <span>{capitalizeFirst(entry.category)}</span>
                                      </>
                                    ) : (
                                      <span>{capitalizeFirst(entry.category)}</span>
                                    );
                                  })()}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-foreground text-right font-sans tabular-nums border-r border-gray-300 min-w-[100px] sm:w-40 whitespace-nowrap">
                              {formatPLN(entry.pln_amount)} PLN
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-foreground text-right font-sans tabular-nums border-r border-gray-300 min-w-[100px] sm:w-40 whitespace-nowrap">
                              {formatINR(entry.inr_amount)} INR
                            </td>
                            {isEditMode && (
                              <td className="px-3 sm:px-6 py-3 sm:py-4 text-center min-w-[80px] sm:w-24">
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-foreground"
                                    onClick={() => handleEdit(entry)}
                                  >
                                    <Edit2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-red-600"
                                    onClick={() => handleDelete(entry.id)}
                                    disabled={deleteMutation.isPending}
                                  >
                                    <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                  </Button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))
                      : categoryWiseDetails.map((item, index) => (
                          <tr
                            key={item.category}
                            className={cn(
                              "border-b border-gray-300 transition-colors hover:bg-muted/50",
                              index % 2 === 0 ? "bg-background" : "bg-muted/30"
                            )}
                          >
                            <td className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm text-foreground font-sans border-r border-gray-300 min-w-[120px] sm:w-48 whitespace-nowrap">
                              -
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-foreground font-sans border-r border-gray-300 min-w-[100px]">
                              <span className="font-medium">{item.count} entries</span>
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-foreground font-sans border-r border-gray-300 min-w-[100px]">
                              <div className="flex items-center gap-2">
                                {(() => {
                                  const category = categories.find((cat) => cat.name === item.category);
                                  return category ? (
                                    <CategoryIcon iconName={category.icon} size={16} />
                                  ) : (
                                    <div
                                      className="h-3 w-3 rounded-full"
                                      style={{ backgroundColor: getCategoryColor(item.category) }}
                                    />
                                  );
                                })()}
                                <span>{capitalizeFirst(item.category)}</span>
                              </div>
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-foreground text-right font-sans tabular-nums border-r border-gray-300 min-w-[100px] sm:w-40 whitespace-nowrap">
                              {formatPLN(item.totalPln)} PLN
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-foreground text-right font-sans tabular-nums border-r border-gray-300 min-w-[100px] sm:w-40 whitespace-nowrap">
                              {formatINR(item.totalInr)} INR
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                No currency entries found
              </div>
            )}
          </CardContent>
        </Card>

      </main>
    </div>
  );
}

