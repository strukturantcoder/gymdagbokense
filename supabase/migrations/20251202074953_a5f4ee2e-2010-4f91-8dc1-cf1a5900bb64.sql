-- Create workout logs table (one per training session)
CREATE TABLE public.workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  program_id UUID REFERENCES public.workout_programs(id) ON DELETE SET NULL,
  workout_day TEXT NOT NULL,
  notes TEXT,
  duration_minutes INTEGER,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create exercise logs table (individual exercises within a workout)
CREATE TABLE public.exercise_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_log_id UUID REFERENCES public.workout_logs(id) ON DELETE CASCADE NOT NULL,
  exercise_name TEXT NOT NULL,
  sets_completed INTEGER NOT NULL,
  reps_completed TEXT NOT NULL,
  weight_kg DECIMAL(6,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_logs ENABLE ROW LEVEL SECURITY;

-- Workout logs policies
CREATE POLICY "Users can view own workout logs"
ON public.workout_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workout logs"
ON public.workout_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workout logs"
ON public.workout_logs FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workout logs"
ON public.workout_logs FOR DELETE
USING (auth.uid() = user_id);

-- Exercise logs policies (via workout_log ownership)
CREATE POLICY "Users can view own exercise logs"
ON public.exercise_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.workout_logs wl 
    WHERE wl.id = workout_log_id AND wl.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own exercise logs"
ON public.exercise_logs FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workout_logs wl 
    WHERE wl.id = workout_log_id AND wl.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own exercise logs"
ON public.exercise_logs FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.workout_logs wl 
    WHERE wl.id = workout_log_id AND wl.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own exercise logs"
ON public.exercise_logs FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.workout_logs wl 
    WHERE wl.id = workout_log_id AND wl.user_id = auth.uid()
  )
);