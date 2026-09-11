import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { flushPendingWorkout, hasPendingWorkout } from '@/lib/pendingWorkout';

/**
 * Saves a workout that was logged while signed out, once the user is signed in.
 * Runs once per mount and stays silent if the write fails — the workout is kept
 * in localStorage and retried next time.
 */
export function usePendingWorkoutSync(onSynced?: () => void) {
  const { user } = useAuth();
  const ran = useRef(false);

  useEffect(() => {
    if (!user?.id || ran.current) return;
    if (!hasPendingWorkout()) return;
    ran.current = true;
    flushPendingWorkout(user.id).then((saved) => {
      if (saved) onSynced?.();
    });
  }, [user?.id, onSynced]);
}
