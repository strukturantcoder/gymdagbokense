-- Personal best goals for exercises
CREATE TABLE public.exercise_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  exercise_name TEXT NOT NULL,
  target_weight_kg NUMERIC,
  target_reps INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, exercise_name)
);

-- Personal best records (automatically tracked)
CREATE TABLE public.personal_bests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  exercise_name TEXT NOT NULL,
  best_weight_kg NUMERIC NOT NULL,
  best_reps INTEGER,
  achieved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, exercise_name)
);

-- Enable RLS
ALTER TABLE public.exercise_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_bests ENABLE ROW LEVEL SECURITY;

-- Exercise goals policies
CREATE POLICY "Users can view own goals" ON public.exercise_goals
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals" ON public.exercise_goals
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals" ON public.exercise_goals
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals" ON public.exercise_goals
FOR DELETE USING (auth.uid() = user_id);

-- Personal bests policies
CREATE POLICY "Users can view own PBs" ON public.personal_bests
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own PBs" ON public.personal_bests
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own PBs" ON public.personal_bests
FOR UPDATE USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_exercise_goals_updated_at
BEFORE UPDATE ON public.exercise_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();