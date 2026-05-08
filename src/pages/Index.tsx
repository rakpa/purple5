import { Navigation } from "@/components/Navigation";
import { AddExpenseForm } from "@/components/AddExpenseForm";
import { TransactionList } from "@/components/TransactionList";

const Index = () => {
  return (
    <div className="min-h-screen bg-background w-full overflow-x-hidden">
      <Navigation />
      
      <main className="mx-auto max-w-7xl w-full px-3 sm:px-4 py-4 sm:py-6 lg:py-8 sm:px-6 lg:px-8 box-border">
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[380px_1fr] w-full">
          {/* Left Panel - Add Expense Form */}
          <div className="lg:sticky lg:top-24 lg:self-start order-1 w-full max-w-full overflow-hidden box-border">
            <AddExpenseForm />
          </div>
          
          {/* Right Panel - Transaction List */}
          <div className="order-2 w-full max-w-full overflow-hidden box-border">
            <TransactionList />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
