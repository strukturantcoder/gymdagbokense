-- Drop the existing policy that exposes all waiting entries
DROP POLICY IF EXISTS "Users can view all waiting entries" ON public.challenge_pool_entries;

-- Create new policy that only allows users to view their own entries
CREATE POLICY "Users can view own entries" 
ON public.challenge_pool_entries 
FOR SELECT 
USING (auth.uid() = user_id);