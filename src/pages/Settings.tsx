import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { User, Mail, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Settings() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error("Error getting user:", error);
        toast.error("Failed to load user information");
      } finally {
        setLoading(false);
      }
    };

    getUser();

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="mx-auto max-w-7xl px-4 py-4 sm:py-6 lg:py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading settings...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="mx-auto max-w-7xl px-4 py-4 sm:py-6 lg:py-8 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground mt-2">Manage your account settings and preferences</p>
          </div>

          {/* Account Information */}
          <Card className="rounded-2xl shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Account Information
              </CardTitle>
              <CardDescription>Your account details and profile information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground">User Account</p>
                  <p className="text-sm text-muted-foreground">Update your profile information</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="h-11 rounded-xl border-input bg-muted cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="userId" className="text-sm font-medium text-foreground">
                    User ID
                  </Label>
                  <Input
                    id="userId"
                    type="text"
                    value={user?.id || ""}
                    disabled
                    className="h-11 rounded-xl border-input bg-muted cursor-not-allowed font-mono text-xs"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Actions */}
          <Card className="rounded-2xl shadow-card">
            <CardHeader>
              <CardTitle>Account Actions</CardTitle>
              <CardDescription>Manage your account and session</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant="destructive"
                size="lg"
                onClick={handleSignOut}
                className="w-full sm:w-auto"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
              <p className="text-sm text-muted-foreground">
                Sign out of your account. You'll need to sign in again to access your data.
              </p>
            </CardContent>
          </Card>

          {/* App Information */}
          <Card className="rounded-2xl shadow-card">
            <CardHeader>
              <CardTitle>About</CardTitle>
              <CardDescription>Application information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">App Name</span>
                <span className="text-sm font-medium text-foreground">ExpenseTrack</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Version</span>
                <span className="text-sm font-medium text-foreground">1.0.0</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

