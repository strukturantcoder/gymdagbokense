import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface UserProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface UserStats {
  user_id: string;
  total_xp: number;
  level: number;
  total_workouts: number;
  total_sets: number;
  total_minutes: number;
}

export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  friend_profile?: UserProfile;
  user_profile?: UserProfile;
}

export interface Challenge {
  id: string;
  challenger_id: string;
  challenged_id: string;
  challenge_type: 'workouts' | 'sets' | 'minutes';
  target_value: number;
  start_date: string;
  end_date: string;
  status: 'pending' | 'active' | 'completed' | 'declined';
  winner_id: string | null;
  created_at: string;
  challenger_profile?: UserProfile;
  challenged_profile?: UserProfile;
  my_progress?: number;
  opponent_progress?: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp_reward: number;
  requirement_type: string;
  requirement_value: number;
}

export interface UserAchievement {
  id: string;
  achievement_id: string;
  earned_at: string;
  achievement?: Achievement;
}

export function useSocial() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friendship[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserStats = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user stats:', error);
    } else if (data) {
      setUserStats(data as UserStats);
    } else {
      // Create stats if not exists
      const { data: newStats, error: insertError } = await supabase
        .from('user_stats')
        .insert([{ user_id: user.id }])
        .select()
        .single();
      
      if (!insertError && newStats) {
        setUserStats(newStats as UserStats);
      }
    }
  }, [user]);

  const fetchFriends = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('friendships')
      .select('*')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
    
    if (error) {
      console.error('Error fetching friends:', error);
      return;
    }
    
    if (data) {
      const friendships = data as Friendship[];
      const accepted = friendships.filter(f => f.status === 'accepted');
      const pending = friendships.filter(f => f.status === 'pending' && f.friend_id === user.id);
      
      // Fetch profiles for friends
      const friendIds = accepted.map(f => f.user_id === user.id ? f.friend_id : f.user_id);
      const pendingIds = pending.map(f => f.user_id);
      const allIds = [...new Set([...friendIds, ...pendingIds])];
      
      if (allIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', allIds);
        
        if (profiles) {
          const profileMap = new Map(profiles.map(p => [p.user_id, p]));
          
          const enrichedFriends = accepted.map(f => ({
            ...f,
            friend_profile: profileMap.get(f.user_id === user.id ? f.friend_id : f.user_id)
          }));
          
          const enrichedPending = pending.map(f => ({
            ...f,
            user_profile: profileMap.get(f.user_id)
          }));
          
          setFriends(enrichedFriends);
          setPendingRequests(enrichedPending);
          return;
        }
      }
      
      setFriends(accepted);
      setPendingRequests(pending);
    }
  }, [user]);

  const fetchChallenges = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .or(`challenger_id.eq.${user.id},challenged_id.eq.${user.id}`)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching challenges:', error);
      return;
    }
    
    if (data) {
      const challengeList = data as Challenge[];
      const userIds = [...new Set(challengeList.flatMap(c => [c.challenger_id, c.challenged_id]))];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);
      
      const { data: progress } = await supabase
        .from('challenge_progress')
        .select('*')
        .in('challenge_id', challengeList.map(c => c.id));
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      const progressMap = new Map(progress?.map(p => [`${p.challenge_id}-${p.user_id}`, p.current_value]) || []);
      
      const enriched = challengeList.map(c => ({
        ...c,
        challenger_profile: profileMap.get(c.challenger_id),
        challenged_profile: profileMap.get(c.challenged_id),
        my_progress: progressMap.get(`${c.id}-${user.id}`) || 0,
        opponent_progress: progressMap.get(`${c.id}-${c.challenger_id === user.id ? c.challenged_id : c.challenger_id}`) || 0
      }));
      
      setChallenges(enriched);
    }
  }, [user]);

  const fetchAchievements = useCallback(async () => {
    if (!user) return;
    
    const { data: allAchievements } = await supabase
      .from('achievements')
      .select('*');
    
    const { data: earned } = await supabase
      .from('user_achievements')
      .select('*, achievements(*)')
      .eq('user_id', user.id);
    
    if (allAchievements) {
      setAchievements(allAchievements as Achievement[]);
    }
    
    if (earned) {
      setUserAchievements(earned.map(e => ({
        ...e,
        achievement: e.achievements as unknown as Achievement
      })));
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      Promise.all([
        fetchUserStats(),
        fetchFriends(),
        fetchChallenges(),
        fetchAchievements()
      ]).finally(() => setLoading(false));
    }
  }, [user, fetchUserStats, fetchFriends, fetchChallenges, fetchAchievements]);

  const searchUsers = async (query: string): Promise<UserProfile[]> => {
    if (!query || query.length < 2) return [];
    
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url')
      .or(`display_name.ilike.%${query}%`)
      .neq('user_id', user?.id || '')
      .limit(10);
    
    if (error) {
      console.error('Error searching users:', error);
      return [];
    }
    
    return (data || []) as UserProfile[];
  };

  const sendFriendRequest = async (friendId: string) => {
    if (!user) return;
    
    const { error } = await supabase
      .from('friendships')
      .insert([{ user_id: user.id, friend_id: friendId }]);
    
    if (error) {
      if (error.code === '23505') {
        toast.error('Vänförfrågan redan skickad');
      } else {
        toast.error('Kunde inte skicka vänförfrågan');
      }
    } else {
      toast.success('Vänförfrågan skickad!');
      fetchFriends();
    }
  };

  const respondToFriendRequest = async (friendshipId: string, accept: boolean) => {
    const { error } = await supabase
      .from('friendships')
      .update({ status: accept ? 'accepted' : 'declined' })
      .eq('id', friendshipId);
    
    if (error) {
      toast.error('Kunde inte svara på förfrågan');
    } else {
      toast.success(accept ? 'Vänförfrågan accepterad!' : 'Vänförfrågan avvisad');
      fetchFriends();
    }
  };

  const removeFriend = async (friendshipId: string) => {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);
    
    if (error) {
      toast.error('Kunde inte ta bort vän');
    } else {
      toast.success('Vän borttagen');
      fetchFriends();
    }
  };

  const createChallenge = async (
    challengedId: string,
    challengeType: 'workouts' | 'sets' | 'minutes',
    targetValue: number,
    durationDays: number
  ) => {
    if (!user) return;
    
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + durationDays);
    
    const { data, error } = await supabase
      .from('challenges')
      .insert([{
        challenger_id: user.id,
        challenged_id: challengedId,
        challenge_type: challengeType,
        target_value: targetValue,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      }])
      .select()
      .single();
    
    if (error) {
      toast.error('Kunde inte skapa utmaning');
    } else if (data) {
      // Create progress entries
      await supabase.from('challenge_progress').insert([
        { challenge_id: data.id, user_id: user.id },
        { challenge_id: data.id, user_id: challengedId }
      ]);
      
      toast.success('Utmaning skapad!');
      fetchChallenges();
    }
  };

  const respondToChallenge = async (challengeId: string, accept: boolean) => {
    const { error } = await supabase
      .from('challenges')
      .update({ status: accept ? 'active' : 'declined' })
      .eq('id', challengeId);
    
    if (error) {
      toast.error('Kunde inte svara på utmaning');
    } else {
      toast.success(accept ? 'Utmaning accepterad!' : 'Utmaning avvisad');
      fetchChallenges();
    }
  };

  const getLevelFromXP = (xp: number) => {
    // XP thresholds for each level
    const thresholds = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 5500];
    for (let i = thresholds.length - 1; i >= 0; i--) {
      if (xp >= thresholds[i]) return i + 1;
    }
    return 1;
  };

  const getXPForNextLevel = (level: number) => {
    const thresholds = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 5500];
    return thresholds[level] || thresholds[thresholds.length - 1] + 1000;
  };

  return {
    friends,
    pendingRequests,
    challenges,
    userStats,
    achievements,
    userAchievements,
    loading,
    searchUsers,
    sendFriendRequest,
    respondToFriendRequest,
    removeFriend,
    createChallenge,
    respondToChallenge,
    fetchChallenges,
    fetchFriends,
    fetchUserStats,
    getLevelFromXP,
    getXPForNextLevel
  };
}