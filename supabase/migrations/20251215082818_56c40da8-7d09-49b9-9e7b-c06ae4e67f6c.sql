-- Tighten RLS on ad_stats to require authenticated users and prevent public manipulation
ALTER TABLE public.ad_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert ad stats" ON public.ad_stats;

CREATE POLICY "Authenticated users can insert own ad stats"
ON public.ad_stats
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Harden search_users_by_name to escape LIKE wildcards and avoid LIKE injection / DoS
CREATE OR REPLACE FUNCTION public.search_users_by_name(search_query text)
RETURNS TABLE(user_id uuid, display_name text, avatar_url text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    public.abbreviate_name(p.display_name) as display_name,
    p.avatar_url
  FROM profiles p
  WHERE 
    p.display_name ILIKE '%' || replace(replace(search_query, '%', '\\%'), '_', '\\_') || '%'
    AND p.user_id != auth.uid()
  LIMIT 10;
END;
$function$;