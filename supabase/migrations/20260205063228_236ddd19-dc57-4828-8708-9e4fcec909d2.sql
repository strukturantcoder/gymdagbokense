
-- Create a function to extract just the first name from a display name
CREATE OR REPLACE FUNCTION public.get_first_name(full_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  parts text[];
BEGIN
  IF full_name IS NULL OR full_name = '' THEN
    RETURN 'Anonym';
  END IF;
  
  parts := string_to_array(trim(full_name), ' ');
  
  -- Return just the first name
  RETURN parts[1];
END;
$$;

-- Update get_lottery_qualified_participants to show first names
CREATE OR REPLACE FUNCTION public.get_lottery_qualified_participants(challenge_uuid uuid)
RETURNS TABLE(user_id uuid, display_name text, avatar_url text, current_value integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target INTEGER;
BEGIN
  SELECT target_value INTO v_target FROM community_challenges WHERE id = challenge_uuid;
  
  RETURN QUERY
  SELECT 
    ccp.user_id,
    CASE 
      WHEN ccp.user_id = auth.uid() THEN p.display_name
      ELSE public.get_first_name(p.display_name)
    END as display_name,
    p.avatar_url,
    ccp.current_value
  FROM community_challenge_participants ccp
  JOIN profiles p ON p.user_id = ccp.user_id
  WHERE ccp.challenge_id = challenge_uuid
    AND ccp.current_value >= COALESCE(v_target, 0)
  ORDER BY ccp.current_value DESC;
END;
$$;

-- Create a function to get community challenge participants with first names
CREATE OR REPLACE FUNCTION public.get_community_challenge_participants(challenge_uuid uuid)
RETURNS TABLE(user_id uuid, display_name text, current_value integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ccp.user_id,
    CASE 
      WHEN ccp.user_id = auth.uid() THEN p.display_name
      ELSE public.get_first_name(p.display_name)
    END as display_name,
    ccp.current_value
  FROM community_challenge_participants ccp
  JOIN profiles p ON p.user_id = ccp.user_id
  WHERE ccp.challenge_id = challenge_uuid
  ORDER BY ccp.current_value DESC;
END;
$$;
