-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all user achievements" ON public.user_achievements;

-- Create policy for users to view their own achievements
CREATE POLICY "Users can view own achievements"
ON public.user_achievements
FOR SELECT
USING (auth.uid() = user_id);

-- Create policy for users to view friends' achievements
CREATE POLICY "Users can view friend achievements"
ON public.user_achievements
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'accepted'
    AND (
      (f.user_id = auth.uid() AND f.friend_id = user_achievements.user_id)
      OR (f.friend_id = auth.uid() AND f.user_id = user_achievements.user_id)
    )
  )
);