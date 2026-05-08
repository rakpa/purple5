import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      
      // Get the current origin (works for both localhost and production)
      const currentOrigin = window.location.origin;
      const redirectUrl = `${currentOrigin}/dashboard`;
      
      // Store the intended redirect URL in localStorage
      // This helps us redirect correctly even if Supabase redirects to the wrong URL
      localStorage.setItem('auth_redirect_url', redirectUrl);
      localStorage.setItem('auth_origin', currentOrigin);
      
      // Log for debugging
      console.log("🔐 OAuth Sign In");
      console.log("Current origin:", currentOrigin);
      console.log("Redirect URL:", redirectUrl);
      console.log("Stored in localStorage");
      
      // For localhost, we need to use the full URL in redirectTo
      // Supabase will validate this against the allowed redirect URLs
      const { error, data } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        console.error("OAuth error:", error);
        toast.error(`Sign in failed: ${error.message}`);
        // Clean up localStorage on error
        localStorage.removeItem('auth_redirect_url');
        localStorage.removeItem('auth_origin');
        setLoading(false);
      } else {
        // If successful, the browser will redirect to Google
        // Then Google redirects to Supabase, which redirects back to our app
        console.log("OAuth redirect initiated:", data);
      }
    } catch (error) {
      console.error("Error signing in:", error);
      toast.error("An unexpected error occurred");
      localStorage.removeItem('auth_redirect_url');
      localStorage.removeItem('auth_origin');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-2xl shadow-card">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
            <span className="text-2xl font-bold text-primary">PLN</span>
          </div>
          <CardTitle className="text-2xl font-semibold">Welcome to ExpenseTrack</CardTitle>
          <CardDescription>
            Sign in with your Google account to manage your finances
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full h-11 rounded-xl"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Sign in with Google
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}


