-- Create cardio_goals table
CREATE TABLE public.cardio_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  target_type TEXT NOT NULL, -- 'distance_km', 'duration_minutes', 'sessions'
  target_value NUMERIC NOT NULL,
  period TEXT NOT NULL DEFAULT 'weekly', -- 'weekly', 'monthly'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, activity_type, target_type, period)
);

-- Enable RLS
ALTER TABLE public.cardio_goals ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own cardio goals"
ON public.cardio_goals FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cardio goals"
ON public.cardio_goals FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cardio goals"
ON public.cardio_goals FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cardio goals"
ON public.cardio_goals FOR DELETE
USING (auth.uid() = user_id);

-- Add cardio stats to user_stats table
ALTER TABLE public.user_stats 
ADD COLUMN IF NOT EXISTS total_cardio_sessions INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_cardio_minutes INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_cardio_distance_km NUMERIC NOT NULL DEFAULT 0;

-- Create index
CREATE INDEX idx_cardio_goals_user_id ON public.cardio_goals(user_id);