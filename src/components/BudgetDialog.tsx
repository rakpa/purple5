import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { upsertBudget } from "@/lib/budgets";
import type { Category } from "@/types/category";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { capitalizeFirst } from "@/lib/utils";

interface BudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenseCategories: Category[];
  month: number;
  year: number;
  preselectedCategory?: string;
  existingAmount?: number;
}

export function BudgetDialog({
  open,
  onOpenChange,
  expenseCategories,
  month,
  year,
  preselectedCategory,
  existingAmount,
}: BudgetDialogProps) {
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      setCategory(preselectedCategory || "");
      setAmount(existingAmount ? String(existingAmount) : "");
    }
  }, [open, preselectedCategory, existingAmount]);

  const saveMutation = useMutation({
    mutationFn: upsertBudget,
    onSuccess: () => {
      toast.success("Budget saved successfully!");
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      onOpenChange(false);
      setCategory("");
      setAmount("");
    },
    onError: (error: Error) => {
      toast.error(`Failed to save budget: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!category) {
      toast.error("Please select a category");
      return;
    }
    if (!parsed || parsed <= 0) {
      toast.error("Please enter a valid budget amount");
      return;
    }
    saveMutation.mutate({
      category,
      amount: parsed,
      month,
      year,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{existingAmount ? "Edit Budget" : "New Budget"}</DialogTitle>
          <DialogDescription>
            Set a monthly spending limit for a category. Spent amounts sync from your expense transactions.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="budget-category">Category</Label>
            <Select value={category} onValueChange={setCategory} disabled={!!preselectedCategory}>
              <SelectTrigger id="budget-category" className="rounded-xl">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {expenseCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>
                    {capitalizeFirst(cat.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="budget-amount">Monthly budget (PLN)</Label>
            <Input
              id="budget-amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="rounded-xl" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save Budget"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
