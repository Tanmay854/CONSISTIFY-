import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import SpotifyCallback from "./pages/SpotifyCallback.tsx";
import { setupSpotifyAppUrlListener } from "@/lib/spotifyConnect";
import { toast } from "@/hooks/use-toast";

const queryClient = new QueryClient();

// Install the Spotify deep-link listener once at app boot so the OAuth callback
// works even if the user hasn't opened the Music tab yet (cold-launch from link).
setupSpotifyAppUrlListener(
  () => toast({ title: "Spotify connected" }),
  (message) => toast({ title: message }),
);

const PasswordRecoveryRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const search = new URLSearchParams(window.location.search);
    // Only treat as recovery when the link explicitly identifies itself as such.
    // Supabase signup/magic-link callbacks also carry `?code=` or `#access_token=`
    // but must NOT be routed to the reset-password screen.
    const isRecovery =
      hash.get("type") === "recovery" || search.get("type") === "recovery";

    if (
      isRecovery &&
      location.pathname !== "/reset-password" &&
      location.pathname !== "/spotify-callback"
    ) {
      navigate(`/reset-password${window.location.search}${window.location.hash}`, { replace: true });
    }
  }, [location.pathname, navigate]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <PasswordRecoveryRedirect />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/book-library" element={<BookLibrary />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/spotify-callback" element={<SpotifyCallback />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
