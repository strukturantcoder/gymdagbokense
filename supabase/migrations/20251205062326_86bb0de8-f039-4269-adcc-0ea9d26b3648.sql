-- Drop the overly permissive search policy
DROP POLICY IF EXISTS "Authenticated users can search profiles by display name" ON public.profiles;

-- Create a secure function for user search that returns minimal data
CREATE OR REPLACE FUNCTION public.search_users_by_name(search_query text)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avatar_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only return basic info needed for friend requests, not sensitive data like birth_year, gender
  RETURN QUERY
  SELECT 
    p.user_id,
    p.display_name,
    p.avatar_url
  FROM profiles p
  WHERE 
    p.display_name ILIKE '%' || search_query || '%'
    AND p.user_id != auth.uid()  -- Don't return the searching user
  LIMIT 10;
END;
$$;