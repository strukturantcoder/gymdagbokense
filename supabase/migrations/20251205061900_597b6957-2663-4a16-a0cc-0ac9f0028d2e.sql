-- Function to complete pool challenges and award XP to winner
CREATE OR REPLACE FUNCTION public.complete_pool_challenges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  challenge RECORD;
  winner RECORD;
BEGIN
  -- Find all active challenges that have ended
  FOR challenge IN
    SELECT * FROM pool_challenges
    WHERE status = 'active'
      AND end_date < NOW()
  LOOP
    -- Find the winner (participant with highest current_value)
    SELECT * INTO winner
    FROM pool_challenge_participants
    WHERE challenge_id = challenge.id
    ORDER BY current_value DESC
    LIMIT 1;

    IF winner IS NOT NULL AND winner.current_value > 0 THEN
      -- Update challenge with winner
      UPDATE pool_challenges
      SET status = 'completed', winner_id = winner.user_id
      WHERE id = challenge.id;

      -- Award XP to winner
      UPDATE user_stats
      SET total_xp = total_xp + challenge.xp_reward,
          updated_at = NOW()
      WHERE user_id = winner.user_id;

      -- Create notification for winner
      INSERT INTO notifications (user_id, type, title, message, related_id)
      VALUES (
        winner.user_id,
        'pool_challenge_won',
        'Du vann! 🏆',
        'Grattis! Du vann utmaningen och fick ' || challenge.xp_reward || ' XP!',
        challenge.id
      );

      -- Notify other participants
      INSERT INTO notifications (user_id, type, title, message, related_id)
      SELECT 
        user_id,
        'pool_challenge_ended',
        'Utmaningen avslutad',
        'Utmaningen har avslutats. Bättre lycka nästa gång!',
        challenge.id
      FROM pool_challenge_participants
      WHERE challenge_id = challenge.id
        AND user_id != winner.user_id;
    ELSE
      -- No winner (no activity)
      UPDATE pool_challenges
      SET status = 'completed'
      WHERE id = challenge.id;
    END IF;
  END LOOP;
END;
$$;