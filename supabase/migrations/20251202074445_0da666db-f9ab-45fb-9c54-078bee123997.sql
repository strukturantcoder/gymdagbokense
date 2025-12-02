-- Create workout programs table
CREATE TABLE public.workout_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  goal TEXT NOT NULL,
  experience_level TEXT NOT NULL,
  days_per_week INTEGER NOT NULL,
  program_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workout_programs ENABLE ROW LEVEL SECURITY;

-- Users can view their own programs
CREATE POLICY "Users can view own programs"
ON public.workout_programs
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own programs
CREATE POLICY "Users can insert own programs"
ON public.workout_programs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own programs
CREATE POLICY "Users can delete own programs"
ON public.workout_programs
FOR DELETE
USING (auth.uid() = user_id);