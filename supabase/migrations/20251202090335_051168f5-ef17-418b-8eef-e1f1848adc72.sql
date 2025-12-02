-- Drop the overly permissive search policy
DROP POLICY IF EXISTS "Authenticated users can search profiles" ON public.profiles;