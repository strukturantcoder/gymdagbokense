import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { Dumbbell, LogOut, Shield, UserCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InstallAppButton } from '@/components/InstallPrompt';
import { PushNotificationSettings } from '@/components/PushNotificationSettings';
import SubscriptionButton from '@/components/SubscriptionButton';
import { NotificationBell } from '@/components/NotificationBell';
import DashboardBentoGrid from '@/components/DashboardBentoGrid';
import DailyStreakBonus from '@/components/DailyStreakBonus';
import WelcomeGuide from '@/components/WelcomeGuide';
import { NewChallengePopup } from '@/components/NewChallengePopup';
import { PendingInvitationsPopup } from '@/components/PendingInvitationsPopup';
import AdBanner from '@/components/AdBanner';
import MotivationalNudge from '@/components/MotivationalNudge';
import InviteFriendNudge from '@/components/InviteFriendNudge';
import { AppShell } from '@/components/layout/AppShell';

export default function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (loading) {
    return <AppShell loading loadingComponent={<Loader2 className="h-8 w-8 animate-spin text-primary" />} />;
  }

  return (
    <AppShell>
      {/* Welcome Guide for new users */}
      {user && <WelcomeGuide userId={user.id} />}
      
      {/* Pending Invitations Popup */}
      {user && <PendingInvitationsPopup userId={user.id} />}
      
      {/* Minimal Header - only on desktop */}
      <header className="hidden md:block border-b border-border bg-card shrink-0">
        <div className="container px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-gym-orange to-gym-amber rounded-lg flex items-center justify-center">
                <Dumbbell className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display text-lg font-bold">GYMDAGBOKEN</span>
            </div>
            <div className="flex items-center gap-2">
              <InstallAppButton />
              <PushNotificationSettings />
              <SubscriptionButton variant="compact" />
              {isAdmin && (
                <Button variant="outline" size="sm" onClick={() => navigate('/admin/challenges')}>
                  <Shield className="w-4 h-4 mr-1" />
                  Admin
                </Button>
              )}
              <NotificationBell />
              <Button variant="outline" size="sm" onClick={() => navigate('/account')}>
                <UserCircle className="w-4 h-4 mr-1" />
                Konto
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-1" />
                Logga ut
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Header - compact */}
      <header className="md:hidden border-b border-border bg-card shrink-0">
        <div className="px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-gym-orange to-gym-amber rounded-lg flex items-center justify-center">
                <Dumbbell className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-display text-base font-bold">GYMDAGBOKEN</span>
            </div>
            <div className="flex items-center gap-1">
              <SubscriptionButton variant="compact" />
              <NotificationBell />
            </div>
          </div>
        </div>
      </header>

      {/* Main content - scrollable */}
      <main className="flex-1 flex flex-col px-2 py-1.5 md:px-4 md:py-2 pb-16 md:pb-2 overflow-y-auto">
        {/* Daily Streak Bonus - very compact */}
        <div className="shrink-0 mb-1.5">
          <DailyStreakBonus />
        </div>

        {/* Bento Grid */}
        <div className="shrink-0">
          <DashboardBentoGrid />
        </div>

        {/* Ad Banner at bottom */}
        <div className="shrink-0 mt-1.5">
          <AdBanner format="mobile_banner" placement="dashboard_bottom" showPremiumPrompt={false} />
        </div>
      </main>

      {/* New Challenge Popup */}
      <NewChallengePopup />
      
      {/* Motivational Nudges */}
      {user && <MotivationalNudge />}
      {user && <InviteFriendNudge userId={user.id} />}
    </AppShell>
  );
}
