import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { InstallPrompt } from "@/components/InstallPrompt";
import { PWAUpdateNotification } from "@/components/PWAUpdateNotification";
import MobileBottomNav from "@/components/MobileBottomNav";
import { OfflineIndicator } from "@/components/OfflineIndicator";
// Lazy load all route components to reduce initial bundle size
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Lazy load route components to reduce initial bundle size
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Training = lazy(() => import("./pages/Training"));
const WorkoutSession = lazy(() => import("./pages/WorkoutSession"));
const Statistics = lazy(() => import("./pages/Statistics"));
const Social = lazy(() => import("./pages/Social"));
const Contact = lazy(() => import("./pages/Contact"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Terms = lazy(() => import("./pages/Terms"));
const Cookies = lazy(() => import("./pages/Cookies"));
const AdminChallenges = lazy(() => import("./pages/AdminChallenges"));
const AdminInstagramImages = lazy(() => import("./pages/AdminInstagramImages"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentCanceled = lazy(() => import("./pages/PaymentCanceled"));
const Account = lazy(() => import("./pages/Account"));
const queryClient = new QueryClient();

// Minimal loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-pulse text-muted-foreground">Laddar...</div>
  </div>
);

// Pages that should show bottom nav
const pagesWithBottomNav = ["/dashboard", "/training", "/stats", "/social", "/account"];

const AppContent = () => {
  const location = useLocation();
  const showBottomNav = pagesWithBottomNav.includes(location.pathname);

  return (
    <>
      <OfflineIndicator />
      <Suspense fallback={<PageLoader />}>
        <div className={showBottomNav ? "pb-16 md:pb-0" : ""}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/training" element={<Training />} />
            <Route path="/training/session" element={<WorkoutSession />} />
            <Route path="/log" element={<Training />} />
            <Route path="/cardio" element={<Training />} />
            <Route path="/stats" element={<Statistics />} />
            <Route path="/social" element={<Social />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/cookies" element={<Cookies />} />
            <Route path="/admin/challenges" element={<AdminChallenges />} />
            <Route path="/admin/instagram" element={<AdminInstagramImages />} />
            <Route path="/account" element={<Account />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/payment-canceled" element={<PaymentCanceled />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </Suspense>
      {showBottomNav && <MobileBottomNav />}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <InstallPrompt />
        <PWAUpdateNotification />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
