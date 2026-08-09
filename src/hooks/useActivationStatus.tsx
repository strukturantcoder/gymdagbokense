import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/**
 * Tracks how far the current user has come in the activation funnel:
 * how many workouts (strength + cardio) they have logged.
 */
export function useActivationStatus() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [logCount, setLogCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) {
      setLogCount(0);
      setLoading(false);
      return;
    }
    try {
      const [workouts, cardio] = await Promise.all([
        supabase.from('workout_logs').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('cardio_logs').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);
      setLogCount((workouts.count || 0) + (cardio.count || 0));
    } catch (error) {
      console.error('Error loading activation status:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { loading, logCount, hasLoggedWorkout: logCount > 0, refresh };
}
