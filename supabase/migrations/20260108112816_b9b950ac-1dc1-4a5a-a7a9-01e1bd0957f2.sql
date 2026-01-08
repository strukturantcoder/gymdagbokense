-- Add lottery support to community_challenges
ALTER TABLE public.community_challenges 
ADD COLUMN IF NOT EXISTS is_lottery BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS lottery_winner_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS lottery_drawn_at TIMESTAMP WITH TIME ZONE;

-- Create function to draw lottery winner
CREATE OR REPLACE FUNCTION public.draw_community_challenge_lottery(challenge_uuid UUID)
RETURNS TABLE(winner_user_id UUID, winner_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_challenge RECORD;
  v_winner RECORD;
BEGIN
  -- Get challenge details
  SELECT * INTO v_challenge FROM community_challenges WHERE id = challenge_uuid;
  
  IF v_challenge IS NULL THEN
    RAISE EXCEPTION 'Challenge not found';
  END IF;
  
  IF v_challenge.is_lottery = false THEN
    RAISE EXCEPTION 'This is not a lottery challenge';
  END IF;
  
  IF v_challenge.lottery_winner_id IS NOT NULL THEN
    RAISE EXCEPTION 'Lottery has already been drawn';
  END IF;
  
  -- Select random winner from qualified participants
  SELECT ccp.user_id, p.display_name INTO v_winner
  FROM community_challenge_participants ccp
  JOIN profiles p ON p.user_id = ccp.user_id
  WHERE ccp.challenge_id = challenge_uuid
    AND ccp.current_value >= COALESCE(v_challenge.target_value, 0)
  ORDER BY random()
  LIMIT 1;
  
  IF v_winner IS NULL THEN
    RAISE EXCEPTION 'No qualified participants found';
  END IF;
  
  -- Update challenge with winner
  UPDATE community_challenges
  SET lottery_winner_id = v_winner.user_id,
      lottery_drawn_at = NOW()
  WHERE id = challenge_uuid;
  
  -- Notify the winner
  INSERT INTO notifications (user_id, type, title, message, related_id)
  VALUES (
    v_winner.user_id,
    'lottery_won',
    'Du vann utlottningen! 🎉',
    'Grattis! Du drogs som vinnare i utmaningen "' || v_challenge.title || '"!',
    challenge_uuid
  );
  
  RETURN QUERY SELECT v_winner.user_id, v_winner.display_name;
END;
$$;

-- Create function to get qualified participants for lottery
CREATE OR REPLACE FUNCTION public.get_lottery_qualified_participants(challenge_uuid UUID)
RETURNS TABLE(user_id UUID, display_name TEXT, avatar_url TEXT, current_value INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_target INTEGER;
BEGIN
  SELECT target_value INTO v_target FROM community_challenges WHERE id = challenge_uuid;
  
  RETURN QUERY
  SELECT 
    ccp.user_id,
    CASE 
      WHEN ccp.user_id = auth.uid() THEN p.display_name
      ELSE public.abbreviate_name(p.display_name)
    END as display_name,
    p.avatar_url,
    ccp.current_value
  FROM community_challenge_participants ccp
  JOIN profiles p ON p.user_id = ccp.user_id
  WHERE ccp.challenge_id = challenge_uuid
    AND ccp.current_value >= COALESCE(v_target, 0)
  ORDER BY ccp.current_value DESC;
END;
$$;