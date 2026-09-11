import { supabase } from '@/integrations/supabase/client';

export const PENDING_WORKOUT_KEY = 'gd_pending_workout';

export interface PendingWorkoutSet {
  reps: number;
  weight: number;
}

export interface PendingWorkoutExercise {
  name: string;
  sets: PendingWorkoutSet[];
}

export interface PendingWorkout {
  name: string;
  focus: string;
  durationMinutes: number;
  timestamp: string;
  exercises: PendingWorkoutExercise[];
}

export function savePendingWorkout(workout: PendingWorkout) {
  try {
    localStorage.setItem(PENDING_WORKOUT_KEY, JSON.stringify(workout));
  } catch (error) {
    console.error('Could not store pending workout', error);
  }
}

export function hasPendingWorkout(): boolean {
  try {
    return !!localStorage.getItem(PENDING_WORKOUT_KEY);
  } catch {
    return false;
  }
}

function readPendingWorkout(): PendingWorkout | null {
  try {
    const raw = localStorage.getItem(PENDING_WORKOUT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingWorkout;
    if (!parsed?.name || !Array.isArray(parsed.exercises)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Writes a workout logged while signed out into the database.
 * The key is removed before the write and only restored if the write fails,
 * so a reload can never create two workouts.
 */
export async function flushPendingWorkout(userId: string): Promise<boolean> {
  const pending = readPendingWorkout();
  if (!pending) return false;

  // Remove first: idempotency beats a lost write, which we retry by restoring below.
  try {
    localStorage.removeItem(PENDING_WORKOUT_KEY);
  } catch {
    /* ignore */
  }

  try {
    const durationMinutes = pending.durationMinutes || 0;
    const totalSets = pending.exercises.reduce((acc, e) => acc + e.sets.length, 0);

    const { data: workoutLog, error: workoutError } = await supabase
      .from('workout_logs')
      .insert({
        user_id: userId,
        workout_day: pending.name,
        duration_minutes: durationMinutes,
        notes: `Spontan-pass: ${pending.focus}`,
      })
      .select()
      .single();

    if (workoutError) throw workoutError;

    const exerciseLogsToInsert = pending.exercises
      .filter((e) => e.sets.length > 0)
      .map((e) => {
        const avgWeight = e.sets.reduce((sum, s) => sum + (s.weight || 0), 0) / e.sets.length;
        return {
          workout_log_id: workoutLog.id,
          exercise_name: e.name,
          sets_completed: e.sets.length,
          reps_completed: e.sets.map((s) => s.reps).join(', '),
          weight_kg: avgWeight || null,
          set_details: e.sets.map((s, i) => ({ set: i + 1, reps: s.reps, weight: s.weight })),
        };
      });

    if (exerciseLogsToInsert.length > 0) {
      const { error: exerciseError } = await supabase.from('exercise_logs').insert(exerciseLogsToInsert);
      if (exerciseError) throw exerciseError;
    }

    const { data: stats } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (stats) {
      await supabase
        .from('user_stats')
        .update({
          total_workouts: stats.total_workouts + 1,
          total_minutes: stats.total_minutes + durationMinutes,
          total_sets: stats.total_sets + totalSets,
          total_xp: stats.total_xp + 50 + totalSets * 5,
          last_activity_date: new Date().toISOString(),
        })
        .eq('user_id', userId);
    }

    return true;
  } catch (error) {
    console.error('Could not save pending workout', error);
    try {
      localStorage.setItem(PENDING_WORKOUT_KEY, JSON.stringify(pending));
    } catch {
      /* ignore */
    }
    return false;
  }
}
