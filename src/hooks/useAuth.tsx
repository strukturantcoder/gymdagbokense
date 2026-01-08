import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isPremium: boolean;
  subscriptionEnd: string | null;
  checkingSubscription: boolean;
  isEmailConfirmed: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  checkSubscription: (accessToken?: string, forceRefresh?: boolean) => Promise<void>;
  resendConfirmationEmail: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(false);

  const checkSubscription = useCallback(async (accessToken?: string, forceRefresh = false) => {
    const token = accessToken || session?.access_token;
    if (!token) {
      setIsPremium(false);
      setSubscriptionEnd(null);
      localStorage.removeItem('premium_cache');
      return;
    }

    // Check cache first (valid for 5 minutes)
    if (!forceRefresh) {
      const cachedData = localStorage.getItem('premium_cache');
      if (cachedData) {
        try {
          const { subscribed, subscription_end, timestamp } = JSON.parse(cachedData);
          const cacheAge = Date.now() - timestamp;
          // Cache is valid for 5 minutes (300000ms)
          if (cacheAge < 300000) {
            setIsPremium(subscribed);
            setSubscriptionEnd(subscription_end);
            setCheckingSubscription(false);
            return;
          }
        } catch {
          localStorage.removeItem('premium_cache');
        }
      }
    }

    setCheckingSubscription(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (error) {
        // Only log non-auth errors - auth errors are expected when session expires
        if (!error.message?.includes('non-2xx') && !error.message?.includes('Auth')) {
          console.error('Error checking subscription:', error);
        }
        setIsPremium(false);
        setSubscriptionEnd(null);
        localStorage.removeItem('premium_cache');
      } else {
        const subscribed = data?.subscribed || false;
        const subscription_end = data?.subscription_end || null;
        
        setIsPremium(subscribed);
        setSubscriptionEnd(subscription_end);
        
        // Cache the result
        localStorage.setItem('premium_cache', JSON.stringify({
          subscribed,
          subscription_end,
          timestamp: Date.now(),
        }));
      }
    } catch (error) {
      // Silent fail for auth issues - user just isn't subscribed
      setIsPremium(false);
      setSubscriptionEnd(null);
      localStorage.removeItem('premium_cache');
    } finally {
      setCheckingSubscription(false);
    }
  }, [session?.access_token]);

  // Check and notify user about new community challenge enrollments
  const checkNewChallengeEnrollments = useCallback(async (userId: string) => {
    const enrollmentKey = `challenge_enrollment_notified_${userId}`;
    const lastNotified = localStorage.getItem(enrollmentKey);
    const lastNotifiedTime = lastNotified ? parseInt(lastNotified, 10) : 0;
    
    try {
      // Find challenges user was enrolled in after last notification
      const { data: participations } = await supabase
        .from('community_challenge_participants')
        .select(`
          challenge_id,
          joined_at,
          community_challenges (
            title,
            is_active
          )
        `)
        .eq('user_id', userId)
        .gt('joined_at', new Date(lastNotifiedTime).toISOString());
      
      if (participations && participations.length > 0) {
        const activeChallenges = participations.filter(
          (p: any) => p.community_challenges?.is_active
        );
        
        if (activeChallenges.length > 0) {
          const challengeNames = activeChallenges
            .map((p: any) => p.community_challenges?.title)
            .filter(Boolean);
          
          if (challengeNames.length === 1) {
            toast.success(`Du är automatiskt anmäld till "${challengeNames[0]}"!`, {
              description: 'Logga träningspass för att samla poäng.',
              duration: 6000,
            });
          } else if (challengeNames.length > 1) {
            toast.success(`Du är automatiskt anmäld till ${challengeNames.length} tävlingar!`, {
              description: challengeNames.join(', '),
              duration: 6000,
            });
          }
        }
      }
      
      // Update last notified time
      localStorage.setItem(enrollmentKey, Date.now().toString());
    } catch (error) {
      console.error('Error checking challenge enrollments:', error);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Check for new challenge enrollments on sign in
        if (event === 'SIGNED_IN' && session?.user) {
          // Small delay to allow triggers to complete
          setTimeout(() => {
            checkNewChallengeEnrollments(session.user.id);
          }, 2000);
        }

        // Send welcome email for new OAuth signups (e.g., Google)
        if (event === 'SIGNED_IN' && session?.user) {
          const user = session.user;
          const isOAuthUser = user.app_metadata?.provider && user.app_metadata.provider !== 'email';
          
          // Check if this is a new user (created within last 60 seconds)
          const createdAt = new Date(user.created_at).getTime();
          const now = Date.now();
          const isNewUser = (now - createdAt) < 60000; // 60 seconds
          
          if (isOAuthUser && isNewUser) {
            const displayName = user.user_metadata?.full_name || user.user_metadata?.name || 'Träningsvän';
            const email = user.email;
            
            if (email) {
              // Check if we already sent a welcome email (using localStorage to prevent duplicates)
              const welcomeEmailKey = `welcome_email_sent_${user.id}`;
              if (!localStorage.getItem(welcomeEmailKey)) {
                localStorage.setItem(welcomeEmailKey, 'true');
                supabase.functions.invoke('send-welcome-email', {
                  body: { email, displayName }
                }).catch(err => console.error('Failed to send welcome email:', err));
              }
            }
          }
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Also check on initial load if already signed in
      if (session?.user) {
        checkNewChallengeEnrollments(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [checkNewChallengeEnrollments]);

  // Check subscription when session changes (only after initial load)
  useEffect(() => {
    if (loading) return; // Wait for initial auth state to load
    
    if (session?.access_token) {
      checkSubscription(session.access_token);
    } else {
      setIsPremium(false);
      setSubscriptionEnd(null);
    }
  }, [session?.access_token, checkSubscription, loading]);

  // Periodically check subscription (every 60 seconds)
  useEffect(() => {
    if (loading || !session?.access_token) return;
    
    const interval = setInterval(() => {
      if (session?.access_token) {
        checkSubscription(session.access_token);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [session?.access_token, checkSubscription, loading]);

  const signUp = async (email: string, password: string, displayName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          display_name: displayName,
        },
      },
    });
    return { error };
  };

  const resendConfirmationEmail = async () => {
    if (!user?.email) {
      return { error: new Error('Ingen e-postadress hittades') };
    }
    
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    return { error };
  };

  const isEmailConfirmed = Boolean(user?.email_confirmed_at);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsPremium(false);
    setSubscriptionEnd(null);
    localStorage.removeItem('premium_cache');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      isPremium, 
      subscriptionEnd,
      checkingSubscription,
      isEmailConfirmed,
      signUp, 
      signIn, 
      signOut,
      checkSubscription,
      resendConfirmationEmail
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
