-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "System can insert progress" ON public.challenge_progress;

-- Create policy for users to insert only their own progress
CREATE POLICY "Users can insert own progress"
ON public.challenge_progress
FOR INSERT
WITH CHECK (auth.uid() = user_id);