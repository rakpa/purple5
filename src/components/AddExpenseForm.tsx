import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { createTransaction } from "@/lib/transactions";
import { getCategories } from "@/lib/categories";
import { toast } from "sonner";
import type { TransactionType } from "@/types/transaction";
import { CategoryIcon } from "@/components/CategoryIcon";

export function AddExpenseForm() {
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", type],
    queryFn: () => getCategories(type),
  });

  const mutation = useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      toast.success(
        type === "expense"
          ? "Expense added successfully!"
          : "Income added successfully!"
      );
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      setAmount("");
      setDescription("");
      setCategory("");
      setCategoryOpen(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to add ${type}: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!category) {
      toast.error("Please select a category");
      return;
    }

    mutation.mutate({
      type,
      amount: parseFloat(amount),
      date,
      description: description || null,
      category,
    });
  };

  return (
    <Card className="rounded-2xl shadow-card">
      <CardHeader>
        <CardTitle>Add Expense / Income</CardTitle>
        <CardDescription>
          Record your financial transactions
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Type Toggle */}
          <div className="flex rounded-xl bg-muted p-1">
            <button
              type="button"
              onClick={() => setType("expense")}
              className={cn(
                "flex-1 rounded-lg py-2.5 text-sm font-medium transition-all",
                type === "expense"
                  ? "bg-red-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Expense
            </button>

            <button
              type="button"
              onClick={() => setType("income")}
              className={cn(
                "flex-1 rounded-lg py-2.5 text-sm font-medium transition-all",
                type === "income"
                  ? "bg-green-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Income
            </button>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground pointer-events-none">
                PLN
              </span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-14 h-11 rounded-xl shadow-sm"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "h-11 w-full justify-start text-left font-normal rounded-xl shadow-sm",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(new Date(date), "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date ? new Date(date) : undefined}
                  onSelect={(day) => day && setDate(format(day, "yyyy-MM-dd"))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="category"
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={categoryOpen}
                  className="h-11 w-full justify-between rounded-xl shadow-sm"
                >
                  {category ? (
                    <span className="flex items-center gap-2 truncate">
                      {(() => {
                        const selectedCategory = categories.find((cat) => cat.name === category);
                        return selectedCategory ? (
                          <CategoryIcon iconName={selectedCategory.icon} size={18} />
                        ) : null;
                      })()}
                      <span className="truncate">{category}</span>
                    </span>
                  ) : (
                    "Select category"
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search category..." />
                  <CommandList>
                    <CommandEmpty>No category found.</CommandEmpty>
                    <CommandGroup>
                      {categories.map((cat) => (
                        <CommandItem
                          key={cat.id}
                          value={cat.name}
                          onSelect={() => {
                            setCategory(cat.name);
                            setCategoryOpen(false);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <CategoryIcon iconName={cat.icon} size={18} />
                            <span>{cat.name}</span>
                          </div>
                          <Check
                            className={cn(
                              "ml-auto h-4 w-4",
                              category === cat.name ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Add a note..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px] rounded-xl shadow-sm resize-none"
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            size="xl"
            className="w-full mt-6"
            disabled={mutation.isPending}
          >
            {mutation.isPending
              ? "Adding..."
              : type === "expense"
                ? "Add Expense"
                : "Add Income"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
