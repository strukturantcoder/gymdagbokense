import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { 
  User, Camera, Save, Loader2, ArrowLeft, Crown, Mail, 
  Calendar, UserCircle, LogOut, Settings, Shield, Sun, Moon, Monitor,
  Bell, Users, Trophy, Target, Dumbbell
} from 'lucide-react';

interface Profile {
  display_name: string | null;
  avatar_url: string | null;
  gender: string | null;
  birth_year: number | null;
}

interface NotificationPreferences {
  friend_requests: boolean;
  challenges: boolean;
  achievements: boolean;
  workout_reminders: boolean;
  community_challenges: boolean;
  push_enabled: boolean;
}

const defaultPreferences: NotificationPreferences = {
  friend_requests: true,
  challenges: true,
  achievements: true,
  workout_reminders: true,
  community_challenges: true,
  push_enabled: true,
};

export default function Account() {
  const { user, loading, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>(defaultPreferences);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  
  // Form state
  const [displayName, setDisplayName] = useState('');
  const [gender, setGender] = useState('');
  const [birthYear, setBirthYear] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      checkSubscription();
      fetchNotificationPreferences();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('display_name, avatar_url, gender, birth_year')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile:', error);
    }
    
    if (data) {
      setProfile(data);
      setDisplayName(data.display_name || '');
      setGender(data.gender || '');
      setBirthYear(data.birth_year?.toString() || '');
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

  const fetchNotificationPreferences = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching notification preferences:', error);
      return;
    }
    
    if (data) {
      setNotificationPrefs({
        friend_requests: data.friend_requests,
        challenges: data.challenges,
        achievements: data.achievements,
        workout_reminders: data.workout_reminders,
        community_challenges: data.community_challenges,
        push_enabled: data.push_enabled,
      });
    }
  };

  const updateNotificationPreference = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!user) return;
    
    const newPrefs = { ...notificationPrefs, [key]: value };
    setNotificationPrefs(newPrefs);
    setIsSavingPrefs(true);
    
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          ...newPrefs,
        }, { onConflict: 'user_id' });

      if (error) throw error;
      toast.success('Inställningar sparade');
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      toast.error('Kunde inte spara inställningarna');
      // Revert on error
      setNotificationPrefs(notificationPrefs);
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          display_name: displayName || null,
          gender: gender || null,
          birth_year: birthYear ? parseInt(birthYear) : null,
        }, { onConflict: 'user_id' });

      if (error) throw error;
      
      toast.success('Profil uppdaterad!');
      fetchProfile();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Kunde inte spara profilen');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Välj en bildfil');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Bilden får max vara 5MB');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          avatar_url: urlData.publicUrl,
        }, { onConflict: 'user_id' });

      if (updateError) throw updateError;

      toast.success('Profilbild uppdaterad!');
      fetchProfile();
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Kunde inte ladda upp bilden');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  // Generate year options (current year - 100 to current year - 13)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 88 }, (_, i) => currentYear - 13 - i);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                <span className="font-display text-xl font-bold">Mitt konto</span>
              </div>
            </div>
            {isPremium && (
              <Badge className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white">
                <Crown className="h-3 w-3 mr-1" />
                Premium
              </Badge>
            )}
          </div>
        </div>
      </header>

      <main className="container px-4 py-6 max-w-2xl mx-auto space-y-6">
        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle className="h-5 w-5" />
              Profil
            </CardTitle>
            <CardDescription>
              Hantera din profilinformation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Avatar className="h-24 w-24 ring-4 ring-primary/20">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-2xl">
                    {displayName?.slice(0, 2).toUpperCase() || <User className="h-10 w-10" />}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute bottom-0 right-0 h-8 w-8 rounded-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Klicka på kameran för att byta profilbild
              </p>
            </div>

            <Separator />

            {/* Profile Form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Visningsnamn</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ditt namn"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gender">Kön</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger>
                      <SelectValue placeholder="Välj kön" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Man</SelectItem>
                      <SelectItem value="female">Kvinna</SelectItem>
                      <SelectItem value="other">Annat</SelectItem>
                      <SelectItem value="prefer_not_to_say">Vill ej ange</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birthYear">Födelseår</Label>
                  <Select value={birthYear} onValueChange={setBirthYear}>
                    <SelectTrigger>
                      <SelectValue placeholder="Välj år" />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleSaveProfile} disabled={isSaving} className="w-full">
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Spara ändringar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Account Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Kontoinformation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">E-postadress</p>
                <p className="font-medium">{user?.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Medlem sedan</p>
                <p className="font-medium">
                  {user?.created_at 
                    ? new Date(user.created_at).toLocaleDateString('sv-SE', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    : 'Okänt'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Crown className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Prenumeration</p>
                <p className="font-medium">
                  {isPremium ? 'Premium-medlem' : 'Gratisversion'}
                </p>
              </div>
              {!isPremium && (
                <Button size="sm" onClick={() => navigate('/dashboard')}>
                  Uppgradera
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Theme Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="h-5 w-5" />
              Utseende
            </CardTitle>
            <CardDescription>
              Välj hur appen ska se ut
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                className="flex flex-col items-center gap-2 h-auto py-4"
                onClick={() => setTheme('light')}
              >
                <Sun className="h-5 w-5" />
                <span className="text-xs">Ljust</span>
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                className="flex flex-col items-center gap-2 h-auto py-4"
                onClick={() => setTheme('dark')}
              >
                <Moon className="h-5 w-5" />
                <span className="text-xs">Mörkt</span>
              </Button>
              <Button
                variant={theme === 'system' ? 'default' : 'outline'}
                className="flex flex-col items-center gap-2 h-auto py-4"
                onClick={() => setTheme('system')}
              >
                <Monitor className="h-5 w-5" />
                <span className="text-xs">System</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifikationer
            </CardTitle>
            <CardDescription>
              Välj vilka notiser du vill få
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bell className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Push-notiser</p>
                  <p className="text-xs text-muted-foreground">Få notiser även när appen är stängd</p>
                </div>
              </div>
              <Switch
                checked={notificationPrefs.push_enabled}
                onCheckedChange={(checked) => updateNotificationPreference('push_enabled', checked)}
                disabled={isSavingPrefs}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Vänförfrågningar</p>
                  <p className="text-xs text-muted-foreground">När någon vill bli din vän</p>
                </div>
              </div>
              <Switch
                checked={notificationPrefs.friend_requests}
                onCheckedChange={(checked) => updateNotificationPreference('friend_requests', checked)}
                disabled={isSavingPrefs}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <Target className="h-4 w-4 text-orange-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Utmaningar</p>
                  <p className="text-xs text-muted-foreground">När du blir utmanad av en vän</p>
                </div>
              </div>
              <Switch
                checked={notificationPrefs.challenges}
                onCheckedChange={(checked) => updateNotificationPreference('challenges', checked)}
                disabled={isSavingPrefs}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Achievements</p>
                  <p className="text-xs text-muted-foreground">När du låser upp nya prestationer</p>
                </div>
              </div>
              <Switch
                checked={notificationPrefs.achievements}
                onCheckedChange={(checked) => updateNotificationPreference('achievements', checked)}
                disabled={isSavingPrefs}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Dumbbell className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Träningspåminnelser</p>
                  <p className="text-xs text-muted-foreground">Påminnelser om pågående pass</p>
                </div>
              </div>
              <Switch
                checked={notificationPrefs.workout_reminders}
                onCheckedChange={(checked) => updateNotificationPreference('workout_reminders', checked)}
                disabled={isSavingPrefs}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-purple-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Community-tävlingar</p>
                  <p className="text-xs text-muted-foreground">Uppdateringar om tävlingar</p>
                </div>
              </div>
              <Switch
                checked={notificationPrefs.community_challenges}
                onCheckedChange={(checked) => updateNotificationPreference('community_challenges', checked)}
                disabled={isSavingPrefs}
              />
            </div>
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Card className="border-destructive/20">
          <CardContent className="pt-6">
            <Button 
              variant="destructive" 
              onClick={handleSignOut} 
              className="w-full"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logga ut
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
