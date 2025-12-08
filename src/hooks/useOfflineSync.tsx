import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PendingWorkoutLog {
  type: 'workout';
  id: string;
  data: {
    user_id: string;
    workout_day: string;
    program_id?: string;
    duration_minutes?: number;
    notes?: string;
    completed_at: string;
  };
  exercises: Array<{
    exercise_name: string;
    sets_completed: number;
    reps_completed: string;
    weight_kg?: number;
    notes?: string;
    set_details?: any;
  }>;
  createdAt: number;
}

interface PendingCardioLog {
  type: 'cardio';
  id: string;
  data: {
    user_id: string;
    activity_type: string;
    duration_minutes: number;
    distance_km?: number;
    calories_burned?: number;
    notes?: string;
    completed_at: string;
  };
  routeData?: {
    route_data: any;
    total_distance_km: number;
    average_speed_kmh: number;
    max_speed_kmh: number;
  };
  createdAt: number;
}

interface PendingWodLog {
  type: 'wod';
  id: string;
  data: {
    user_id: string;
    wod_name: string;
    wod_format: string;
    wod_duration: string;
    wod_exercises: any;
    completion_time?: string;
    rounds_completed?: number;
    reps_completed?: number;
    notes?: string;
    completed_at: string;
  };
  createdAt: number;
}

type PendingLog = PendingWorkoutLog | PendingCardioLog | PendingWodLog;

type PendingLogInput = 
  | Omit<PendingWorkoutLog, 'createdAt'>
  | Omit<PendingCardioLog, 'createdAt'>
  | Omit<PendingWodLog, 'createdAt'>;

const STORAGE_KEY = 'gymdagboken_pending_logs';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingLogs, setPendingLogs] = useState<PendingLog[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load pending logs from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setPendingLogs(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse pending logs:', e);
      }
    }
  }, []);

  // Save pending logs to localStorage
  const savePendingLogs = useCallback((logs: PendingLog[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    setPendingLogs(logs);
  }, []);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Anslutning återställd');
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Ingen anslutning - loggar sparas lokalt');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync pending logs when back online
  const syncPendingLogs = useCallback(async () => {
    if (pendingLogs.length === 0 || isSyncing) return;
    
    setIsSyncing(true);
    const failedLogs: PendingLog[] = [];
    let successCount = 0;

    for (const log of pendingLogs) {
      try {
        if (log.type === 'workout') {
          const workoutLog = log as PendingWorkoutLog;
          
          // Insert workout log
          const { data: insertedLog, error: logError } = await supabase
            .from('workout_logs')
            .insert(workoutLog.data)
            .select()
            .single();

          if (logError) throw logError;

          // Insert exercise logs
          if (insertedLog && workoutLog.exercises.length > 0) {
            const exerciseLogsToInsert = workoutLog.exercises.map(ex => ({
              ...ex,
              workout_log_id: insertedLog.id
            }));

            const { error: exError } = await supabase
              .from('exercise_logs')
              .insert(exerciseLogsToInsert);

            if (exError) throw exError;
          }

          // Update user stats
          const totalSets = workoutLog.exercises.reduce((sum, ex) => sum + ex.sets_completed, 0);
          const durationMins = workoutLog.data.duration_minutes || 0;
          const xpEarned = 50 + totalSets * 2 + Math.floor(durationMins / 5);

          const { data: currentStats } = await supabase
            .from('user_stats')
            .select('*')
            .eq('user_id', workoutLog.data.user_id)
            .maybeSingle();

          if (currentStats) {
            await supabase
              .from('user_stats')
              .update({
                total_workouts: currentStats.total_workouts + 1,
                total_sets: currentStats.total_sets + totalSets,
                total_minutes: currentStats.total_minutes + durationMins,
                total_xp: currentStats.total_xp + xpEarned,
                level: Math.floor((currentStats.total_xp + xpEarned) / 1000) + 1,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', workoutLog.data.user_id);
          }

          successCount++;

        } else if (log.type === 'cardio') {
          const cardioLog = log as PendingCardioLog;
          
          const { data: insertedLog, error: logError } = await supabase
            .from('cardio_logs')
            .insert(cardioLog.data)
            .select()
            .single();

          if (logError) throw logError;

          // Insert route data if available
          if (insertedLog && cardioLog.routeData) {
            await supabase
              .from('cardio_routes')
              .insert({
                cardio_log_id: insertedLog.id,
                user_id: cardioLog.data.user_id,
                ...cardioLog.routeData
              });
          }

          // Update user stats
          const xpEarned = Math.floor(cardioLog.data.duration_minutes * 2) + 
            Math.floor((cardioLog.data.distance_km || 0) * 10);

          const { data: currentStats } = await supabase
            .from('user_stats')
            .select('*')
            .eq('user_id', cardioLog.data.user_id)
            .maybeSingle();

          if (currentStats) {
            await supabase
              .from('user_stats')
              .update({
                total_cardio_sessions: currentStats.total_cardio_sessions + 1,
                total_cardio_minutes: currentStats.total_cardio_minutes + cardioLog.data.duration_minutes,
                total_cardio_distance_km: currentStats.total_cardio_distance_km + (cardioLog.data.distance_km || 0),
                total_xp: currentStats.total_xp + xpEarned,
                level: Math.floor((currentStats.total_xp + xpEarned) / 1000) + 1,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', cardioLog.data.user_id);
          }

          successCount++;

        } else if (log.type === 'wod') {
          const wodLog = log as PendingWodLog;
          
          const { error: logError } = await supabase
            .from('wod_logs')
            .insert(wodLog.data);

          if (logError) throw logError;

          // Update user stats with XP
          const xpEarned = 50;
          const { data: currentStats } = await supabase
            .from('user_stats')
            .select('*')
            .eq('user_id', wodLog.data.user_id)
            .maybeSingle();

          if (currentStats) {
            await supabase
              .from('user_stats')
              .update({
                total_xp: currentStats.total_xp + xpEarned,
                level: Math.floor((currentStats.total_xp + xpEarned) / 1000) + 1,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', wodLog.data.user_id);
          }

          successCount++;
        }
      } catch (error) {
        console.error('Failed to sync log:', error);
        failedLogs.push(log);
      }
    }

    savePendingLogs(failedLogs);
    setIsSyncing(false);

    if (successCount > 0) {
      toast.success(`${successCount} logg(ar) synkroniserade!`);
    }
    if (failedLogs.length > 0) {
      toast.error(`${failedLogs.length} logg(ar) kunde inte synkroniseras`);
    }
  }, [pendingLogs, isSyncing, savePendingLogs]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingLogs.length > 0) {
      syncPendingLogs();
    }
  }, [isOnline, pendingLogs.length, syncPendingLogs]);

  // Add a pending log
  const addPendingLog = useCallback((log: PendingLogInput) => {
    const newLog = { ...log, createdAt: Date.now() } as PendingLog;
    const updated = [...pendingLogs, newLog];
    savePendingLogs(updated);
    toast.info('Logg sparad offline - synkas automatiskt');
  }, [pendingLogs, savePendingLogs]);

  // Clear a specific pending log
  const clearPendingLog = useCallback((id: string) => {
    const updated = pendingLogs.filter(log => log.id !== id);
    savePendingLogs(updated);
  }, [pendingLogs, savePendingLogs]);

  return {
    isOnline,
    pendingLogs,
    pendingCount: pendingLogs.length,
    isSyncing,
    addPendingLog,
    clearPendingLog,
    syncPendingLogs
  };
}
