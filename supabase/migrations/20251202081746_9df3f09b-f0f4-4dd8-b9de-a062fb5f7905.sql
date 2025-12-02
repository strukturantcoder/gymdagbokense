-- Allow users to update their own workout programs
CREATE POLICY "Users can update own programs" 
ON public.workout_programs 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);