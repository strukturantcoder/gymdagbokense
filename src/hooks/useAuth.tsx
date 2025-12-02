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
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  checkSubscription: (accessToken?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(false);

  const checkSubscription = useCallback(async (accessToken?: string) => {
    const token = accessToken || session?.access_token;
    if (!token) {
      setIsPremium(false);
      setSubscriptionEnd(null);
      return;
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
      } else {
        setIsPremium(data?.subscribed || false);
        setSubscriptionEnd(data?.subscription_end || null);
      }
    } catch (error) {
      // Silent fail for auth issues - user just isn't subscribed
      setIsPremium(false);
      setSubscriptionEnd(null);
    } finally {
      setCheckingSubscription(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
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
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      isPremium, 
      subscriptionEnd,
      checkingSubscription,
      signUp, 
      signIn, 
      signOut,
      checkSubscription 
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
