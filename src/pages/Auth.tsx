import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Dumbbell, Mail, Lock, User, Gift } from 'lucide-react';
import LanguageSelector from '@/components/LanguageSelector';

export default function Auth() {
  const { t } = useTranslation();
  const [isSignUp, setIsSignUp] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [inviterName, setInviterName] = useState<string | null>(null);
  const { user, signUp, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      setReferralCode(ref);
      setIsSignUp(true);
      const fetchInviter = async () => {
        const { data: inviteData } = await supabase.from('invite_codes').select('user_id').eq('code', ref).maybeSingle();
        if (inviteData?.user_id) {
          const { data: profileData } = await supabase.from('profiles').select('display_name').eq('user_id', inviteData.user_id).maybeSingle();
          if (profileData?.display_name) setInviterName(profileData.display_name);
        }
      };
      fetchInviter();
    }
  }, [searchParams]);

  useEffect(() => {
    if (user) {
      if (referralCode) saveReferral(user.id, referralCode);
      navigate('/dashboard');
    }
  }, [user, navigate, referralCode]);

  const saveReferral = async (newUserId: string, code: string) => {
    try {
      const { data: inviteData } = await supabase.from('invite_codes').select('user_id').eq('code', code).maybeSingle();
      if (inviteData?.user_id && inviteData.user_id !== newUserId) {
        await supabase.from('referrals').insert({ inviter_id: inviteData.user_id, invited_id: newUserId, invite_code: code });
        await supabase.from('friendships').insert({ user_id: inviteData.user_id, friend_id: newUserId, status: 'accepted' });
        toast.success(t('auth.friendAdded'));
      }
    } catch (error) {
      console.error('Error saving referral:', error);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/dashboard` } });
      if (error) toast.error(t('auth.googleError'));
    } catch {
      toast.error(t('auth.genericError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isSignUp) {
        const validation = z.object({
          displayName: z.string().min(2, t('auth.nameMinLength')).max(50, t('auth.nameMaxLength')),
          email: z.string().email(t('auth.invalidEmail')),
          password: z.string().min(6, t('auth.passwordMinLength')),
        }).safeParse({ displayName, email, password });
        if (!validation.success) { toast.error(validation.error.errors[0].message); setIsLoading(false); return; }
        const { error } = await signUp(email, password, displayName);
        if (error) { toast.error(error.message.includes('already registered') ? t('auth.emailAlreadyRegistered') : error.message); }
        else { 
          toast.success(t('auth.accountCreated')); 
          // Send welcome email
          supabase.functions.invoke('send-welcome-email', {
            body: { email, displayName }
          }).catch(err => console.error('Failed to send welcome email:', err));
        }
      } else {
        const validation = z.object({ email: z.string().email(t('auth.invalidEmail')), password: z.string().min(1, t('auth.passwordRequired')) }).safeParse({ email, password });
        if (!validation.success) { toast.error(validation.error.errors[0].message); setIsLoading(false); return; }
        const { error } = await signIn(email, password);
        if (error) { toast.error(error.message.includes('Invalid login credentials') ? t('auth.invalidCredentials') : error.message); }
        else { toast.success(t('auth.loggedIn')); }
      }
    } catch { toast.error(t('auth.genericError')); } finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute top-4 right-4"><LanguageSelector /></div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
        <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="bg-primary p-3 rounded-xl"><Dumbbell className="h-8 w-8 text-primary-foreground" /></div>
            <span className="text-2xl font-display font-bold text-foreground tracking-tight">GYMDAGBOKEN</span>
          </div>
          <h1 className="text-xl font-semibold text-center text-foreground mb-6">{isSignUp ? t('auth.createAccount') : t('auth.login')}</h1>
          {referralCode && isSignUp && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-6 p-4 bg-gradient-to-r from-gym-orange/10 to-gym-amber/10 border border-gym-orange/20 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-gym-orange to-gym-amber rounded-full flex items-center justify-center"><Gift className="w-5 h-5 text-primary-foreground" /></div>
                <div><p className="font-medium text-sm">{inviterName ? t('auth.invitedBy', { name: inviterName }) : t('auth.invitedGeneric')}</p><p className="text-xs text-muted-foreground">{t('auth.inviteSubtext')}</p></div>
              </div>
            </motion.div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (<div className="space-y-2"><Label htmlFor="displayName">{t('auth.name')}</Label><div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /><Input id="displayName" type="text" placeholder={t('auth.namePlaceholder')} value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="pl-10 bg-background border-border" /></div></div>)}
            <div className="space-y-2"><Label htmlFor="email">{t('auth.email')}</Label><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /><Input id="email" type="email" placeholder={t('auth.emailPlaceholder')} value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 bg-background border-border" /></div></div>
            <div className="space-y-2"><Label htmlFor="password">{t('auth.password')}</Label><div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /><Input id="password" type="password" placeholder={t('auth.passwordPlaceholder')} value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 bg-background border-border" /></div></div>
            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>{isLoading ? t('common.loading') : isSignUp ? t('auth.createAccount') : t('auth.login')}</Button>
          </form>
          <div className="relative my-6"><div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">{t('common.or')}</span></div></div>
          <Button type="button" variant="outline" className="w-full" size="lg" onClick={handleGoogleSignIn} disabled={isLoading}>
            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
            {t('auth.continueWithGoogle')}
          </Button>
          <div className="mt-6 text-center"><p className="text-muted-foreground">{isSignUp ? t('auth.hasAccount') : t('auth.noAccount')}<button type="button" onClick={() => setIsSignUp(!isSignUp)} className="ml-2 text-primary hover:text-primary/80 font-semibold transition-colors">{isSignUp ? t('auth.login') : t('auth.createAccount')}</button></p></div>
        </div>
        <div className="text-center mt-6"><button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground transition-colors">{t('auth.backToHome')}</button></div>
      </motion.div>
    </div>
  );
}