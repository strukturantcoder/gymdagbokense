-- Add scheduled_time column to scheduled_workouts table
ALTER TABLE public.scheduled_workouts 
ADD COLUMN scheduled_time time without time zone DEFAULT NULL;