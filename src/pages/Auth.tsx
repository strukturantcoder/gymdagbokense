import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Dumbbell, Mail, Lock, User, Gift } from 'lucide-react';

const signUpSchema = z.object({
  displayName: z.string().min(2, 'Namn måste vara minst 2 tecken').max(50, 'Namn får max vara 50 tecken'),
  email: z.string().email('Ogiltig e-postadress'),
  password: z.string().min(6, 'Lösenord måste vara minst 6 tecken'),
});

const signInSchema = z.object({
  email: z.string().email('Ogiltig e-postadress'),
  password: z.string().min(1, 'Lösenord krävs'),
});

export default function Auth() {
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

  // Check for referral code in URL
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      setReferralCode(ref);
      setIsSignUp(true); // Auto-switch to signup mode
      
      // Try to fetch inviter's name
      const fetchInviter = async () => {
        const { data: inviteData } = await supabase
          .from('invite_codes')
          .select('user_id')
          .eq('code', ref)
          .maybeSingle();
        
        if (inviteData?.user_id) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('user_id', inviteData.user_id)
            .maybeSingle();
          
          if (profileData?.display_name) {
            setInviterName(profileData.display_name);
          }
        }
      };
      fetchInviter();
    }
  }, [searchParams]);

  useEffect(() => {
    if (user) {
      // If user just signed up with a referral, save the referral
      if (referralCode) {
        saveReferral(user.id, referralCode);
      }
      navigate('/dashboard');
    }
  }, [user, navigate, referralCode]);

  const saveReferral = async (newUserId: string, code: string) => {
    try {
      // Get the inviter's user_id from the invite code
      const { data: inviteData } = await supabase
        .from('invite_codes')
        .select('user_id')
        .eq('code', code)
        .maybeSingle();

      if (inviteData?.user_id && inviteData.user_id !== newUserId) {
        // Save the referral
        await supabase
          .from('referrals')
          .insert({
            inviter_id: inviteData.user_id,
            invited_id: newUserId,
            invite_code: code
          });

        // Update invite code usage count using RPC or direct increment
        // Note: uses_count will be tracked via referrals count instead

        // Auto-create friendship
        await supabase
          .from('friendships')
          .insert({
            user_id: inviteData.user_id,
            friend_id: newUserId,
            status: 'accepted'
          });

        toast.success('Du är nu vän med personen som bjöd in dig!');
      }
    } catch (error) {
      console.error('Error saving referral:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        const validation = signUpSchema.safeParse({ displayName, email, password });
        if (!validation.success) {
          toast.error(validation.error.errors[0].message);
          setIsLoading(false);
          return;
        }

        const { error } = await signUp(email, password, displayName);
        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('E-postadressen är redan registrerad');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Konto skapat! Välkommen till Gymdagboken!');
        }
      } else {
        const validation = signInSchema.safeParse({ email, password });
        if (!validation.success) {
          toast.error(validation.error.errors[0].message);
          setIsLoading(false);
          return;
        }

        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error('Fel e-post eller lösenord');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Inloggad!');
        }
      }
    } catch (err) {
      toast.error('Något gick fel, försök igen');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="bg-primary p-3 rounded-xl">
              <Dumbbell className="h-8 w-8 text-primary-foreground" />
            </div>
            <span className="text-2xl font-display font-bold text-foreground tracking-tight">
              GYMDAGBOKEN
            </span>
          </div>

          {/* Title */}
          <h1 className="text-xl font-semibold text-center text-foreground mb-6">
            {isSignUp ? 'Skapa konto' : 'Logga in'}
          </h1>

          {/* Referral Banner */}
          {referralCode && isSignUp && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 bg-gradient-to-r from-gym-orange/10 to-gym-amber/10 border border-gym-orange/20 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-gym-orange to-gym-amber rounded-full flex items-center justify-center">
                  <Gift className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-medium text-sm">
                    {inviterName ? `${inviterName} bjöd in dig!` : 'Du har blivit inbjuden!'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Skapa konto för att bli vänner automatiskt
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-foreground">Namn</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="Ditt namn"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="pl-10 bg-background border-border"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">E-post</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="din@email.se"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-background border-border"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Lösenord</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-background border-border"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? 'Laddar...' : isSignUp ? 'Skapa konto' : 'Logga in'}
            </Button>
          </form>

          {/* Toggle */}
          <div className="mt-6 text-center">
            <p className="text-muted-foreground">
              {isSignUp ? 'Har du redan ett konto?' : 'Har du inget konto?'}
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="ml-2 text-primary hover:text-primary/80 font-semibold transition-colors"
              >
                {isSignUp ? 'Logga in' : 'Skapa konto'}
              </button>
            </p>
          </div>
        </div>

        {/* Back link */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/')}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Tillbaka till startsidan
          </button>
        </div>
      </motion.div>
    </div>
  );
}
