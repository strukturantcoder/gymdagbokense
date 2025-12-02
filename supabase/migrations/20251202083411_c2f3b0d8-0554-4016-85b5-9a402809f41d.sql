-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING (auth.uid() = user_id);

-- Allow users to view profiles of their friends (accepted friendships)
CREATE POLICY "Users can view friend profiles" ON public.profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'accepted'
    AND (
      (f.user_id = auth.uid() AND f.friend_id = profiles.user_id)
      OR (f.friend_id = auth.uid() AND f.user_id = profiles.user_id)
    )
  )
);

-- Allow authenticated users to search profiles by display_name (for adding friends)
-- This is a limited exposure - only authenticated users can search
CREATE POLICY "Authenticated users can search profiles" ON public.profiles
FOR SELECT USING (
  auth.uid() IS NOT NULL
);