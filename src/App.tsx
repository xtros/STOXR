
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { WatchlistProvider } from "@/contexts/WatchlistContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { SidebarDemo } from "@/components/ui/sidebar-demo";

import ProtectedRoute from "@/components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

import { supabaseKeepAlive } from "@/services/supabaseKeepAlive";

const queryClient = new QueryClient();

// Automatically start Supabase keep-alive worker to prevent project from pausing
supabaseKeepAlive.start();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <WatchlistProvider>
          <SettingsProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="*" element={
                  <ProtectedRoute>
                    <SidebarDemo />
                  </ProtectedRoute>
                } />
              </Routes>
            </BrowserRouter>
          </SettingsProvider>
        </WatchlistProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
