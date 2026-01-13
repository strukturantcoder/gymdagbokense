-- Fix security vulnerability: claim_daily_bonus should use auth.uid() directly
-- instead of accepting user_id as a parameter to prevent privilege escalation

CREATE OR REPLACE FUNCTION public.claim_daily_bonus()
RETURNS TABLE(xp_earned INTEGER, new_streak INTEGER, is_new_day BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_last_activity DATE;
  v_current_streak INTEGER;
  v_daily_claimed DATE;
  v_today DATE := CURRENT_DATE;
  v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
  v_new_streak INTEGER;
  v_xp INTEGER;
BEGIN
  -- Require authentication
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated to claim daily bonus';
  END IF;

  -- Get current user stats
  SELECT last_activity_date, current_streak, daily_bonus_claimed_at
  INTO v_last_activity, v_current_streak, v_daily_claimed
  FROM user_stats
  WHERE user_id = v_user_id;
  
  -- If no stats exist, create them
  IF NOT FOUND THEN
    INSERT INTO user_stats (user_id, current_streak, longest_streak, last_activity_date, daily_bonus_claimed_at, total_xp)
    VALUES (v_user_id, 1, 1, v_today, v_today, 15)
    RETURNING current_streak INTO v_new_streak;
    
    RETURN QUERY SELECT 15::INTEGER, 1::INTEGER, TRUE;
    RETURN;
  END IF;
  
  -- Check if already claimed today
  IF v_daily_claimed = v_today THEN
    RETURN QUERY SELECT 0::INTEGER, v_current_streak::INTEGER, FALSE;
    RETURN;
  END IF;
  
  -- Calculate new streak
  IF v_last_activity = v_yesterday OR v_last_activity = v_today THEN
    v_new_streak := COALESCE(v_current_streak, 0) + 1;
  ELSE
    v_new_streak := 1;
  END IF;
  
  -- Calculate XP bonus (10 base + 5 per streak day, max 60)
  v_xp := 10 + LEAST(v_new_streak * 5, 50);
  
  -- Update user stats
  UPDATE user_stats
  SET 
    current_streak = v_new_streak,
    longest_streak = GREATEST(longest_streak, v_new_streak),
    last_activity_date = v_today,
    daily_bonus_claimed_at = v_today,
    total_xp = COALESCE(total_xp, 0) + v_xp,
    updated_at = now()
  WHERE user_id = v_user_id;
  
  RETURN QUERY SELECT v_xp::INTEGER, v_new_streak::INTEGER, TRUE;
END;
$$;