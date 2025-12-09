-- Drop existing trigger on exercise_logs that's causing the error
DROP TRIGGER IF EXISTS update_challenge_progress_on_exercise ON exercise_logs;

-- Create a separate trigger function for exercise_logs that gets user_id from workout_logs
CREATE OR REPLACE FUNCTION public.update_friend_challenge_progress_from_exercise()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_challenge RECORD;
  v_current_value INTEGER;
  v_period_start TIMESTAMP WITH TIME ZONE;
  v_workout_log_id UUID;
BEGIN
  -- Get the workout_log_id based on operation
  IF TG_OP = 'DELETE' THEN
    v_workout_log_id := OLD.workout_log_id;
  ELSE
    v_workout_log_id := NEW.workout_log_id;
  END IF;

  -- Get user_id from workout_logs table
  SELECT user_id INTO v_user_id
  FROM workout_logs
  WHERE id = v_workout_log_id;

  -- If we couldn't find the user, exit
  IF v_user_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  -- Loop through all active challenges where this user is a participant
  FOR v_challenge IN
    SELECT c.id, c.challenge_type, c.start_date, c.end_date
    FROM challenges c
    WHERE c.status = 'active'
      AND (c.challenger_id = v_user_id OR c.challenged_id = v_user_id)
      AND c.end_date > now()
  LOOP
    v_period_start := v_challenge.start_date;
    v_current_value := 0;

    -- Calculate current value based on challenge type
    IF v_challenge.challenge_type = 'workouts' THEN
      SELECT COUNT(*)::INTEGER INTO v_current_value
      FROM workout_logs wl
      WHERE wl.user_id = v_user_id
        AND wl.completed_at >= v_period_start
        AND wl.completed_at <= v_challenge.end_date;
    
    ELSIF v_challenge.challenge_type = 'sets' THEN
      SELECT COALESCE(SUM(el.sets_completed), 0)::INTEGER INTO v_current_value
      FROM exercise_logs el
      JOIN workout_logs wl ON wl.id = el.workout_log_id
      WHERE wl.user_id = v_user_id
        AND wl.completed_at >= v_period_start
        AND wl.completed_at <= v_challenge.end_date;
    
    ELSIF v_challenge.challenge_type = 'minutes' THEN
      SELECT COALESCE(SUM(wl.duration_minutes), 0)::INTEGER INTO v_current_value
      FROM workout_logs wl
      WHERE wl.user_id = v_user_id
        AND wl.completed_at >= v_period_start
        AND wl.completed_at <= v_challenge.end_date;
    END IF;

    -- Upsert the progress
    INSERT INTO challenge_progress (challenge_id, user_id, current_value, updated_at)
    VALUES (v_challenge.id, v_user_id, v_current_value, now())
    ON CONFLICT (challenge_id, user_id) 
    DO UPDATE SET current_value = v_current_value, updated_at = now();
  END LOOP;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;

-- Create trigger on exercise_logs using the new function
CREATE TRIGGER update_challenge_progress_on_exercise
AFTER INSERT OR UPDATE OR DELETE ON exercise_logs
FOR EACH ROW
EXECUTE FUNCTION update_friend_challenge_progress_from_exercise();