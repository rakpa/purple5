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
import { syncGmailFromGoogleLogin } from "@/lib/gmail-session";
import Login from "./pages/Login";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Categories from "./pages/Categories";
import India from "./pages/India";
import AISummary from "./pages/AISummary";
import Settings from "./pages/Settings";
import Budget from "./pages/Budget";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function AuthCallbackHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const hasAuthHash = window.location.hash.includes("access_token") ||
        window.location.hash.includes("type=recovery");

      if (hasAuthHash) {
        const storedRedirectUrl = localStorage.getItem("auth_redirect_url");
        const storedOrigin = localStorage.getItem("auth_origin");

        if (storedOrigin && storedOrigin.includes("localhost") && !window.location.origin.includes("localhost")) {
          const localhostUrl = `${storedOrigin}${window.location.pathname}${window.location.search}${window.location.hash}`;
          window.location.href = localhostUrl;
          return;
        }

        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Error getting session:", error);
          return;
        }

        if (session) {
          if (window.location.hash) {
            window.history.replaceState(null, "", window.location.pathname);
          }

          const redirectTo = storedRedirectUrl ? new URL(storedRedirectUrl).pathname : "/dashboard";
          localStorage.removeItem("auth_redirect_url");
          localStorage.removeItem("auth_origin");
          navigate(redirectTo, { replace: true });
        }
      }
    };

    handleAuthCallback();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        if (window.location.search.includes("oauth_state_id=")) return;
        const storedRedirectUrl = localStorage.getItem("auth_redirect_url");
        if (storedRedirectUrl) {
          const redirectTo = new URL(storedRedirectUrl).pathname;
          localStorage.removeItem("auth_redirect_url");
          localStorage.removeItem("auth_origin");
          navigate(redirectTo, { replace: true });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return null;
}

function GmailSessionSync() {
  useEffect(() => {
    const sync = () => {
      void syncGmailFromGoogleLogin().catch(() => {});
    };
    sync();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") sync();
    });
    return () => subscription.unsubscribe();
  }, []);
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
          <GmailSessionSync />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/budget" element={<ProtectedRoute><Budget /></ProtectedRoute>} />
            <Route path="/categories" element={<ProtectedRoute><Categories /></ProtectedRoute>} />
            <Route path="/india" element={<ProtectedRoute><India /></ProtectedRoute>} />
            <Route path="/ai-summary" element={<ProtectedRoute><AISummary /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <PWAInstallPrompt />
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
