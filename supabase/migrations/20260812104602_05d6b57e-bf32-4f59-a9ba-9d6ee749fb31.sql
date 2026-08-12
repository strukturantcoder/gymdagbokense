CREATE OR REPLACE FUNCTION public.enforce_user_stats_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  activity_count integer;
  xp_ceiling integer;
  xp_delta integer;
BEGIN
  -- Only constrain writes coming directly from the Data API as an end user.
  -- SECURITY DEFINER functions and service_role run as another role and are trusted.
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.total_xp := 0;
    NEW.level := 1;
    NEW.total_workouts := 0;
    NEW.total_sets := 0;
    NEW.total_minutes := 0;
    NEW.total_cardio_sessions := 0;
    NEW.total_cardio_minutes := 0;
    NEW.total_cardio_distance_km := 0;
    NEW.current_streak := 0;
    NEW.longest_streak := 0;
    NEW.daily_bonus_claimed_at := NULL;
    RETURN NEW;
  END IF;

  -- Streaks and daily bonus are server-owned only.
  NEW.current_streak := OLD.current_streak;
  NEW.longest_streak := OLD.longest_streak;
  NEW.daily_bonus_claimed_at := OLD.daily_bonus_claimed_at;
  NEW.user_id := OLD.user_id;

  SELECT
    (SELECT count(*) FROM public.workout_logs w WHERE w.user_id = OLD.user_id)
  + (SELECT count(*) FROM public.cardio_logs c WHERE c.user_id = OLD.user_id)
  + (SELECT count(*) FROM public.wod_logs d WHERE d.user_id = OLD.user_id)
  INTO activity_count;

  -- Absolute ceiling derived from real logged activity (plus achievement headroom).
  xp_ceiling := 2000 + (1000 * activity_count);

  xp_delta := COALESCE(NEW.total_xp, 0) - COALESCE(OLD.total_xp, 0);
  IF xp_delta < 0 THEN
    xp_delta := 0;
  ELSIF xp_delta > 500 THEN
    xp_delta := 500;
  END IF;

  NEW.total_xp := LEAST(COALESCE(OLD.total_xp, 0) + xp_delta, GREATEST(COALESCE(OLD.total_xp, 0), xp_ceiling));
  NEW.level := (NEW.total_xp / 1000) + 1;

  -- Counters: monotonic, with per-update step limits.
  NEW.total_workouts := LEAST(GREATEST(COALESCE(NEW.total_workouts, 0), OLD.total_workouts), OLD.total_workouts + 1);
  NEW.total_cardio_sessions := LEAST(GREATEST(COALESCE(NEW.total_cardio_sessions, 0), OLD.total_cardio_sessions), OLD.total_cardio_sessions + 1);
  NEW.total_sets := LEAST(GREATEST(COALESCE(NEW.total_sets, 0), OLD.total_sets), OLD.total_sets + 200);
  NEW.total_minutes := LEAST(GREATEST(COALESCE(NEW.total_minutes, 0), OLD.total_minutes), OLD.total_minutes + 600);
  NEW.total_cardio_minutes := LEAST(GREATEST(COALESCE(NEW.total_cardio_minutes, 0), OLD.total_cardio_minutes), OLD.total_cardio_minutes + 600);
  NEW.total_cardio_distance_km := LEAST(GREATEST(COALESCE(NEW.total_cardio_distance_km, 0), OLD.total_cardio_distance_km), OLD.total_cardio_distance_km + 200);

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_user_stats_integrity_trg ON public.user_stats;

CREATE TRIGGER enforce_user_stats_integrity_trg
BEFORE INSERT OR UPDATE ON public.user_stats
FOR EACH ROW
EXECUTE FUNCTION public.enforce_user_stats_integrity();