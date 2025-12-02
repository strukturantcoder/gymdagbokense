-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all stats" ON public.user_stats;

-- Create policy for users to view their own stats
CREATE POLICY "Users can view own stats"
ON public.user_stats
FOR SELECT
USING (auth.uid() = user_id);

-- Create policy for users to view friends' stats
CREATE POLICY "Users can view friend stats"
ON public.user_stats
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'accepted'
    AND (
      (f.user_id = auth.uid() AND f.friend_id = user_stats.user_id)
      OR (f.friend_id = auth.uid() AND f.user_id = user_stats.user_id)
    )
  )
);