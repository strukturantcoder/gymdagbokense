-- Create workout_reminders table for storing user reminder preferences
CREATE TABLE public.workout_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('morning', 'before_workout')),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  reminder_time TIME NOT NULL DEFAULT '08:00:00',
  days_of_week INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5,6,0}',
  minutes_before INTEGER DEFAULT 60,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, reminder_type)
);

-- Enable RLS
ALTER TABLE public.workout_reminders ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own reminders"
ON public.workout_reminders
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reminders"
ON public.workout_reminders
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reminders"
ON public.workout_reminders
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reminders"
ON public.workout_reminders
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_workout_reminders_updated_at
BEFORE UPDATE ON public.workout_reminders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create reminder_logs table to track sent reminders (avoid duplicates)
CREATE TABLE public.reminder_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  reminder_type TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reminder_date DATE NOT NULL
);

-- Enable RLS
ALTER TABLE public.reminder_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can access reminder_logs
CREATE POLICY "Service role can manage reminder logs"
ON public.reminder_logs
FOR ALL
USING (false)
WITH CHECK (false);