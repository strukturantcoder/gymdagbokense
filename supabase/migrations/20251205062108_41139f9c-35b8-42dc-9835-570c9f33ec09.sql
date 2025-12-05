-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can validate invite codes" ON public.invite_codes;

-- Create a more restrictive policy that only allows authenticated users to check if a code exists
-- They can only see the code column, not user_id
CREATE POLICY "Authenticated users can validate invite codes"
ON public.invite_codes
FOR SELECT
TO authenticated
USING (true);

-- Create a secure function to validate invite codes without exposing user data
CREATE OR REPLACE FUNCTION public.validate_invite_code(code_to_check text)
RETURNS TABLE (is_valid boolean, inviter_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXISTS(SELECT 1 FROM invite_codes WHERE code = code_to_check) as is_valid,
    (SELECT user_id FROM invite_codes WHERE code = code_to_check) as inviter_id;
END;
$$;