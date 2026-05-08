import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { updateTransaction } from "@/lib/transactions";
import { getCategories } from "@/lib/categories";
import { toast } from "sonner";
import type { Transaction, TransactionType, TransactionInsert } from "@/types/transaction";
import { CategoryIcon } from "@/components/CategoryIcon";

interface EditTransactionDialogProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTransactionDialog({
  transaction,
  open,
  onOpenChange,
}: EditTransactionDialogProps) {
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");

  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", type],
    queryFn: () => getCategories(type),
  });

  // Populate form when transaction changes
  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setAmount(transaction.amount.toString());
      setDate(transaction.date);
      setDescription(transaction.description || "");
      setCategory(transaction.category);
    }
  }, [transaction]);

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TransactionInsert> }) =>
      updateTransaction(id, data),
    onSuccess: () => {
      toast.success(
        type === "expense"
          ? "Expense updated successfully!"
          : "Income updated successfully!"
      );
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update ${type}: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!transaction) return;

    if (!category) {
      toast.error("Please select a category");
      return;
    }

    mutation.mutate({
      id: transaction.id,
      data: {
        type,
        amount: parseFloat(amount),
        date,
        description: description || null,
        category,
      },
    });
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
          <DialogDescription>
            Update your financial transaction details
          </DialogDescription>
        </DialogHeader>

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
            <Label htmlFor="edit-amount">Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground pointer-events-none">
                PLN
              </span>
              <Input
                id="edit-amount"
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
            <Label htmlFor="edit-date">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  type="button"
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
            <Label htmlFor="edit-category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-11 rounded-xl shadow-sm">
                <SelectValue placeholder="Select category" />
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
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
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
              ? "Updating..."
              : "Update Transaction"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
