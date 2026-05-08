import { useState, useEffect } from "react";
import { Menu, X, LayoutDashboard, PlusCircle, BarChart3, Globe, Settings, LogOut, MapPin, Sparkles } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const navItems = [
  { name: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { name: "Add Expense/Income", icon: PlusCircle, href: "/" },
  { name: "AI Summary", icon: Sparkles, href: "/ai-summary" },
  { name: "Categories", icon: BarChart3, href: "/categories" },
  { name: "India", icon: MapPin, href: "/india" },
  { name: "Settings", icon: Settings, href: "/settings" },
];

export function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Get current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error(`Sign out failed: ${error.message}`);
      } else {
        toast.success("Signed out successfully");
        navigate("/login");
      }
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("An unexpected error occurred");
    }
  };

  const getUserInitials = () => {
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "U";
  };

  return (
    <nav className="bg-primary shadow-elevated sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-foreground/20 backdrop-blur-sm">
              <span className="text-lg font-bold text-primary-foreground">PLN</span>
            </div>
            <span className="text-xl font-semibold text-primary-foreground">ExpenseTrack</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href || (item.href === "/" && location.pathname === "/");
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="hidden lg:inline">{item.name}</span>
                </Link>
              );
            })}
            
            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-2 h-9 w-9 rounded-full border border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground text-xs font-semibold">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl">
                {user?.email && (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground border-b">
                    {user.email}
                  </div>
                )}
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="rounded-lg cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div
        className={cn(
          "md:hidden overflow-hidden transition-all duration-300 ease-in-out",
          mobileMenuOpen ? "max-h-80" : "max-h-0"
        )}
      >
        <div className="space-y-1 px-4 pb-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href || (item.href === "/" && location.pathname === "/");
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
