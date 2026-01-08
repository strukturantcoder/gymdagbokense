-- Trigger function to update community challenge progress when workout is logged
CREATE OR REPLACE FUNCTION public.update_community_challenge_progress()
RETURNS TRIGGER AS $$
DECLARE
  v_challenge RECORD;
BEGIN
  -- Find all active community challenges the user is participating in
  FOR v_challenge IN
    SELECT ccp.id as participant_id, cc.id as challenge_id, cc.goal_unit, cc.start_date, cc.end_date
    FROM community_challenge_participants ccp
    JOIN community_challenges cc ON ccp.challenge_id = cc.id
    WHERE ccp.user_id = NEW.user_id
      AND cc.is_active = true
      AND NOW() >= cc.start_date
      AND NOW() <= cc.end_date
  LOOP
    -- Update based on goal_unit type
    IF v_challenge.goal_unit IN ('pass', 'träningspass', 'workouts') THEN
      -- Count workouts completed during challenge period
      UPDATE community_challenge_participants
      SET current_value = (
        SELECT COUNT(*)
        FROM workout_logs wl
        WHERE wl.user_id = NEW.user_id
          AND wl.completed_at >= v_challenge.start_date
          AND wl.completed_at <= v_challenge.end_date
      ),
      updated_at = NOW()
      WHERE id = v_challenge.participant_id;
    ELSIF v_challenge.goal_unit IN ('minuter', 'minutes', 'min') THEN
      -- Sum duration
      UPDATE community_challenge_participants
      SET current_value = COALESCE((
        SELECT SUM(duration_minutes)
        FROM workout_logs wl
        WHERE wl.user_id = NEW.user_id
          AND wl.completed_at >= v_challenge.start_date
          AND wl.completed_at <= v_challenge.end_date
      ), 0),
      updated_at = NOW()
      WHERE id = v_challenge.participant_id;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on workout_logs
DROP TRIGGER IF EXISTS trigger_update_community_challenge_on_workout ON workout_logs;
CREATE TRIGGER trigger_update_community_challenge_on_workout
AFTER INSERT ON workout_logs
FOR EACH ROW
EXECUTE FUNCTION update_community_challenge_progress();

-- Also trigger on cardio_logs
CREATE OR REPLACE FUNCTION public.update_community_challenge_progress_cardio()
RETURNS TRIGGER AS $$
DECLARE
  v_challenge RECORD;
BEGIN
  -- Find all active community challenges the user is participating in
  FOR v_challenge IN
    SELECT ccp.id as participant_id, cc.id as challenge_id, cc.goal_unit, cc.start_date, cc.end_date
    FROM community_challenge_participants ccp
    JOIN community_challenges cc ON ccp.challenge_id = cc.id
    WHERE ccp.user_id = NEW.user_id
      AND cc.is_active = true
      AND NOW() >= cc.start_date
      AND NOW() <= cc.end_date
  LOOP
    -- Only update for cardio-specific goals
    IF v_challenge.goal_unit IN ('km', 'kilometer', 'distance') THEN
      UPDATE community_challenge_participants
      SET current_value = COALESCE((
        SELECT SUM(distance_km)
        FROM cardio_logs cl
        WHERE cl.user_id = NEW.user_id
          AND cl.completed_at >= v_challenge.start_date
          AND cl.completed_at <= v_challenge.end_date
      ), 0),
      updated_at = NOW()
      WHERE id = v_challenge.participant_id;
    ELSIF v_challenge.goal_unit IN ('pass', 'träningspass', 'workouts') THEN
      -- Also count cardio as workouts
      UPDATE community_challenge_participants
      SET current_value = (
        SELECT 
          (SELECT COUNT(*) FROM workout_logs wl WHERE wl.user_id = NEW.user_id AND wl.completed_at >= v_challenge.start_date AND wl.completed_at <= v_challenge.end_date)
          + (SELECT COUNT(*) FROM cardio_logs cl WHERE cl.user_id = NEW.user_id AND cl.completed_at >= v_challenge.start_date AND cl.completed_at <= v_challenge.end_date)
      ),
      updated_at = NOW()
      WHERE id = v_challenge.participant_id;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_update_community_challenge_on_cardio ON cardio_logs;
CREATE TRIGGER trigger_update_community_challenge_on_cardio
AFTER INSERT ON cardio_logs
FOR EACH ROW
EXECUTE FUNCTION update_community_challenge_progress_cardio();

-- Function to auto-enroll user in all active community challenges
CREATE OR REPLACE FUNCTION public.auto_enroll_user_in_community_challenges()
RETURNS TRIGGER AS $$
DECLARE
  v_challenge RECORD;
BEGIN
  -- Find all active community challenges user is NOT already enrolled in
  FOR v_challenge IN
    SELECT cc.id
    FROM community_challenges cc
    WHERE cc.is_active = true
      AND NOW() <= cc.end_date
      AND NOT EXISTS (
        SELECT 1 FROM community_challenge_participants ccp 
        WHERE ccp.challenge_id = cc.id AND ccp.user_id = NEW.user_id
      )
  LOOP
    INSERT INTO community_challenge_participants (challenge_id, user_id, current_value)
    VALUES (v_challenge.id, NEW.user_id, 0);
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger on profiles table - when new profile is created (after user registration)
DROP TRIGGER IF EXISTS trigger_auto_enroll_on_profile_create ON profiles;
CREATE TRIGGER trigger_auto_enroll_on_profile_create
AFTER INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION auto_enroll_user_in_community_challenges();

-- Trigger on user_stats - when user logs in and stats are updated/created
DROP TRIGGER IF EXISTS trigger_auto_enroll_on_user_stats ON user_stats;
CREATE TRIGGER trigger_auto_enroll_on_user_stats
AFTER INSERT OR UPDATE ON user_stats
FOR EACH ROW
EXECUTE FUNCTION auto_enroll_user_in_community_challenges();

-- Manually update existing participants to correct values (one-time fix)
UPDATE community_challenge_participants ccp
SET current_value = (
  SELECT COUNT(*)
  FROM workout_logs wl
  JOIN community_challenges cc ON cc.id = ccp.challenge_id
  WHERE wl.user_id = ccp.user_id
    AND wl.completed_at >= cc.start_date
    AND wl.completed_at <= cc.end_date
)
WHERE EXISTS (
  SELECT 1 FROM community_challenges cc 
  WHERE cc.id = ccp.challenge_id 
    AND cc.goal_unit IN ('pass', 'träningspass', 'workouts')
);