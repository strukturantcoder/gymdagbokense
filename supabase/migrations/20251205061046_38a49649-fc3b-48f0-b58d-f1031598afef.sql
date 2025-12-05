-- Add birth_year and gender to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS birth_year integer,
ADD COLUMN IF NOT EXISTS gender text;

-- Create challenge pool entries table (users waiting for matches)
CREATE TABLE public.challenge_pool_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  challenge_category text NOT NULL, -- 'strength' or 'cardio'
  challenge_type text NOT NULL, -- 'workouts', 'sets', 'minutes', 'distance_km'
  target_value integer NOT NULL,
  duration_days integer NOT NULL,
  preferred_gender text, -- 'male', 'female', or null for any
  min_age integer,
  max_age integer,
  allow_multiple boolean NOT NULL DEFAULT false,
  max_participants integer DEFAULT 2,
  latest_start_date timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'waiting', -- 'waiting', 'matched', 'expired', 'cancelled'
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create pool challenges table (matched challenges)
CREATE TABLE public.pool_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_category text NOT NULL,
  challenge_type text NOT NULL,
  target_value integer NOT NULL,
  start_date timestamp with time zone NOT NULL DEFAULT now(),
  end_date timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'active', -- 'active', 'completed', 'cancelled'
  winner_id uuid,
  xp_reward integer NOT NULL DEFAULT 100,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create pool challenge participants
CREATE TABLE public.pool_challenge_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.pool_challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  pool_entry_id uuid REFERENCES public.challenge_pool_entries(id),
  current_value integer NOT NULL DEFAULT 0,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

-- Create pool challenge messages (chat)
CREATE TABLE public.pool_challenge_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.pool_challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.challenge_pool_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pool_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pool_challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pool_challenge_messages ENABLE ROW LEVEL SECURITY;

-- RLS for challenge_pool_entries
CREATE POLICY "Users can view all waiting entries"
ON public.challenge_pool_entries FOR SELECT
USING (status = 'waiting' OR auth.uid() = user_id);

CREATE POLICY "Users can create own entries"
ON public.challenge_pool_entries FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own entries"
ON public.challenge_pool_entries FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own entries"
ON public.challenge_pool_entries FOR DELETE
USING (auth.uid() = user_id);

-- RLS for pool_challenges
CREATE POLICY "Participants can view their challenges"
ON public.pool_challenges FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.pool_challenge_participants p
  WHERE p.challenge_id = pool_challenges.id AND p.user_id = auth.uid()
));

-- RLS for pool_challenge_participants
CREATE POLICY "Participants can view challenge participants"
ON public.pool_challenge_participants FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.pool_challenge_participants p
  WHERE p.challenge_id = pool_challenge_participants.challenge_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can insert own participation"
ON public.pool_challenge_participants FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
ON public.pool_challenge_participants FOR UPDATE
USING (auth.uid() = user_id);

-- RLS for pool_challenge_messages
CREATE POLICY "Participants can view challenge messages"
ON public.pool_challenge_messages FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.pool_challenge_participants p
  WHERE p.challenge_id = pool_challenge_messages.challenge_id AND p.user_id = auth.uid()
));

CREATE POLICY "Participants can send messages"
ON public.pool_challenge_messages FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.pool_challenge_participants p
    WHERE p.challenge_id = pool_challenge_messages.challenge_id AND p.user_id = auth.uid()
  )
);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.pool_challenge_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pool_challenge_participants;

-- Function to update pool challenge progress based on workouts/cardio
CREATE OR REPLACE FUNCTION public.update_pool_challenge_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  participant RECORD;
  challenge RECORD;
  new_value INTEGER;
  user_to_update UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    user_to_update := OLD.user_id;
  ELSE
    user_to_update := NEW.user_id;
  END IF;

  FOR participant IN
    SELECT pcp.id, pcp.challenge_id
    FROM pool_challenge_participants pcp
    JOIN pool_challenges pc ON pc.id = pcp.challenge_id
    WHERE pcp.user_id = user_to_update
      AND pc.status = 'active'
      AND pc.start_date <= NOW()
      AND pc.end_date >= NOW()
  LOOP
    SELECT * INTO challenge FROM pool_challenges WHERE id = participant.challenge_id;
    
    CASE challenge.challenge_type
      WHEN 'workouts' THEN
        IF challenge.challenge_category = 'strength' THEN
          SELECT COUNT(*) INTO new_value
          FROM workout_logs
          WHERE user_id = user_to_update
            AND completed_at >= challenge.start_date
            AND completed_at <= challenge.end_date;
        ELSE
          SELECT COUNT(*) INTO new_value
          FROM cardio_logs
          WHERE user_id = user_to_update
            AND completed_at >= challenge.start_date
            AND completed_at <= challenge.end_date;
        END IF;
      
      WHEN 'sets' THEN
        SELECT COALESCE(SUM(el.sets_completed), 0) INTO new_value
        FROM exercise_logs el
        JOIN workout_logs wl ON wl.id = el.workout_log_id
        WHERE wl.user_id = user_to_update
          AND wl.completed_at >= challenge.start_date
          AND wl.completed_at <= challenge.end_date;
      
      WHEN 'minutes' THEN
        IF challenge.challenge_category = 'strength' THEN
          SELECT COALESCE(SUM(duration_minutes), 0) INTO new_value
          FROM workout_logs
          WHERE user_id = user_to_update
            AND completed_at >= challenge.start_date
            AND completed_at <= challenge.end_date;
        ELSE
          SELECT COALESCE(SUM(duration_minutes), 0) INTO new_value
          FROM cardio_logs
          WHERE user_id = user_to_update
            AND completed_at >= challenge.start_date
            AND completed_at <= challenge.end_date;
        END IF;
      
      WHEN 'distance_km' THEN
        SELECT COALESCE(SUM(distance_km), 0)::INTEGER INTO new_value
        FROM cardio_logs
        WHERE user_id = user_to_update
          AND completed_at >= challenge.start_date
          AND completed_at <= challenge.end_date;
      
      ELSE
        new_value := 0;
    END CASE;
    
    UPDATE pool_challenge_participants
    SET current_value = new_value, updated_at = NOW()
    WHERE id = participant.id;
  END LOOP;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Create triggers for automatic progress updates
CREATE TRIGGER update_pool_progress_on_workout
AFTER INSERT OR UPDATE OR DELETE ON public.workout_logs
FOR EACH ROW EXECUTE FUNCTION public.update_pool_challenge_progress();

CREATE TRIGGER update_pool_progress_on_cardio
AFTER INSERT OR UPDATE OR DELETE ON public.cardio_logs
FOR EACH ROW EXECUTE FUNCTION public.update_pool_challenge_progress();

CREATE TRIGGER update_pool_progress_on_exercise
AFTER INSERT OR UPDATE OR DELETE ON public.exercise_logs
FOR EACH ROW EXECUTE FUNCTION public.update_pool_challenge_progress();