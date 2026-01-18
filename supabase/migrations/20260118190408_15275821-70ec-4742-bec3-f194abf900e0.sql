-- Create user_goals table for storing AI-coached fitness goals
CREATE TABLE public.user_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  goal_type TEXT NOT NULL, -- 'strength', 'cardio', 'weight', 'habit', 'custom'
  target_value NUMERIC,
  target_unit TEXT, -- 'kg', 'km', 'sessions', 'minutes', etc.
  current_value NUMERIC DEFAULT 0,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'completed', 'paused', 'abandoned'
  ai_suggested BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own goals"
ON public.user_goals
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own goals"
ON public.user_goals
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
ON public.user_goals
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals"
ON public.user_goals
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_goals_updated_at
BEFORE UPDATE ON public.user_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add has_set_goals flag to profiles for onboarding state
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_set_initial_goals BOOLEAN DEFAULT false;