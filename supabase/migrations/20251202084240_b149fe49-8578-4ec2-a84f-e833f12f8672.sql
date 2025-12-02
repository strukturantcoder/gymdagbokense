-- Create cardio_logs table for tracking cardio activities
CREATE TABLE public.cardio_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  distance_km NUMERIC,
  calories_burned INTEGER,
  notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.cardio_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own cardio logs"
ON public.cardio_logs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cardio logs"
ON public.cardio_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cardio logs"
ON public.cardio_logs
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cardio logs"
ON public.cardio_logs
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_cardio_logs_user_id ON public.cardio_logs(user_id);
CREATE INDEX idx_cardio_logs_completed_at ON public.cardio_logs(completed_at DESC);