-- Fix overly permissive RLS policy on email_logs table
-- This table should only be written to by service role (backend functions)
-- not by regular authenticated users

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service role can insert email logs" ON public.email_logs;

-- Create a more restrictive policy that only allows service role
-- Since RLS doesn't apply to service role, we just need to ensure
-- regular users cannot insert. We'll create a policy that denies all INSERT
-- from authenticated users (service role bypasses RLS anyway)
CREATE POLICY "No direct user inserts to email_logs" 
ON public.email_logs 
FOR INSERT 
TO authenticated
WITH CHECK (false);

-- Also add a policy for public role to deny inserts
CREATE POLICY "No public inserts to email_logs" 
ON public.email_logs 
FOR INSERT 
TO public
WITH CHECK (false);