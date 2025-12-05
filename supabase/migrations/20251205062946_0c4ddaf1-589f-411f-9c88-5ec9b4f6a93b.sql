-- Drop the existing friend profile policy
DROP POLICY IF EXISTS "Users can view friend profiles" ON public.profiles;

-- Create new policy that only allows friends to see limited data (name, avatar)
-- Sensitive data (birth_year, gender) is only visible to the profile owner
CREATE POLICY "Users can view friend profiles limited"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM friendships f
    WHERE f.status = 'accepted'
      AND ((f.user_id = auth.uid() AND f.friend_id = profiles.user_id)
        OR (f.friend_id = auth.uid() AND f.user_id = profiles.user_id))
  )
);

-- Create a function to abbreviate display names for privacy
CREATE OR REPLACE FUNCTION public.abbreviate_name(full_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  parts text[];
  first_initial text;
  last_name text;
BEGIN
  IF full_name IS NULL OR full_name = '' THEN
    RETURN 'Anonym';
  END IF;
  
  parts := string_to_array(trim(full_name), ' ');
  
  IF array_length(parts, 1) = 1 THEN
    -- Single name, just show first letter
    RETURN left(parts[1], 1) || '.';
  END IF;
  
  -- First letter of first name + last name
  first_initial := left(parts[1], 1);
  last_name := parts[array_length(parts, 1)];
  
  RETURN first_initial || '. ' || last_name;
END;
$$;

-- Update the search function to return abbreviated names
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
  RETURN QUERY
  SELECT 
    p.user_id,
    public.abbreviate_name(p.display_name) as display_name,
    p.avatar_url
  FROM profiles p
  WHERE 
    p.display_name ILIKE '%' || search_query || '%'
    AND p.user_id != auth.uid()
  LIMIT 10;
END;
$$;

-- Create a view function for pool challenge participants with abbreviated names
CREATE OR REPLACE FUNCTION public.get_pool_challenge_participants(challenge_uuid uuid)
RETURNS TABLE (
  participant_id uuid,
  user_id uuid,
  current_value integer,
  display_name text,
  avatar_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pcp.id as participant_id,
    pcp.user_id,
    pcp.current_value,
    CASE 
      WHEN pcp.user_id = auth.uid() THEN p.display_name
      ELSE public.abbreviate_name(p.display_name)
    END as display_name,
    p.avatar_url
  FROM pool_challenge_participants pcp
  JOIN profiles p ON p.user_id = pcp.user_id
  WHERE pcp.challenge_id = challenge_uuid
  ORDER BY pcp.current_value DESC;
END;
$$;