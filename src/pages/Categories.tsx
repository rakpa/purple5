import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCategories, createCategory, deleteCategory } from "@/lib/categories";
import { Navigation } from "@/components/Navigation";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { cn, capitalizeFirst } from "@/lib/utils";
import { Trash2, Edit2 } from "lucide-react";
import { CategoryIcon } from "@/components/CategoryIcon";

// Common icons for categories
const categoryIcons = [
  { name: "Utensils", icon: "UtensilsCrossed", label: "Food & Dining" },
  { name: "Car", icon: "Car", label: "Transportation" },
  { name: "Zap", icon: "Zap", label: "Utilities" },
  { name: "Film", icon: "Film", label: "Entertainment" },
  { name: "ShoppingBag", icon: "ShoppingBag", label: "Shopping" },
  { name: "Heart", icon: "Heart", label: "Health" },
  { name: "Briefcase", icon: "Briefcase", label: "Salary" },
  { name: "Code", icon: "Code", label: "Freelance" },
  { name: "TrendingUp", icon: "TrendingUp", label: "Investment" },
  { name: "CreditCard", icon: "CreditCard", label: "Credit Card" },
  { name: "Home", icon: "Home", label: "Home" },
  { name: "Coffee", icon: "Coffee", label: "Coffee" },
  { name: "Gamepad2", icon: "Gamepad2", label: "Gaming" },
  { name: "Book", icon: "Book", label: "Education" },
  { name: "Dumbbell", icon: "Dumbbell", label: "Fitness" },
  { name: "Plane", icon: "Plane", label: "Travel" },
  { name: "Gift", icon: "Gift", label: "Gifts" },
  { name: "PiggyBank", icon: "PiggyBank", label: "Savings" },
];

export default function Categories() {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(),
  });

  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      toast.success("Category created successfully!");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setName("");
      setIcon("");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create category: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      toast.success("Category deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete category: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !icon) {
      toast.error("Please fill in all fields");
      return;
    }

    createMutation.mutate({
      name: name.trim(),
      icon,
      type,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this category?")) {
      deleteMutation.mutate(id);
    }
  };


  const filteredCategories = categories.filter((cat) => cat.type === type);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="mx-auto max-w-7xl px-4 py-4 sm:py-6 lg:py-8 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[380px_1fr]">
          {/* Left Panel - Add Category Form */}
          <div className="lg:sticky lg:top-24 lg:self-start order-2 lg:order-1">
            <Card className="rounded-2xl shadow-card">
              <CardHeader>
                <CardTitle>Add Category</CardTitle>
                <CardDescription>Create a custom category with icon</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Type Toggle */}
                  <div className="flex rounded-xl bg-muted p-1">
                    <button
                      type="button"
                      onClick={() => setType("expense")}
                      className={cn(
                        "flex-1 rounded-lg py-2.5 text-sm font-medium transition-all duration-200",
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
                        "flex-1 rounded-lg py-2.5 text-sm font-medium transition-all duration-200",
                        type === "income"
                          ? "bg-green-600 text-white shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Income
                    </button>
                  </div>

                  {/* Category Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium text-foreground">
                      Category Name
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="e.g., Groceries"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-11 rounded-xl border-input bg-background shadow-sm transition-shadow focus:shadow-md"
                      required
                    />
                  </div>

                  {/* Icon Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="icon" className="text-sm font-medium text-foreground">
                      Icon
                    </Label>
                    <Select value={icon} onValueChange={setIcon} required>
                      <SelectTrigger className="h-11 rounded-xl border-input bg-background shadow-sm">
                        <SelectValue placeholder="Select an icon" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl bg-popover border-border shadow-elevated max-h-[300px]">
                        {categoryIcons.map((item) => (
                          <SelectItem key={item.icon} value={item.icon} className="rounded-lg">
                            <div className="flex items-center gap-2">
                              <CategoryIcon iconName={item.icon} size={18} />
                              <span>{item.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    size="xl"
                    className="w-full mt-6"
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? "Adding..." : "Add Category"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Category List */}
          <div className="order-1 lg:order-2">
            <Card className="rounded-2xl shadow-card">
              <CardHeader>
                <CardTitle>Categories</CardTitle>
                <CardDescription>Manage your custom categories</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Type Filter */}
                <div className="mb-6 flex rounded-xl bg-muted p-1">
                  <button
                    type="button"
                    onClick={() => setType("expense")}
                    className={cn(
                      "flex-1 rounded-lg py-2.5 text-sm font-medium transition-all duration-200",
                      type === "expense"
                        ? "bg-card text-destructive shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Expenses
                  </button>
                  <button
                    type="button"
                    onClick={() => setType("income")}
                    className={cn(
                      "flex-1 rounded-lg py-2.5 text-sm font-medium transition-all duration-200",
                      type === "income"
                        ? "bg-card text-success shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Income
                  </button>
                </div>

                {/* Category List */}
                {isLoading ? (
                  <div className="py-12 text-center text-muted-foreground">
                    Loading categories...
                  </div>
                ) : filteredCategories.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredCategories.map((category) => (
                      <div
                        key={category.id}
                        className="group flex items-center justify-between rounded-xl border border-border bg-background p-4 transition-all hover:border-primary/20 hover:shadow-sm"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <CategoryIcon iconName={category.icon} size={20} />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">
                              {category.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {capitalizeFirst(category.type)}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => toast.info("Edit functionality coming soon!")}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(category.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-muted-foreground">
                    No categories found. Create your first category!
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

