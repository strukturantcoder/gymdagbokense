-- Create function to get streak leaderboard with abbreviated names for privacy
CREATE OR REPLACE FUNCTION public.get_streak_leaderboard(limit_count INTEGER DEFAULT 10)
RETURNS TABLE(
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  current_streak INTEGER,
  longest_streak INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    us.user_id,
    CASE 
      WHEN us.user_id = auth.uid() THEN p.display_name
      ELSE public.abbreviate_name(p.display_name)
    END as display_name,
    p.avatar_url,
    us.current_streak,
    us.longest_streak
  FROM user_stats us
  JOIN profiles p ON p.user_id = us.user_id
  WHERE us.current_streak > 0
  ORDER BY us.current_streak DESC, us.longest_streak DESC
  LIMIT limit_count;
END;
$$;