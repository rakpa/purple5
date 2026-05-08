import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { supabase } from "@/lib/supabase";
import Login from "./pages/Login";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Categories from "./pages/Categories";
import India from "./pages/India";
import AISummary from "./pages/AISummary";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

// Component to handle OAuth callback
function AuthCallbackHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      // Check if we're returning from OAuth (has hash with access_token)
      const hasAuthHash = window.location.hash.includes('access_token') || 
                         window.location.hash.includes('type=recovery');
      
      if (hasAuthHash) {
        console.log("🔐 OAuth callback detected");
        console.log("Current URL:", window.location.href);
        console.log("Current origin:", window.location.origin);
        
        // Get stored redirect URL from localStorage
        const storedRedirectUrl = localStorage.getItem('auth_redirect_url');
        const storedOrigin = localStorage.getItem('auth_origin');
        
        console.log("Stored redirect URL:", storedRedirectUrl);
        console.log("Stored origin:", storedOrigin);
        
        // Check if we're on the wrong domain (e.g., redirected to Vercel when we should be on localhost)
        if (storedOrigin && storedOrigin.includes('localhost') && 
            !window.location.origin.includes('localhost')) {
          console.log("⚠️ Redirected to wrong domain! Redirecting back to localhost...");
          // Redirect to localhost with the auth hash
          const localhostUrl = `${storedOrigin}${window.location.pathname}${window.location.search}${window.location.hash}`;
          window.location.href = localhostUrl;
          return;
        }
        
        // Wait for Supabase to process the session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error getting session:", error);
          return;
        }
        
        if (session) {
          console.log("✅ Session established, redirecting...");
          
          // Clean up the URL by removing hash
          if (window.location.hash) {
            window.history.replaceState(null, '', window.location.pathname);
          }
          
          // Use stored redirect URL or default to dashboard
          const redirectTo = storedRedirectUrl 
            ? new URL(storedRedirectUrl).pathname 
            : '/dashboard';
          
          // Clean up localStorage
          localStorage.removeItem('auth_redirect_url');
          localStorage.removeItem('auth_origin');
          
          console.log("Redirecting to:", redirectTo);
          navigate(redirectTo, { replace: true });
        }
      }
    };

    // Handle OAuth callback on mount
    handleAuthCallback();

    // Also listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const storedRedirectUrl = localStorage.getItem('auth_redirect_url');
        if (storedRedirectUrl) {
          const redirectTo = new URL(storedRedirectUrl).pathname;
          localStorage.removeItem('auth_redirect_url');
          localStorage.removeItem('auth_origin');
          navigate(redirectTo, { replace: true });
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  return null;
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthCallbackHandler />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/categories"
              element={
                <ProtectedRoute>
                  <Categories />
                </ProtectedRoute>
              }
            />
            <Route
              path="/india"
              element={
                <ProtectedRoute>
                  <India />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai-summary"
              element={
                <ProtectedRoute>
                  <AISummary />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <PWAInstallPrompt />
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
