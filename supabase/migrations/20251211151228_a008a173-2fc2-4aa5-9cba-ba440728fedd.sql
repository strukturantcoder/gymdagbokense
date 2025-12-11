-- Fix 1: Allow accepted friends to view each other's profiles (limited fields)
-- Note: The get_friend_profile function already handles this securely with field restrictions
-- But we need a basic SELECT policy for the friendship check to work

CREATE POLICY "Users can view friend profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'accepted'
    AND (
      (f.user_id = auth.uid() AND f.friend_id = profiles.user_id)
      OR (f.friend_id = auth.uid() AND f.user_id = profiles.user_id)
    )
  )
);

-- Fix 2: Allow authenticated users to view active pool challenges
-- This enables users to see available challenges before joining
CREATE POLICY "Users can view active pool challenges"
ON public.pool_challenges
FOR SELECT
TO authenticated
USING (status = 'active');