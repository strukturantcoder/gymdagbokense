-- Create table for storing Garmin OAuth tokens
CREATE TABLE public.garmin_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  oauth_token TEXT NOT NULL,
  oauth_token_secret TEXT NOT NULL,
  garmin_user_id TEXT,
  display_name TEXT,
  connected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_sync_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT garmin_connections_user_id_key UNIQUE (user_id)
);

-- Create table for storing synced Garmin activities
CREATE TABLE public.garmin_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  garmin_activity_id TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  activity_name TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_seconds INTEGER,
  distance_meters NUMERIC,
  calories INTEGER,
  average_heart_rate INTEGER,
  max_heart_rate INTEGER,
  average_speed NUMERIC,
  elevation_gain NUMERIC,
  raw_data JSONB,
  synced_to_cardio_log_id UUID REFERENCES public.cardio_logs(id),
  synced_to_workout_log_id UUID REFERENCES public.workout_logs(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT garmin_activities_garmin_id_key UNIQUE (user_id, garmin_activity_id)
);

-- Create table for temporary OAuth tokens during authorization
CREATE TABLE public.garmin_oauth_temp (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  oauth_token TEXT NOT NULL,
  oauth_token_secret TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '15 minutes')
);

-- Enable RLS on all tables
ALTER TABLE public.garmin_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garmin_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garmin_oauth_temp ENABLE ROW LEVEL SECURITY;

-- RLS policies for garmin_connections
CREATE POLICY "Users can view their own Garmin connection"
  ON public.garmin_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Garmin connection"
  ON public.garmin_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Garmin connection"
  ON public.garmin_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Garmin connection"
  ON public.garmin_connections FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for garmin_activities
CREATE POLICY "Users can view their own Garmin activities"
  ON public.garmin_activities FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Garmin activities"
  ON public.garmin_activities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Garmin activities"
  ON public.garmin_activities FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Garmin activities"
  ON public.garmin_activities FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for garmin_oauth_temp
CREATE POLICY "Users can view their own temp tokens"
  ON public.garmin_oauth_temp FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own temp tokens"
  ON public.garmin_oauth_temp FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own temp tokens"
  ON public.garmin_oauth_temp FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_garmin_activities_user_id ON public.garmin_activities(user_id);
CREATE INDEX idx_garmin_activities_start_time ON public.garmin_activities(start_time DESC);

-- Update trigger for garmin_connections
CREATE TRIGGER update_garmin_connections_updated_at
  BEFORE UPDATE ON public.garmin_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();