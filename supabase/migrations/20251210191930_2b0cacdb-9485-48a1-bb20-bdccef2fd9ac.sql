-- Drop the existing friend profile policy that exposes all columns
DROP POLICY IF EXISTS "Users can view friend profiles limited" ON public.profiles;

-- Create a more restrictive view for friend profile access
-- Friends can only see the row exists, actual data access is through the secure function
-- We'll create a policy that still allows the secure function to work but blocks direct SELECT of sensitive columns

-- First, let's update the get_friend_profile function to ensure it only returns safe data
CREATE OR REPLACE FUNCTION public.get_friend_profile(friend_user_id uuid)
RETURNS TABLE(user_id uuid, display_name text, avatar_url text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only return profile if the requesting user is an accepted friend
  RETURN QUERY
  SELECT 
    p.user_id,
    p.display_name,
    p.avatar_url
  FROM profiles p
  WHERE p.user_id = friend_user_id
    AND EXISTS (
      SELECT 1 FROM friendships f
      WHERE f.status = 'accepted'
        AND (
          (f.user_id = auth.uid() AND f.friend_id = friend_user_id)
          OR (f.friend_id = auth.uid() AND f.user_id = friend_user_id)
        )
    );
END;
$$;

-- For user_stats, create a function that returns limited stats for friends
-- This allows social features while protecting detailed activity patterns
CREATE OR REPLACE FUNCTION public.get_friend_stats(friend_user_id uuid)
RETURNS TABLE(user_id uuid, level integer, total_xp integer, total_workouts integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only return limited stats if the requesting user is an accepted friend
  RETURN QUERY
  SELECT 
    us.user_id,
    us.level,
    us.total_xp,
    us.total_workouts
  FROM user_stats us
  WHERE us.user_id = friend_user_id
    AND EXISTS (
      SELECT 1 FROM friendships f
      WHERE f.status = 'accepted'
        AND (
          (f.user_id = auth.uid() AND f.friend_id = friend_user_id)
          OR (f.friend_id = auth.uid() AND f.user_id = friend_user_id)
        )
    );
END;
$$;

-- Now we need to decide: should friends be able to SELECT directly from these tables?
-- For maximum security, we should NOT allow direct SELECT by friends.
-- Instead, all friend data access should go through the secure functions.

-- However, this might break existing functionality that relies on direct queries.
-- Let's check if we need the direct policy for any features.

-- For now, let's keep a very restricted direct access policy that only works
-- for authenticated users viewing their own data, and rely on functions for friend data.

-- Actually, the safest approach is to NOT have a direct friend SELECT policy at all,
-- and update the application code to use the secure functions.

-- But to avoid breaking the app, let's create a compromise:
-- A policy that allows friends to see ONLY non-sensitive fields by using a 
-- security barrier view.

-- Create a secure view for friend profile access
DROP VIEW IF EXISTS public.friend_profiles_view;
CREATE VIEW public.friend_profiles_view WITH (security_barrier = true) AS
SELECT 
  user_id,
  display_name,
  avatar_url
FROM profiles
WHERE EXISTS (
  SELECT 1 FROM friendships f
  WHERE f.status = 'accepted'
    AND (
      (f.user_id = auth.uid() AND f.friend_id = profiles.user_id)
      OR (f.friend_id = auth.uid() AND f.user_id = profiles.user_id)
    )
);

-- Grant access to the view
GRANT SELECT ON public.friend_profiles_view TO authenticated;

-- Similarly for user_stats - create a limited view
DROP VIEW IF EXISTS public.friend_stats_view;
CREATE VIEW public.friend_stats_view WITH (security_barrier = true) AS
SELECT 
  user_id,
  level,
  total_xp,
  total_workouts
FROM user_stats
WHERE EXISTS (
  SELECT 1 FROM friendships f
  WHERE f.status = 'accepted'
    AND (
      (f.user_id = auth.uid() AND f.friend_id = user_stats.user_id)
      OR (f.friend_id = auth.uid() AND f.user_id = user_stats.user_id)
    )
);

-- Grant access to the view
GRANT SELECT ON public.friend_stats_view TO authenticated;