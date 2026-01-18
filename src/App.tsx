import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
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
const Crossfit = lazy(() => import("./pages/Crossfit"));
const WorkoutSession = lazy(() => import("./pages/WorkoutSession"));
const Statistics = lazy(() => import("./pages/Statistics"));
const Social = lazy(() => import("./pages/Social"));
const Contact = lazy(() => import("./pages/Contact"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Terms = lazy(() => import("./pages/Terms"));
const Cookies = lazy(() => import("./pages/Cookies"));
const Blog = lazy(() => import("./pages/Blog"));
const AdminChallenges = lazy(() => import("./pages/AdminChallenges"));
const AdminInstagramImages = lazy(() => import("./pages/AdminInstagramImages"));
const AdminAds = lazy(() => import("./pages/AdminAds"));
const AdminEmails = lazy(() => import("./pages/AdminEmails"));
const AdminPremium = lazy(() => import("./pages/AdminPremium"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const Admin = lazy(() => import("./pages/Admin"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentCanceled = lazy(() => import("./pages/PaymentCanceled"));
const Account = lazy(() => import("./pages/Account"));
const JoinTeam = lazy(() => import("./pages/JoinTeam"));
const EmailHelp = lazy(() => import("./pages/EmailHelp"));
const PublicPrograms = lazy(() => import("./pages/PublicPrograms"));
const CreatorProfile = lazy(() => import("./pages/CreatorProfile"));
const WorkoutLog = lazy(() => import("./pages/WorkoutLog"));
const CardioLog = lazy(() => import("./pages/CardioLog"));
const queryClient = new QueryClient();

// Minimal loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-pulse text-muted-foreground">Laddar...</div>
  </div>
);

// Pages that should show bottom nav
const pagesWithBottomNav = ["/dashboard", "/training", "/training/crossfit", "/stats", "/social", "/account", "/workout-log", "/cardio-log", "/social/friends", "/social/teams", "/social/challenges", "/social/pool", "/social/community", "/social/achievements", "/stats/strength", "/stats/cardio", "/stats/crossfit", "/stats/weight", "/account/profile", "/account/notifications", "/account/garmin"];

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
            <Route path="/training/crossfit" element={<Crossfit />} />
            <Route path="/training/session" element={<WorkoutSession />} />
            <Route path="/log" element={<Training />} />
            <Route path="/cardio" element={<Training />} />
            <Route path="/stats" element={<Statistics />} />
            <Route path="/stats/:category" element={<Statistics />} />
            <Route path="/social" element={<Social />} />
            <Route path="/social/:category" element={<Social />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/cookies" element={<Cookies />} />
            <Route path="/blogg" element={<Blog />} />
            <Route path="/blogg/:slug" element={<Blog />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/challenges" element={<AdminChallenges />} />
            <Route path="/admin/instagram" element={<AdminInstagramImages />} />
            <Route path="/admin/ads" element={<AdminAds />} />
            <Route path="/admin/emails" element={<AdminEmails />} />
            <Route path="/admin/premium" element={<AdminPremium />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/account" element={<Account />} />
            <Route path="/account/:section" element={<Account />} />
            <Route path="/workout-log" element={<WorkoutLog />} />
            <Route path="/cardio-log" element={<CardioLog />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/payment-canceled" element={<PaymentCanceled />} />
            <Route path="/join-team/:code" element={<JoinTeam />} />
            <Route path="/email-help" element={<EmailHelp />} />
            <Route path="/programs" element={<PublicPrograms />} />
            <Route path="/public-programs" element={<PublicPrograms />} />
            <Route path="/creator/:creatorId" element={<CreatorProfile />} />
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
  <HelmetProvider>
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
  </HelmetProvider>
);

export default App;
