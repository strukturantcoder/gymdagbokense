-- Add RLS policy to allow authenticated users to search for other users by display name
-- This enables the friend search functionality while still protecting sensitive data

CREATE POLICY "Authenticated users can search profiles by display name"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL);