-- Create table for tracking completed cardio plan sessions
CREATE TABLE public.cardio_plan_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id UUID NOT NULL REFERENCES public.cardio_plans(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  session_day TEXT NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  cardio_log_id UUID REFERENCES public.cardio_logs(id) ON DELETE SET NULL,
  UNIQUE(plan_id, week_number, session_day)
);

-- Enable RLS
ALTER TABLE public.cardio_plan_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own plan sessions"
  ON public.cardio_plan_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own plan sessions"
  ON public.cardio_plan_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own plan sessions"
  ON public.cardio_plan_sessions FOR DELETE
  USING (auth.uid() = user_id);