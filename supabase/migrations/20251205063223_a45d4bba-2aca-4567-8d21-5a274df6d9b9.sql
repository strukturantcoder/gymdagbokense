-- Create validation trigger for pool_challenges to prevent manipulation
CREATE OR REPLACE FUNCTION public.validate_pool_challenge_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  participant_count INTEGER;
  max_participant_value INTEGER;
  actual_winner_id UUID;
BEGIN
  -- Validate status transitions
  IF OLD.status = 'completed' AND NEW.status != 'completed' THEN
    RAISE EXCEPTION 'Cannot change status of completed challenge';
  END IF;
  
  -- If setting winner_id, validate it's actually a participant with highest value
  IF NEW.winner_id IS NOT NULL AND NEW.status = 'completed' THEN
    -- Check that winner_id is actually a participant
    SELECT COUNT(*) INTO participant_count
    FROM pool_challenge_participants
    WHERE challenge_id = NEW.id AND user_id = NEW.winner_id;
    
    IF participant_count = 0 THEN
      RAISE EXCEPTION 'Winner must be a participant in the challenge';
    END IF;
    
    -- Verify winner has the highest value among participants
    SELECT user_id INTO actual_winner_id
    FROM pool_challenge_participants
    WHERE challenge_id = NEW.id
    ORDER BY current_value DESC
    LIMIT 1;
    
    IF actual_winner_id != NEW.winner_id THEN
      RAISE EXCEPTION 'Winner must have the highest progress value';
    END IF;
  END IF;
  
  -- Validate xp_reward hasn't been tampered with (should remain constant)
  IF OLD.xp_reward != NEW.xp_reward THEN
    RAISE EXCEPTION 'XP reward cannot be modified after challenge creation';
  END IF;
  
  -- Validate target_value hasn't been changed
  IF OLD.target_value != NEW.target_value THEN
    RAISE EXCEPTION 'Target value cannot be modified after challenge creation';
  END IF;
  
  -- Validate dates haven't been changed
  IF OLD.start_date != NEW.start_date OR OLD.end_date != NEW.end_date THEN
    RAISE EXCEPTION 'Challenge dates cannot be modified after creation';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS validate_pool_challenge_update_trigger ON public.pool_challenges;
CREATE TRIGGER validate_pool_challenge_update_trigger
BEFORE UPDATE ON public.pool_challenges
FOR EACH ROW
EXECUTE FUNCTION public.validate_pool_challenge_update();

-- Create validation trigger for INSERT to ensure reasonable initial values
CREATE OR REPLACE FUNCTION public.validate_pool_challenge_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate XP reward is within reasonable bounds (prevent inflation)
  IF NEW.xp_reward < 0 OR NEW.xp_reward > 1000 THEN
    RAISE EXCEPTION 'XP reward must be between 0 and 1000';
  END IF;
  
  -- Validate target_value is positive
  IF NEW.target_value <= 0 THEN
    RAISE EXCEPTION 'Target value must be positive';
  END IF;
  
  -- Validate end_date is after start_date
  IF NEW.end_date <= NEW.start_date THEN
    RAISE EXCEPTION 'End date must be after start date';
  END IF;
  
  -- New challenges must start with active status and no winner
  IF NEW.status != 'active' THEN
    RAISE EXCEPTION 'New challenges must start with active status';
  END IF;
  
  IF NEW.winner_id IS NOT NULL THEN
    RAISE EXCEPTION 'New challenges cannot have a winner';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the insert trigger
DROP TRIGGER IF EXISTS validate_pool_challenge_insert_trigger ON public.pool_challenges;
CREATE TRIGGER validate_pool_challenge_insert_trigger
BEFORE INSERT ON public.pool_challenges
FOR EACH ROW
EXECUTE FUNCTION public.validate_pool_challenge_insert();