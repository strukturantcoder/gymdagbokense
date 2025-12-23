-- Add streak tracking columns to user_stats table
ALTER TABLE public.user_stats 
ADD COLUMN IF NOT EXISTS current_streak INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_streak INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_activity_date DATE,
ADD COLUMN IF NOT EXISTS daily_bonus_claimed_at DATE;

-- Create function to claim daily bonus and update streak
CREATE OR REPLACE FUNCTION public.claim_daily_bonus(p_user_id UUID)
RETURNS TABLE(xp_earned INTEGER, new_streak INTEGER, is_new_day BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_last_activity DATE;
  v_today DATE := CURRENT_DATE;
  v_current_streak INTEGER;
  v_xp_bonus INTEGER;
  v_is_new_day BOOLEAN := FALSE;
  v_daily_claimed DATE;
BEGIN
  -- Get current user stats
  SELECT last_activity_date, current_streak, daily_bonus_claimed_at
  INTO v_last_activity, v_current_streak, v_daily_claimed
  FROM user_stats
  WHERE user_id = p_user_id;

  -- Check if daily bonus already claimed today
  IF v_daily_claimed = v_today THEN
    RETURN QUERY SELECT 0::INTEGER, v_current_streak, FALSE;
    RETURN;
  END IF;

  v_is_new_day := TRUE;

  -- Calculate streak
  IF v_last_activity IS NULL THEN
    -- First activity ever
    v_current_streak := 1;
  ELSIF v_last_activity = v_today - INTERVAL '1 day' THEN
    -- Consecutive day
    v_current_streak := v_current_streak + 1;
  ELSIF v_last_activity = v_today THEN
    -- Same day, keep streak
    NULL;
  ELSE
    -- Streak broken
    v_current_streak := 1;
  END IF;

  -- Calculate XP bonus based on streak (base 10 XP + 5 XP per streak day, max 50 bonus)
  v_xp_bonus := 10 + LEAST(v_current_streak * 5, 50);

  -- Update user stats
  UPDATE user_stats
  SET 
    current_streak = v_current_streak,
    longest_streak = GREATEST(longest_streak, v_current_streak),
    last_activity_date = v_today,
    daily_bonus_claimed_at = v_today,
    total_xp = total_xp + v_xp_bonus,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN QUERY SELECT v_xp_bonus, v_current_streak, v_is_new_day;
END;
$$;