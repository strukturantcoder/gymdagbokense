-- Add soft delete column to workout_programs
ALTER TABLE public.workout_programs 
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for efficient filtering
CREATE INDEX idx_workout_programs_deleted_at ON public.workout_programs(deleted_at);

-- Update RLS policy to exclude deleted programs by default
DROP POLICY IF EXISTS "Users can view own programs" ON public.workout_programs;
CREATE POLICY "Users can view own programs" 
ON public.workout_programs 
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy for soft delete (update deleted_at)
DROP POLICY IF EXISTS "Users can update own programs" ON public.workout_programs;
CREATE POLICY "Users can update own programs" 
ON public.workout_programs 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);