-- Create a table for saving cardio training plans
CREATE TABLE public.cardio_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  goal_type TEXT NOT NULL,
  target_value TEXT,
  total_weeks INTEGER NOT NULL,
  plan_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT false
);

-- Enable Row Level Security
ALTER TABLE public.cardio_plans ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own cardio plans"
ON public.cardio_plans
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cardio plans"
ON public.cardio_plans
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cardio plans"
ON public.cardio_plans
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cardio plans"
ON public.cardio_plans
FOR DELETE
USING (auth.uid() = user_id);