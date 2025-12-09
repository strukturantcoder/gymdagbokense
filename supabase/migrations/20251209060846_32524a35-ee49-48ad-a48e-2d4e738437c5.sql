-- Drop the problematic triggers that reference user_id on exercise_logs
DROP TRIGGER IF EXISTS update_friend_challenge_on_exercise ON exercise_logs;
DROP TRIGGER IF EXISTS update_pool_progress_on_exercise ON exercise_logs;

-- Create new trigger function for pool challenge progress from exercise_logs
CREATE OR REPLACE FUNCTION public.update_pool_challenge_progress_from_exercise()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_challenge RECORD;
  v_current_value INTEGER;
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

  -- Loop through active pool challenges where this user is a participant
  FOR v_challenge IN
    SELECT pc.id, pc.challenge_type, pc.start_date, pc.end_date
    FROM pool_challenges pc
    JOIN pool_challenge_participants pcp ON pcp.challenge_id = pc.id
    WHERE pc.status = 'active'
      AND pcp.user_id = v_user_id
      AND pc.end_date > now()
  LOOP
    v_current_value := 0;

    -- Calculate current value based on challenge type
    IF v_challenge.challenge_type = 'workouts' THEN
      SELECT COUNT(*)::INTEGER INTO v_current_value
      FROM workout_logs wl
      WHERE wl.user_id = v_user_id
        AND wl.completed_at >= v_challenge.start_date
        AND wl.completed_at <= v_challenge.end_date;
    
    ELSIF v_challenge.challenge_type = 'sets' THEN
      SELECT COALESCE(SUM(el.sets_completed), 0)::INTEGER INTO v_current_value
      FROM exercise_logs el
      JOIN workout_logs wl ON wl.id = el.workout_log_id
      WHERE wl.user_id = v_user_id
        AND wl.completed_at >= v_challenge.start_date
        AND wl.completed_at <= v_challenge.end_date;
    
    ELSIF v_challenge.challenge_type = 'minutes' THEN
      SELECT COALESCE(SUM(wl.duration_minutes), 0)::INTEGER INTO v_current_value
      FROM workout_logs wl
      WHERE wl.user_id = v_user_id
        AND wl.completed_at >= v_challenge.start_date
        AND wl.completed_at <= v_challenge.end_date;
    END IF;

    -- Update the participant's progress
    UPDATE pool_challenge_participants
    SET current_value = v_current_value, updated_at = now()
    WHERE challenge_id = v_challenge.id AND user_id = v_user_id;
  END LOOP;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;

-- Recreate pool challenge trigger with new function
CREATE TRIGGER update_pool_progress_on_exercise
AFTER INSERT OR UPDATE OR DELETE ON exercise_logs
FOR EACH ROW
EXECUTE FUNCTION update_pool_challenge_progress_from_exercise();