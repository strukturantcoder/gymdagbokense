-- Create function to complete ended challenges and notify participants
CREATE OR REPLACE FUNCTION public.complete_friend_challenges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  challenge RECORD;
  challenger_value INTEGER;
  challenged_value INTEGER;
  winner UUID;
  challenger_name TEXT;
  challenged_name TEXT;
BEGIN
  -- Find all active challenges that have ended
  FOR challenge IN
    SELECT * FROM challenges
    WHERE status = 'active'
      AND end_date < NOW()
  LOOP
    -- Get progress for both participants
    SELECT COALESCE(current_value, 0) INTO challenger_value
    FROM challenge_progress
    WHERE challenge_id = challenge.id AND user_id = challenge.challenger_id;
    
    SELECT COALESCE(current_value, 0) INTO challenged_value
    FROM challenge_progress
    WHERE challenge_id = challenge.id AND user_id = challenge.challenged_id;
    
    -- Determine winner
    IF challenger_value > challenged_value THEN
      winner := challenge.challenger_id;
    ELSIF challenged_value > challenger_value THEN
      winner := challenge.challenged_id;
    ELSE
      winner := NULL; -- Draw
    END IF;
    
    -- Update challenge status
    UPDATE challenges
    SET status = 'completed', winner_id = winner
    WHERE id = challenge.id;
    
    -- Get display names
    SELECT display_name INTO challenger_name FROM profiles WHERE user_id = challenge.challenger_id;
    SELECT display_name INTO challenged_name FROM profiles WHERE user_id = challenge.challenged_id;
    
    -- Notify challenger
    IF winner = challenge.challenger_id THEN
      INSERT INTO notifications (user_id, type, title, message, related_id)
      VALUES (challenge.challenger_id, 'challenge_won', 'Du vann utmaningen! 🏆', 
              'Grattis! Du slog ' || COALESCE(challenged_name, 'din motståndare') || ' i utmaningen!', challenge.id);
      INSERT INTO notifications (user_id, type, title, message, related_id)
      VALUES (challenge.challenged_id, 'challenge_lost', 'Utmaningen avslutad', 
              COALESCE(challenger_name, 'Din motståndare') || ' vann utmaningen. Bättre lycka nästa gång!', challenge.id);
    ELSIF winner = challenge.challenged_id THEN
      INSERT INTO notifications (user_id, type, title, message, related_id)
      VALUES (challenge.challenged_id, 'challenge_won', 'Du vann utmaningen! 🏆', 
              'Grattis! Du slog ' || COALESCE(challenger_name, 'din motståndare') || ' i utmaningen!', challenge.id);
      INSERT INTO notifications (user_id, type, title, message, related_id)
      VALUES (challenge.challenger_id, 'challenge_lost', 'Utmaningen avslutad', 
              COALESCE(challenged_name, 'Din motståndare') || ' vann utmaningen. Bättre lycka nästa gång!', challenge.id);
    ELSE
      -- Draw
      INSERT INTO notifications (user_id, type, title, message, related_id)
      VALUES (challenge.challenger_id, 'challenge_draw', 'Utmaningen slutade oavgjort', 
              'Du och ' || COALESCE(challenged_name, 'din motståndare') || ' slutade lika!', challenge.id);
      INSERT INTO notifications (user_id, type, title, message, related_id)
      VALUES (challenge.challenged_id, 'challenge_draw', 'Utmaningen slutade oavgjort', 
              'Du och ' || COALESCE(challenger_name, 'din motståndare') || ' slutade lika!', challenge.id);
    END IF;
  END LOOP;
END;
$function$;

-- Add DELETE policy for challenges (allow participants to cancel their own pending/active challenges)
CREATE POLICY "Users can delete own challenges"
ON public.challenges
FOR DELETE
USING (
  (auth.uid() = challenger_id OR auth.uid() = challenged_id)
  AND status IN ('pending', 'active')
);