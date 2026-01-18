import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { Dumbbell, LogOut, Shield, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { InstallAppButton } from '@/components/InstallPrompt';
import { PushNotificationSettings } from '@/components/PushNotificationSettings';
import SubscriptionButton from '@/components/SubscriptionButton';
import { NotificationBell } from '@/components/NotificationBell';
import DashboardBentoGrid from '@/components/DashboardBentoGrid';
import DailyStreakBonus from '@/components/DailyStreakBonus';
import WelcomeGuide from '@/components/WelcomeGuide';
import { NewChallengePopup } from '@/components/NewChallengePopup';
import { PendingInvitationsPopup } from '@/components/PendingInvitationsPopup';

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
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col overflow-hidden">
      {/* Welcome Guide for new users */}
      {user && <WelcomeGuide userId={user.id} />}
      
      {/* Pending Invitations Popup */}
      {user && <PendingInvitationsPopup userId={user.id} />}
      
      {/* Minimal Header - only on desktop */}
      <header className="hidden md:block border-b border-border bg-card shrink-0">
        <div className="container px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-gym-orange to-gym-amber rounded-lg flex items-center justify-center">
                <Dumbbell className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="font-display text-xl font-bold">GYMDAGBOKEN</span>
            </div>
            <div className="flex items-center gap-2">
              <InstallAppButton />
              <PushNotificationSettings />
              <SubscriptionButton variant="compact" />
              {isAdmin && (
                <Button variant="outline" size="sm" onClick={() => navigate('/admin/challenges')}>
                  <Shield className="w-4 h-4 mr-2" />
                  Admin
                </Button>
              )}
              <NotificationBell />
              <Button variant="outline" size="sm" onClick={() => navigate('/account')}>
                <UserCircle className="w-4 h-4 mr-2" />
                Konto
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Logga ut
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Header - compact */}
      <header className="md:hidden border-b border-border bg-card shrink-0">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-gym-orange to-gym-amber rounded-lg flex items-center justify-center">
                <Dumbbell className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display text-lg font-bold">GYMDAGBOKEN</span>
            </div>
            <div className="flex items-center gap-1">
              <SubscriptionButton variant="compact" />
              <NotificationBell />
            </div>
          </div>
        </div>
      </header>

      {/* Main content - fills remaining space without scroll */}
      <main className="flex-1 container px-3 py-3 md:px-4 md:py-4 pb-20 md:pb-4 flex flex-col">
        {/* Daily Streak Bonus - compact */}
        <div className="mb-3 shrink-0">
          <DailyStreakBonus />
        </div>

        {/* Bento Grid - main content */}
        <DashboardBentoGrid className="flex-1" />
      </main>

      {/* New Challenge Popup */}
      <NewChallengePopup />
    </div>
  );
}
