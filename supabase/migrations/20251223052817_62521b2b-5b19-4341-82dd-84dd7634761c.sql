-- Create scheduled workouts table for user-planned training sessions
CREATE TABLE public.scheduled_workouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  scheduled_date DATE NOT NULL,
  title TEXT NOT NULL,
  workout_type TEXT NOT NULL DEFAULT 'strength', -- 'strength', 'cardio', 'other'
  description TEXT,
  duration_minutes INTEGER,
  workout_program_id UUID REFERENCES public.workout_programs(id) ON DELETE SET NULL,
  workout_day_name TEXT, -- e.g., "Dag 1 - Bröst & Axlar"
  reminder_enabled BOOLEAN DEFAULT true,
  reminder_minutes_before INTEGER DEFAULT 60,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scheduled_workouts ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own scheduled workouts" 
ON public.scheduled_workouts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scheduled workouts" 
ON public.scheduled_workouts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scheduled workouts" 
ON public.scheduled_workouts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scheduled workouts" 
ON public.scheduled_workouts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for efficient querying
CREATE INDEX idx_scheduled_workouts_user_date ON public.scheduled_workouts(user_id, scheduled_date);
CREATE INDEX idx_scheduled_workouts_date ON public.scheduled_workouts(scheduled_date);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_scheduled_workouts_updated_at
BEFORE UPDATE ON public.scheduled_workouts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();