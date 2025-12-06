-- Create a secure function to get public community challenges without exposing admin IDs
CREATE OR REPLACE FUNCTION public.get_public_community_challenges()
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  goal_description text,
  goal_unit text,
  target_value integer,
  start_date timestamptz,
  end_date timestamptz,
  is_active boolean,
  winner_type text,
  theme text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id, title, description, goal_description, goal_unit, 
    target_value, start_date, end_date, is_active, winner_type, 
    theme, created_at
  FROM public.community_challenges
  WHERE is_active = true
  ORDER BY created_at DESC;
$$;

-- Drop the public SELECT policy that exposes created_by
DROP POLICY IF EXISTS "Anyone can view active community challenges" ON public.community_challenges;

-- Create new policy: only authenticated users can view (still won't expose created_by through the function)
CREATE POLICY "Authenticated users can view active challenges"
ON public.community_challenges
FOR SELECT
TO authenticated
USING (is_active = true);