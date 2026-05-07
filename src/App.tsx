import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { NutritionProvider } from "@/contexts/NutritionContext";
import { CartProvider } from "@/contexts/CartContext";
import { PantryProvider } from "@/contexts/PantryContext";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Pantry from "./pages/Pantry";
import Scan from "./pages/Scan";
import Recipes from "./pages/Recipes";
import Health from "./pages/Health";
import Cart from "./pages/Cart";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Notifications from "./pages/Notifications";
import { NotificationsBridge } from "@/components/NotificationsBridge";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-right" />
      <HashRouter>
        <NotificationsProvider>
          <AuthProvider>
            <PantryProvider>
              <CartProvider>
                <NutritionProvider>
                  <NotificationsBridge />
                  <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/pantry" element={<Pantry />} />
                      <Route path="/scan" element={<Scan />} />
                      <Route path="/recipes" element={<Recipes />} />
                      <Route path="/health" element={<Health />} />
                      <Route path="/cart" element={<Cart />} />
                      <Route path="/notifications" element={<Notifications />} />
                      <Route path="/settings" element={<Settings />} />
                    </Route>
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </NutritionProvider>
              </CartProvider>
            </PantryProvider>
          </AuthProvider>
        </NotificationsProvider>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
