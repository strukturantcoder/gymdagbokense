
-- Trigger function to deduct XP when workout_logs are deleted
CREATE OR REPLACE FUNCTION public.deduct_xp_on_workout_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Deduct 50 XP for deleted workout
  UPDATE user_stats
  SET total_xp = GREATEST(0, total_xp - 50),
      total_workouts = GREATEST(0, total_workouts - 1),
      total_minutes = GREATEST(0, total_minutes - COALESCE(OLD.duration_minutes, 0)),
      updated_at = NOW()
  WHERE user_id = OLD.user_id;
  
  RETURN OLD;
END;
$$;

-- Trigger function to deduct XP when cardio_logs are deleted
CREATE OR REPLACE FUNCTION public.deduct_xp_on_cardio_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  xp_to_deduct INTEGER;
BEGIN
  -- Calculate XP: 2 XP per minute + 10 XP per km
  xp_to_deduct := (2 * COALESCE(OLD.duration_minutes, 0)) + (10 * COALESCE(OLD.distance_km, 0))::INTEGER;
  
  UPDATE user_stats
  SET total_xp = GREATEST(0, total_xp - xp_to_deduct),
      total_cardio_sessions = GREATEST(0, total_cardio_sessions - 1),
      total_cardio_minutes = GREATEST(0, total_cardio_minutes - COALESCE(OLD.duration_minutes, 0)),
      total_cardio_distance_km = GREATEST(0, total_cardio_distance_km - COALESCE(OLD.distance_km, 0)),
      updated_at = NOW()
  WHERE user_id = OLD.user_id;
  
  RETURN OLD;
END;
$$;

-- Trigger function to deduct XP when wod_logs are deleted
CREATE OR REPLACE FUNCTION public.deduct_xp_on_wod_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Deduct 50 XP for deleted WOD
  UPDATE user_stats
  SET total_xp = GREATEST(0, total_xp - 50),
      updated_at = NOW()
  WHERE user_id = OLD.user_id;
  
  RETURN OLD;
END;
$$;

-- Create triggers
CREATE TRIGGER deduct_xp_on_workout_log_delete
  BEFORE DELETE ON workout_logs
  FOR EACH ROW
  EXECUTE FUNCTION deduct_xp_on_workout_delete();

CREATE TRIGGER deduct_xp_on_cardio_log_delete
  BEFORE DELETE ON cardio_logs
  FOR EACH ROW
  EXECUTE FUNCTION deduct_xp_on_cardio_delete();

CREATE TRIGGER deduct_xp_on_wod_log_delete
  BEFORE DELETE ON wod_logs
  FOR EACH ROW
  EXECUTE FUNCTION deduct_xp_on_wod_delete();
