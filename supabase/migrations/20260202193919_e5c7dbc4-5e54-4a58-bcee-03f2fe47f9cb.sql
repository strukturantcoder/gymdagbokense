-- Create function to check and award achievements when user_stats are updated
CREATE OR REPLACE FUNCTION public.check_achievements_on_stats_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  achievement_record RECORD;
  current_value INTEGER;
  friend_count INTEGER;
  challenges_won_count INTEGER;
BEGIN
  -- Get friend count for 'friends' achievement type
  SELECT COUNT(*) INTO friend_count
  FROM friendships
  WHERE (user_id = NEW.user_id OR friend_id = NEW.user_id)
    AND status = 'accepted';

  -- Get challenges won count
  SELECT COUNT(*) INTO challenges_won_count
  FROM challenges
  WHERE winner_id = NEW.user_id;

  -- Loop through all achievements the user hasn't earned yet
  FOR achievement_record IN
    SELECT a.*
    FROM achievements a
    WHERE NOT EXISTS (
      SELECT 1 FROM user_achievements ua
      WHERE ua.user_id = NEW.user_id
        AND ua.achievement_id = a.id
    )
  LOOP
    -- Determine current value based on requirement type
    CASE achievement_record.requirement_type
      WHEN 'workouts', 'total_workouts' THEN
        current_value := COALESCE(NEW.total_workouts, 0);
      WHEN 'sets', 'total_sets' THEN
        current_value := COALESCE(NEW.total_sets, 0);
      WHEN 'minutes', 'total_minutes' THEN
        current_value := COALESCE(NEW.total_minutes, 0);
      WHEN 'cardio_sessions', 'total_cardio_sessions' THEN
        current_value := COALESCE(NEW.total_cardio_sessions, 0);
      WHEN 'cardio_minutes', 'total_cardio_minutes' THEN
        current_value := COALESCE(NEW.total_cardio_minutes, 0);
      WHEN 'cardio_distance', 'total_cardio_distance_km' THEN
        current_value := COALESCE(NEW.total_cardio_distance_km::INTEGER, 0);
      WHEN 'friends' THEN
        current_value := friend_count;
      WHEN 'challenges_won' THEN
        current_value := challenges_won_count;
      ELSE
        current_value := 0;
    END CASE;

    -- Check if user meets the requirement
    IF current_value >= achievement_record.requirement_value THEN
      -- Award the achievement
      INSERT INTO user_achievements (user_id, achievement_id)
      VALUES (NEW.user_id, achievement_record.id)
      ON CONFLICT DO NOTHING;

      -- Award XP for the achievement
      UPDATE user_stats
      SET total_xp = total_xp + achievement_record.xp_reward
      WHERE user_id = NEW.user_id;

      -- Create notification for the user
      INSERT INTO notifications (user_id, type, title, message, related_id)
      VALUES (
        NEW.user_id,
        'achievement',
        'Ny prestation!',
        'Du har låst upp: ' || achievement_record.name || ' (+' || achievement_record.xp_reward || ' XP)',
        achievement_record.id
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create trigger on user_stats updates
DROP TRIGGER IF EXISTS trigger_check_achievements ON user_stats;

CREATE TRIGGER trigger_check_achievements
  AFTER INSERT OR UPDATE ON user_stats
  FOR EACH ROW
  EXECUTE FUNCTION check_achievements_on_stats_update();

-- Also run a one-time check for all existing users to award any missing achievements
-- This will catch up users who should have earned achievements from Garmin syncs
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT * FROM user_stats
  LOOP
    -- Trigger the achievement check by doing a no-op update
    UPDATE user_stats
    SET updated_at = NOW()
    WHERE user_id = user_record.user_id;
  END LOOP;
END;
$$;