-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can validate invite codes" ON public.invite_codes;

-- Only allow users to view their own invite codes
-- Validation should be done through the secure function validate_invite_code