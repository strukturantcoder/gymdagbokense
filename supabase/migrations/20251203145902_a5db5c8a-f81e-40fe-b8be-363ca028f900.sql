-- Function to update community challenge progress for a user
CREATE OR REPLACE FUNCTION public.update_community_challenge_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  participant RECORD;
  challenge RECORD;
  new_value INTEGER;
  user_to_update UUID;
BEGIN
  -- Determine which user to update based on operation
  IF TG_OP = 'DELETE' THEN
    user_to_update := OLD.user_id;
  ELSE
    user_to_update := NEW.user_id;
  END IF;

  -- Loop through all active challenge participations for this user
  FOR participant IN
    SELECT ccp.id, ccp.challenge_id
    FROM community_challenge_participants ccp
    JOIN community_challenges cc ON cc.id = ccp.challenge_id
    WHERE ccp.user_id = user_to_update
      AND cc.is_active = true
      AND cc.start_date <= NOW()
      AND cc.end_date >= NOW()
  LOOP
    -- Get challenge details
    SELECT * INTO challenge FROM community_challenges WHERE id = participant.challenge_id;
    
    -- Calculate new value based on goal_unit
    CASE LOWER(challenge.goal_unit)
      -- Workout count
      WHEN 'träningspass', 'workouts', 'pass' THEN
        SELECT COUNT(*) INTO new_value
        FROM workout_logs
        WHERE user_id = user_to_update
          AND completed_at >= challenge.start_date
          AND completed_at <= challenge.end_date;
      
      -- Total sets
      WHEN 'set', 'sets' THEN
        SELECT COALESCE(SUM(el.sets_completed), 0) INTO new_value
        FROM exercise_logs el
        JOIN workout_logs wl ON wl.id = el.workout_log_id
        WHERE wl.user_id = user_to_update
          AND wl.completed_at >= challenge.start_date
          AND wl.completed_at <= challenge.end_date;
      
      -- Workout minutes
      WHEN 'minuter', 'minutes', 'min' THEN
        SELECT COALESCE(SUM(duration_minutes), 0) INTO new_value
        FROM workout_logs
        WHERE user_id = user_to_update
          AND completed_at >= challenge.start_date
          AND completed_at <= challenge.end_date;
      
      -- Distance (cardio)
      WHEN 'km', 'kilometer' THEN
        SELECT COALESCE(SUM(distance_km), 0)::INTEGER INTO new_value
        FROM cardio_logs
        WHERE user_id = user_to_update
          AND completed_at >= challenge.start_date
          AND completed_at <= challenge.end_date;
      
      -- Cardio sessions
      WHEN 'konditionspass', 'cardio' THEN
        SELECT COUNT(*) INTO new_value
        FROM cardio_logs
        WHERE user_id = user_to_update
          AND completed_at >= challenge.start_date
          AND completed_at <= challenge.end_date;
      
      -- Cardio minutes
      WHEN 'konditionsminuter', 'cardio minutes' THEN
        SELECT COALESCE(SUM(duration_minutes), 0) INTO new_value
        FROM cardio_logs
        WHERE user_id = user_to_update
          AND completed_at >= challenge.start_date
          AND completed_at <= challenge.end_date;
      
      -- Total training (workouts + cardio)
      WHEN 'totalpass', 'total sessions' THEN
        SELECT 
          (SELECT COUNT(*) FROM workout_logs WHERE user_id = user_to_update 
            AND completed_at >= challenge.start_date AND completed_at <= challenge.end_date) +
          (SELECT COUNT(*) FROM cardio_logs WHERE user_id = user_to_update 
            AND completed_at >= challenge.start_date AND completed_at <= challenge.end_date)
        INTO new_value;
      
      ELSE
        -- Default: count workouts
        SELECT COUNT(*) INTO new_value
        FROM workout_logs
        WHERE user_id = user_to_update
          AND completed_at >= challenge.start_date
          AND completed_at <= challenge.end_date;
    END CASE;
    
    -- Update participant's progress
    UPDATE community_challenge_participants
    SET current_value = new_value, updated_at = NOW()
    WHERE id = participant.id;
  END LOOP;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger on workout_logs
CREATE TRIGGER update_challenge_progress_on_workout
AFTER INSERT OR UPDATE OR DELETE ON workout_logs
FOR EACH ROW
EXECUTE FUNCTION update_community_challenge_progress();

-- Trigger on cardio_logs
CREATE TRIGGER update_challenge_progress_on_cardio
AFTER INSERT OR UPDATE OR DELETE ON cardio_logs
FOR EACH ROW
EXECUTE FUNCTION update_community_challenge_progress();