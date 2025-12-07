-- Create table for logged WOD completions
CREATE TABLE public.wod_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  wod_name TEXT NOT NULL,
  wod_format TEXT NOT NULL,
  wod_duration TEXT NOT NULL,
  wod_exercises JSONB NOT NULL,
  completion_time TEXT,
  rounds_completed INTEGER,
  reps_completed INTEGER,
  notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.wod_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view own wod logs" 
ON public.wod_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wod logs" 
ON public.wod_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own wod logs" 
ON public.wod_logs 
FOR DELETE 
USING (auth.uid() = user_id);