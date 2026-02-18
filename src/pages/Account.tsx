import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { Scale, Watch, Shield, Lock, Camera, Trash2 } from 'lucide-react';
import { GarminConnectSettings } from '@/components/GarminConnectSettings';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { PushNotificationSettings } from '@/components/PushNotificationSettings';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { APP_VERSION, forceAppUpdate } from '@/components/PWAUpdateNotification';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  User, Loader2, ArrowLeft, Crown,
  LogOut, Settings, Sun, Moon, RefreshCw, Bell, Save
} from 'lucide-react';
import WeightLogDialog from '@/components/WeightLogDialog';
import WeightHistoryChart from '@/components/WeightHistoryChart';
import WeightGoalCard from '@/components/WeightGoalCard';
import WeightLogsList from '@/components/WeightLogsList';
import AdBanner from '@/components/AdBanner';
import PasswordChangeSection from '@/components/PasswordChangeSection';
import ProgressPhotos from '@/components/ProgressPhotos';
import { AppShell } from '@/components/layout/AppShell';
import { motion } from 'framer-motion';

interface Profile {
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

const accountSections = [
  { 
    id: 'profile', 
    label: 'Profil', 
    icon: User, 
    gradient: 'from-blue-500/20 to-indigo-500/20',
    border: 'border-blue-500/30 hover:border-blue-500/60',
    iconColor: 'text-blue-500',
    description: 'Redigera din profil',
    adminOnly: false
  },
  { 
    id: 'weight', 
    label: 'Vikt', 
    icon: Scale, 
    gradient: 'from-green-500/20 to-emerald-500/20',
    border: 'border-green-500/30 hover:border-green-500/60',
    iconColor: 'text-green-500',
    description: 'Logga & spåra vikt',
    adminOnly: false
  },
  { 
    id: 'progress', 
    label: 'Progressbilder', 
    icon: Camera, 
    gradient: 'from-cyan-500/20 to-blue-500/20',
    border: 'border-cyan-500/30 hover:border-cyan-500/60',
    iconColor: 'text-cyan-500',
    description: 'Följ din utveckling visuellt',
    adminOnly: false
  },
  { 
    id: 'notifications', 
    label: 'Notiser', 
    icon: Bell, 
    gradient: 'from-yellow-500/20 to-amber-500/20',
    border: 'border-yellow-500/30 hover:border-yellow-500/60',
    iconColor: 'text-yellow-500',
    description: 'Hantera notiser',
    adminOnly: false
  },
  { 
    id: 'garmin', 
    label: 'Garmin', 
    icon: Watch, 
    gradient: 'from-purple-500/20 to-pink-500/20',
    border: 'border-purple-500/30 hover:border-purple-500/60',
    iconColor: 'text-purple-500',
    description: 'Koppla Garmin-enhet',
    adminOnly: false
  },
  { 
    id: 'theme', 
    label: 'Tema', 
    icon: Sun, 
    gradient: 'from-orange-500/20 to-red-500/20',
    border: 'border-orange-500/30 hover:border-orange-500/60',
    iconColor: 'text-orange-500',
    description: 'Ljust / Mörkt läge',
    adminOnly: false
  },
  { 
    id: 'password', 
    label: 'Lösenord', 
    icon: Lock, 
    gradient: 'from-rose-500/20 to-pink-500/20',
    border: 'border-rose-500/30 hover:border-rose-500/60',
    iconColor: 'text-rose-500',
    description: 'Ändra lösenord',
    adminOnly: false
  },
  { 
    id: 'maintenance', 
    label: 'Underhåll', 
    icon: RefreshCw, 
    gradient: 'from-gray-500/20 to-slate-500/20',
    border: 'border-gray-500/30 hover:border-gray-500/60',
    iconColor: 'text-gray-500',
    description: 'Cache & uppdateringar',
    adminOnly: false
  },
  { 
    id: 'admin', 
    label: 'Admin', 
    icon: Shield, 
    gradient: 'from-red-500/20 to-rose-500/20',
    border: 'border-red-500/30 hover:border-red-500/60',
    iconColor: 'text-red-500',
    description: 'Adminpanel',
    adminOnly: true
  },
];

export default function Account() {
  const { user, loading, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { section } = useParams<{ section?: string }>();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [showWeightDialog, setShowWeightDialog] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Profile form state
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');

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

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setBio(profile.bio || '');
    }
  }, [profile]);

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('display_name, avatar_url, bio')
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

  const handleDeleteAccount = async () => {
    if (!user) return;
    setIsDeleting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('No session');

      const { error } = await supabase.functions.invoke('delete-user-account', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (error) throw error;

      toast.success('Ditt konto har raderats');
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Kunde inte radera kontot. Försök igen.');
    } finally {
      setIsDeleting(false);
    }
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

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName,
        bio: bio,
      })
      .eq('user_id', user.id);

    if (error) {
      toast.error('Kunde inte spara profil');
    } else {
      toast.success('Profil sparad!');
      fetchProfile();
    }
    setIsSaving(false);
  };

  const handleSectionClick = (id: string) => {
    switch (id) {
      case 'theme':
        setTheme(theme === 'dark' ? 'light' : 'dark');
        toast.success(`Tema ändrat till ${theme === 'dark' ? 'ljust' : 'mörkt'}`);
        break;
      case 'maintenance':
        handleForceUpdate();
        break;
      case 'admin':
        navigate('/admin');
        break;
      default:
        navigate(`/account/${id}`);
    }
  };

  const handleBack = () => {
    if (section) {
      navigate('/account');
    } else {
      navigate('/dashboard');
    }
  };

  if (loading || isLoading) {
    return <AppShell loading loadingComponent={<Loader2 className="h-8 w-8 animate-spin text-primary" />} />;
  }

  const currentSection = accountSections.find(s => s.id === section);
  const CurrentIcon = currentSection?.icon || Settings;

  // Render section content
  const renderSectionContent = () => {
    switch (section) {
      case 'profile':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Redigera profil</CardTitle>
              <CardDescription>Uppdatera din profilinformation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center mb-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-2xl">
                    {displayName?.slice(0, 2).toUpperCase() || user?.email?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Visningsnamn</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ditt namn"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Berätta lite om dig själv..."
                  rows={3}
                />
              </div>
              <Button onClick={handleSaveProfile} disabled={isSaving} className="w-full">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Spara profil
              </Button>
            </CardContent>
          </Card>
        );
      case 'weight':
        return (
          <div className="space-y-4">
            {/* Weight Goal Card */}
            <WeightGoalCard />
            
            {/* Log weight button */}
            <Card>
              <CardContent className="p-4">
                <Button onClick={() => setShowWeightDialog(true)} className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:opacity-90">
                  <Scale className="h-4 w-4 mr-2" />
                  Logga ny vikt
                </Button>
              </CardContent>
            </Card>
            
            {/* Weight history chart */}
            <WeightHistoryChart />
            
            {/* Weight logs list with edit/delete */}
            <WeightLogsList onDataChange={() => window.location.reload()} />
            
            <WeightLogDialog
              open={showWeightDialog}
              onOpenChange={setShowWeightDialog}
              onSuccess={() => {
                toast.success('Vikt loggad!');
                window.location.reload();
              }}
            />
          </div>
        );
      case 'notifications':
        return <PushNotificationSettings />;
      case 'garmin':
        return <GarminConnectSettings />;
      case 'password':
        return <PasswordChangeSection />;
      case 'progress':
        return <ProgressPhotos />;
      default:
        return null;
    }
  };

  // If a section is selected, show that content
  if (section) {
    return (
      <AppShell>
        {/* Header */}
        <header className="border-b border-border bg-card shrink-0">
          <div className="px-3 py-2 md:px-4 md:py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleBack}
                  className="h-8 w-8"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 bg-gradient-to-br ${currentSection?.gradient || 'from-gym-orange to-gym-amber'} rounded-lg flex items-center justify-center`}>
                    <CurrentIcon className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <span className="font-display text-base font-bold uppercase">{currentSection?.label || 'Konto'}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto px-3 py-3 md:px-4 md:py-4 pb-20 md:pb-4 space-y-4">
          {/* Top Ad Banner */}
          <AdBanner format="horizontal" placement="account_section_top" />
          
          {renderSectionContent()}
          
          {/* Bottom Ad Banner */}
          <AdBanner format="horizontal" placement="account_section_bottom" />
        </main>
      </AppShell>
    );
  }

  // Main account section view
  return (
    <AppShell>
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

      {/* Main content - scrollable */}
      <main className="flex-1 overflow-y-auto px-3 py-3 md:px-4 md:py-4 pb-20 md:pb-4">
        <div className="space-y-3">
          {/* Top Ad Banner */}
          <AdBanner format="mobile_banner" placement="account_top" showPremiumPrompt={false} />
          
          {/* User Profile Card - compact */}
          <Card>
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

          {/* Account section cards - 2x3 grid (excluding admin) */}
          <div className="grid grid-cols-2 gap-2">
          {accountSections
            .filter(sec => !sec.adminOnly)
            .map((sec, index) => (
            <motion.div
              key={sec.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              whileTap={{ scale: 0.97 }}
            >
              <Card 
                className={`cursor-pointer bg-gradient-to-br ${sec.gradient} ${sec.border} transition-all h-full`}
                onClick={() => handleSectionClick(sec.id)}
              >
                <CardContent className="p-3 flex flex-col justify-between h-full min-h-[80px]">
                  <sec.icon className={`w-5 h-5 ${sec.iconColor}`} />
                  <div>
                    <p className="text-sm font-semibold">{sec.label}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">{sec.description}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
          </div>

          {/* Admin button - separate from grid, only for admins */}
          {isAdmin && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Card 
                className="cursor-pointer bg-gradient-to-br from-red-500/20 to-rose-500/20 border-red-500/30 hover:border-red-500/60 transition-all"
                onClick={() => navigate('/admin')}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <Shield className="w-5 h-5 text-red-500" />
                  <div>
                    <p className="text-sm font-semibold">Admin</p>
                    <p className="text-[10px] text-muted-foreground">Adminpanel</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Update Button */}
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleForceUpdate}
            disabled={isClearing}
          >
            {isClearing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {isClearing ? 'Uppdaterar...' : 'Rensa cache & uppdatera'}
          </Button>

          {/* Delete Account */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4 mr-2" />
                Radera konto
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Radera konto permanent?</AlertDialogTitle>
                <AlertDialogDescription>
                  Detta kommer att permanent radera ditt konto och all din data, inklusive träningsloggar, progressbilder och statistik. Denna åtgärd kan inte ångras.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Avbryt</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                  Radera permanent
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Bottom Ad Banner - after cache button */}
          <AdBanner format="mobile_banner" placement="account_bottom" showPremiumPrompt={false} />

          {/* Version info */}
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">Version {APP_VERSION}</p>
          </div>
        </div>
      </main>
    </AppShell>
  );
}