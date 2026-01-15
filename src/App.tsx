import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SupabaseAuthProvider } from "@/contexts/SupabaseAuthContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { InventoryProvider } from "@/contexts/InventoryContext";
import { SupabaseProtectedRoute } from "@/components/auth/SupabaseProtectedRoute";
import { ThemeProvider } from "next-themes";
import { SplashScreen } from "@/components/ui/splash-screen";

// Pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Inventario from "./pages/Inventario";
import Movimientos from "./pages/Movimientos";
import Alertas from "./pages/Alertas";
import Perfil from "./pages/Perfil";
import Reportes from "./pages/Reportes";
import Configuracion from "./pages/Configuracion";
import DevReset from "./pages/DevReset";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
        <TooltipProvider>
          {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} duration={2200} />}
          <BrowserRouter>
            <SupabaseAuthProvider>
              <AuthProvider>
                <InventoryProvider>
                  <Toaster />
                  <Sonner />
                  <Routes>
                    {/* Public routes */}
                    <Route path="/" element={<Index />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/reset-password" element={<ResetPassword />} />

                    {/* Protected routes - using Supabase auth */}
                    <Route
                      path="/app/dashboard"
                      element={
                        <SupabaseProtectedRoute>
                          <Dashboard />
                        </SupabaseProtectedRoute>
                      }
                    />
                    <Route
                      path="/app/inventario"
                      element={
                        <SupabaseProtectedRoute>
                          <Inventario />
                        </SupabaseProtectedRoute>
                      }
                    />
                    <Route
                      path="/app/movimientos"
                      element={
                        <SupabaseProtectedRoute>
                          <Movimientos />
                        </SupabaseProtectedRoute>
                      }
                    />
                    <Route
                      path="/app/alertas"
                      element={
                        <SupabaseProtectedRoute>
                          <Alertas />
                        </SupabaseProtectedRoute>
                      }
                    />
                    {/* Redirect old profile route to configuracion */}
                    <Route
                      path="/app/mi-perfil"
                      element={<Navigate to="/app/configuracion" replace />}
                    />
                    <Route
                      path="/app/reportes"
                      element={
                        <SupabaseProtectedRoute>
                          <Reportes />
                        </SupabaseProtectedRoute>
                      }
                    />
                    <Route
                      path="/app/configuracion"
                      element={
                        <SupabaseProtectedRoute>
                          <Configuracion />
                        </SupabaseProtectedRoute>
                      }
                    />

                    {/* Dev-only reset page (not in sidebar) */}
                    <Route
                      path="/app/dev/reset"
                      element={
                        <SupabaseProtectedRoute>
                          <DevReset />
                        </SupabaseProtectedRoute>
                      }
                    />

                    {/* Redirect /app to /app/dashboard */}
                    <Route path="/app" element={<Navigate to="/app/dashboard" replace />} />

                    {/* 404 */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </InventoryProvider>
              </AuthProvider>
            </SupabaseAuthProvider>
          </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
  );
};

export default App;
