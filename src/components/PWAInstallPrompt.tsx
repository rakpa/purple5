import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Check if app was previously installed
    if (window.navigator.standalone === true) {
      setIsInstalled(true);
      return;
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show prompt after a delay to not interrupt user flow
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Check if user dismissed the prompt before
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
      // Show again after 7 days
      if (daysSinceDismissed < 7) {
        setShowPrompt(false);
      }
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("User accepted the install prompt");
      setShowPrompt(false);
      setIsInstalled(true);
    } else {
      console.log("User dismissed the install prompt");
      localStorage.setItem("pwa-install-dismissed", Date.now().toString());
    }

    // Clear the deferred prompt
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  };

  // Don't show if already installed or prompt not available
  if (isInstalled || !showPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <Card className="fixed bottom-4 left-4 right-4 z-50 shadow-lg md:left-auto md:right-4 md:w-96 animate-in slide-in-from-bottom-4">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base font-semibold">Install App</CardTitle>
            <CardDescription className="text-sm mt-1">
              Install this app on your device for a better experience and offline access.
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 -mt-1 -mr-1"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex gap-2">
          <Button
            onClick={handleInstallClick}
            className="flex-1"
            size="sm"
          >
            <Download className="mr-2 h-4 w-4" />
            Install
          </Button>
          <Button
            variant="outline"
            onClick={handleDismiss}
            size="sm"
          >
            Later
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

