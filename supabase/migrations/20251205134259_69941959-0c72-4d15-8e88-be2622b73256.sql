-- Fix: Restrict community_challenge_participants to authenticated users only
DROP POLICY IF EXISTS "Users can view challenge participants" ON public.community_challenge_participants;

CREATE POLICY "Authenticated users can view challenge participants" 
ON public.community_challenge_participants 
FOR SELECT 
USING (auth.uid() IS NOT NULL);