-- Add unique constraint on user_id for garmin_oauth_temp to allow upsert
ALTER TABLE public.garmin_oauth_temp 
ADD CONSTRAINT garmin_oauth_temp_user_id_unique UNIQUE (user_id);

-- Also ensure garmin_connections has same constraint if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'garmin_connections_user_id_key' 
    AND conrelid = 'garmin_connections'::regclass
  ) THEN
    ALTER TABLE public.garmin_connections 
    ADD CONSTRAINT garmin_connections_user_id_key UNIQUE (user_id);
  END IF;
END $$;