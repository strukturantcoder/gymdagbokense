import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { Scale, Watch } from 'lucide-react';
import { GarminConnectSettings } from '@/components/GarminConnectSettings';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { APP_VERSION, forceAppUpdate } from '@/components/PWAUpdateNotification';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  User, Camera, Loader2, ArrowLeft, Crown,
  LogOut, Settings, Sun, Moon, RefreshCw, Bell
} from 'lucide-react';
import WeightLogDialog from '@/components/WeightLogDialog';
import { motion } from 'framer-motion';

interface Profile {
  display_name: string | null;
  avatar_url: string | null;
}

const accountSections = [
  { 
    id: 'profile', 
    label: 'Profil', 
    icon: User, 
    gradient: 'from-blue-500/20 to-indigo-500/20',
    border: 'border-blue-500/30 hover:border-blue-500/60',
    iconColor: 'text-blue-500',
    description: 'Redigera din profil'
  },
  { 
    id: 'weight', 
    label: 'Vikt', 
    icon: Scale, 
    gradient: 'from-green-500/20 to-emerald-500/20',
    border: 'border-green-500/30 hover:border-green-500/60',
    iconColor: 'text-green-500',
    description: 'Logga & spåra vikt'
  },
  { 
    id: 'notifications', 
    label: 'Notiser', 
    icon: Bell, 
    gradient: 'from-yellow-500/20 to-amber-500/20',
    border: 'border-yellow-500/30 hover:border-yellow-500/60',
    iconColor: 'text-yellow-500',
    description: 'Hantera notiser'
  },
  { 
    id: 'garmin', 
    label: 'Garmin', 
    icon: Watch, 
    gradient: 'from-purple-500/20 to-pink-500/20',
    border: 'border-purple-500/30 hover:border-purple-500/60',
    iconColor: 'text-purple-500',
    description: 'Koppla Garmin-enhet'
  },
  { 
    id: 'theme', 
    label: 'Tema', 
    icon: Sun, 
    gradient: 'from-orange-500/20 to-red-500/20',
    border: 'border-orange-500/30 hover:border-orange-500/60',
    iconColor: 'text-orange-500',
    description: 'Ljust / Mörkt läge'
  },
  { 
    id: 'maintenance', 
    label: 'Underhåll', 
    icon: RefreshCw, 
    gradient: 'from-gray-500/20 to-slate-500/20',
    border: 'border-gray-500/30 hover:border-gray-500/60',
    iconColor: 'text-gray-500',
    description: 'Cache & uppdateringar'
  },
];

export default function Account() {
  const { user, loading, signOut, session, checkSubscription: authCheckSubscription } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [showWeightDialog, setShowWeightDialog] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      checkSubscription();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setProfile(data);
    }
    
    setIsLoading(false);
  };

  const checkSubscription = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (!error && data?.subscribed) {
        setIsPremium(true);
      }
    } catch (err) {
      console.error('Error checking subscription:', err);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleForceUpdate = async () => {
    setIsClearing(true);
    try {
      await forceAppUpdate(() => {});
    } catch (error) {
      toast.error('Kunde inte rensa cachen');
      setIsClearing(false);
    }
  };

  const handleSectionClick = (id: string) => {
    switch (id) {
      case 'profile':
        navigate('/account/profile');
        break;
      case 'weight':
        setShowWeightDialog(true);
        break;
      case 'notifications':
        navigate('/account/notifications');
        break;
      case 'garmin':
        navigate('/account/garmin');
        break;
      case 'theme':
        setTheme(theme === 'dark' ? 'light' : 'dark');
        toast.success(`Tema ändrat till ${theme === 'dark' ? 'ljust' : 'mörkt'}`);
        break;
      case 'maintenance':
        handleForceUpdate();
        break;
    }
  };

  if (loading || isLoading) {
    return (
      <div className="h-[100dvh] bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
      <WeightLogDialog
        open={showWeightDialog}
        onOpenChange={setShowWeightDialog}
        onSuccess={() => toast.success('Vikt loggad!')}
      />

      {/* Compact Header */}
      <header className="border-b border-border bg-card shrink-0">
        <div className="px-3 py-2 md:px-4 md:py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate('/dashboard')}
                className="h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-gradient-to-br from-gym-orange to-gym-amber rounded-lg flex items-center justify-center">
                  <Settings className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-display text-base font-bold">KONTO</span>
              </div>
            </div>
            {isPremium && (
              <Badge className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white text-xs">
                <Crown className="h-3 w-3 mr-1" />
                Premium
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Main content - fixed height, no scroll */}
      <main className="flex-1 flex flex-col px-3 py-3 md:px-4 md:py-4 pb-16 md:pb-4 overflow-hidden">
        {/* User Profile Card - compact */}
        <Card className="shrink-0 mb-3">
          <CardContent className="p-3 flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10">
                {profile?.display_name?.slice(0, 2).toUpperCase() || user?.email?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{profile?.display_name || 'Användare'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Account section cards - 2x3 grid */}
        <div className="flex-1 grid grid-cols-2 gap-2 min-h-0 content-start">
          {accountSections.map((section, index) => (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              whileTap={{ scale: 0.97 }}
            >
              <Card 
                className={`cursor-pointer bg-gradient-to-br ${section.gradient} ${section.border} transition-all h-full`}
                onClick={() => handleSectionClick(section.id)}
              >
                <CardContent className="p-3 flex flex-col justify-between h-full min-h-[80px]">
                  <section.icon className={`w-5 h-5 ${section.iconColor}`} />
                  <div>
                    <p className="text-sm font-semibold">{section.label}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">{section.description}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Version info */}
        <div className="shrink-0 mt-3 text-center">
          <p className="text-[10px] text-muted-foreground">Version {APP_VERSION}</p>
        </div>
      </main>
    </div>
  );
}
