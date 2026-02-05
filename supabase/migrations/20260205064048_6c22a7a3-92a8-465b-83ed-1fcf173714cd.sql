-- Expose first names for community challenges without allowing direct profile scraping
-- Returns full display_name only for the caller; others get first name.

CREATE OR REPLACE FUNCTION public.get_public_profile_first_names(user_ids uuid[])
RETURNS TABLE(user_id uuid, display_name text, avatar_url text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.user_id,
    CASE
      WHEN p.user_id = auth.uid() THEN COALESCE(p.display_name, 'Anonym')
      ELSE public.get_first_name(p.display_name)
    END AS display_name,
    p.avatar_url
  FROM public.profiles p
  WHERE p.user_id = ANY(user_ids);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_profile_first_names(uuid[]) TO authenticated;