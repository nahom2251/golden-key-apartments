import { lazy, Suspense, useCallback, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import SplashScreen from "@/components/SplashScreen";
import Login from "./pages/Login";
import Register from "./pages/Register";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Tenants = lazy(() => import("./pages/Tenants"));
const Billing = lazy(() => import("./pages/Billing"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function RouteLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground">Loading...</p>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isApproved, isAdmin } = useAuth();

  if (loading) return <RouteLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isApproved && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="card-luxury p-8 text-center max-w-sm">
          <h2 className="font-display text-xl font-bold mb-2">Awaiting Approval</h2>
          <p className="text-sm text-muted-foreground">Your account is pending admin approval. Please check back later.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function RootRoute() {
  const { user, loading } = useAuth();

  if (loading) return <RouteLoader />;

  return <Navigate to={user ? "/dashboard" : "/login"} replace />;
}

function AppShell() {
  const location = useLocation();
  const { user, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(() => sessionStorage.getItem("as-apt-splash-seen") !== "true");

  const handleSplashFinish = useCallback(() => {
    sessionStorage.setItem("as-apt-splash-seen", "true");
    setShowSplash(false);
  }, []);

  const isAuthPage = location.pathname === "/login" || location.pathname === "/register";
  const shouldShowSplash = showSplash && !isAuthPage && !loading && Boolean(user);

  return (
    <>
      {shouldShowSplash && <SplashScreen onFinish={handleSplashFinish} />}
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route path="/" element={<RootRoute />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/tenants" element={<ProtectedRoute><Tenants /></ProtectedRoute>} />
          <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppShell />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
