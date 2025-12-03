-- Add set_details column to exercise_logs for per-set tracking
-- Format: [{"reps": 10, "weight": 50}, {"reps": 8, "weight": 55}, ...]
ALTER TABLE public.exercise_logs 
ADD COLUMN set_details jsonb DEFAULT NULL;

-- Add comment explaining the structure
COMMENT ON COLUMN public.exercise_logs.set_details IS 'Array of objects with reps and weight for each individual set. Format: [{"reps": number, "weight": number}, ...]';