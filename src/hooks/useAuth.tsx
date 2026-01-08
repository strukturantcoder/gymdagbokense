import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

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
    });

    return () => subscription.unsubscribe();
  }, []);

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
