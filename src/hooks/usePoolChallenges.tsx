import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface PoolEntry {
  id: string;
  user_id: string;
  challenge_category: string;
  challenge_type: string;
  target_value: number;
  duration_days: number;
  preferred_gender: string | null;
  min_age: number | null;
  max_age: number | null;
  allow_multiple: boolean;
  max_participants: number;
  latest_start_date: string;
  status: string;
  created_at: string;
}

export interface PoolChallenge {
  id: string;
  challenge_category: string;
  challenge_type: string;
  target_value: number;
  start_date: string;
  end_date: string;
  status: string;
  winner_id: string | null;
  xp_reward: number;
  participants?: PoolParticipant[];
}

export interface PoolParticipant {
  id: string;
  challenge_id: string;
  user_id: string;
  current_value: number;
  joined_at: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export interface PoolMessage {
  id: string;
  challenge_id: string;
  user_id: string;
  message: string;
  created_at: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export interface UserProfile {
  birth_year: number | null;
  gender: string | null;
}

export function usePoolChallenges() {
  const { user } = useAuth();
  const [myEntries, setMyEntries] = useState<PoolEntry[]>([]);
  const [myChallenges, setMyChallenges] = useState<PoolChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const fetchUserProfile = useCallback(async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('birth_year, gender')
      .eq('user_id', user.id)
      .single();
    
    setUserProfile(data);
  }, [user]);

  const fetchMyEntries = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('challenge_pool_entries')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['waiting', 'matched'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching entries:', error);
    } else {
      setMyEntries(data || []);
    }
  }, [user]);

  const fetchMyChallenges = useCallback(async () => {
    if (!user) return;

    // Get challenges where user is a participant
    const { data: participations, error: partError } = await supabase
      .from('pool_challenge_participants')
      .select('challenge_id')
      .eq('user_id', user.id);

    if (partError) {
      console.error('Error fetching participations:', partError);
      return;
    }

    if (!participations || participations.length === 0) {
      setMyChallenges([]);
      return;
    }

    const challengeIds = participations.map(p => p.challenge_id);

    const { data: challenges, error: challengeError } = await supabase
      .from('pool_challenges')
      .select('*')
      .in('id', challengeIds)
      .order('created_at', { ascending: false });

    if (challengeError) {
      console.error('Error fetching challenges:', challengeError);
      return;
    }

    // Fetch participants for each challenge
    const challengesWithParticipants = await Promise.all(
      (challenges || []).map(async (challenge) => {
        const { data: participants } = await supabase
          .from('pool_challenge_participants')
          .select('*')
          .eq('challenge_id', challenge.id);

        // Fetch profiles for participants
        const participantsWithProfiles = await Promise.all(
          (participants || []).map(async (p) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('display_name, avatar_url')
              .eq('user_id', p.user_id)
              .single();
            return { ...p, profile };
          })
        );

        return { ...challenge, participants: participantsWithProfiles };
      })
    );

    setMyChallenges(challengesWithParticipants);
  }, [user]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      Promise.all([fetchUserProfile(), fetchMyEntries(), fetchMyChallenges()])
        .finally(() => setLoading(false));
    }
  }, [user, fetchUserProfile, fetchMyEntries, fetchMyChallenges]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    const participantsChannel = supabase
      .channel('pool-participants')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pool_challenge_participants'
        },
        () => {
          fetchMyChallenges();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(participantsChannel);
    };
  }, [user, fetchMyChallenges]);

  const updateProfile = async (birthYear: number | null, gender: string | null) => {
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ birth_year: birthYear, gender })
      .eq('user_id', user.id);

    if (error) {
      toast.error('Kunde inte uppdatera profil');
      throw error;
    }

    setUserProfile({ birth_year: birthYear, gender });
    toast.success('Profil uppdaterad');
  };

  const createPoolEntry = async (entry: Omit<PoolEntry, 'id' | 'user_id' | 'status' | 'created_at'>) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('challenge_pool_entries')
      .insert({
        ...entry,
        user_id: user.id
      })
      .select()
      .single();

    if (error) {
      toast.error('Kunde inte skapa utmaningsförfrågan');
      throw error;
    }

    toast.success('Söker efter motståndare...');
    await fetchMyEntries();

    // Trigger matching immediately after creating entry
    try {
      const { data: matchResult, error: matchError } = await supabase.functions.invoke('match-pool-challenges', {
        body: { entryId: data.id }
      });

      if (matchError) {
        console.error('Match error:', matchError);
      } else if (matchResult?.matched > 0) {
        toast.success('Matchad! Din utmaning har startat! 🎯');
        await fetchMyChallenges();
        await fetchMyEntries();
      } else {
        toast.info('Väntar på matchning - du meddelas när någon passar.');
      }
    } catch (matchErr) {
      console.error('Error triggering match:', matchErr);
      // Don't show error to user - entry is still created
    }

    return data;
  };

  const cancelPoolEntry = async (entryId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('challenge_pool_entries')
      .update({ status: 'cancelled' })
      .eq('id', entryId)
      .eq('user_id', user.id);

    if (error) {
      toast.error('Kunde inte avbryta förfrågan');
      throw error;
    }

    toast.success('Förfrågan avbruten');
    await fetchMyEntries();
  };

  const sendMessage = async (challengeId: string, message: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('pool_challenge_messages')
      .insert({
        challenge_id: challengeId,
        user_id: user.id,
        message
      });

    if (error) {
      toast.error('Kunde inte skicka meddelande');
      throw error;
    }
  };

  const getMessages = async (challengeId: string): Promise<PoolMessage[]> => {
    const { data, error } = await supabase
      .from('pool_challenge_messages')
      .select('*')
      .eq('challenge_id', challengeId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }

    // Fetch profiles for messages
    const messagesWithProfiles = await Promise.all(
      (data || []).map(async (m) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('user_id', m.user_id)
          .single();
        return { ...m, profile };
      })
    );

    return messagesWithProfiles;
  };

  return {
    myEntries,
    myChallenges,
    userProfile,
    loading,
    updateProfile,
    createPoolEntry,
    cancelPoolEntry,
    sendMessage,
    getMessages,
    refreshChallenges: fetchMyChallenges,
    refreshEntries: fetchMyEntries
  };
}
