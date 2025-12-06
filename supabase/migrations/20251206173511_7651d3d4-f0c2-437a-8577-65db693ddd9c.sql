-- Create a secure function for accessing friend profile data with limited fields
CREATE OR REPLACE FUNCTION public.get_friend_profile(friend_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Drop the existing friend profile policy that exposes all columns
DROP POLICY IF EXISTS "Users can view friend profiles limited" ON public.profiles;

-- Recreate with a more restrictive approach - only allow direct queries through friendship
-- This policy still allows the query but the secure function above should be preferred
-- for accessing friend data to ensure only limited fields are returned
CREATE POLICY "Users can view friend profiles limited"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM friendships f
    WHERE f.status = 'accepted'
    AND (
      (f.user_id = auth.uid() AND f.friend_id = profiles.user_id)
      OR (f.friend_id = auth.uid() AND f.user_id = profiles.user_id)
    )
  )
);