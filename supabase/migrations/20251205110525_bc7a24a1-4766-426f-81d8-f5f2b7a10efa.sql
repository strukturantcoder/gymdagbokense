-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "System can insert referrals" ON public.referrals;

-- Create a new policy that restricts referral creation:
-- 1. Only the invited user (auth.uid() = invited_id) can create their referral record
-- 2. A user can only be invited once (prevent duplicate referrals)
-- This prevents users from creating fake referrals claiming arbitrary inviters
CREATE POLICY "Users can create own referral once"
ON public.referrals
FOR INSERT
WITH CHECK (
  auth.uid() = invited_id AND
  NOT EXISTS (SELECT 1 FROM public.referrals r WHERE r.invited_id = auth.uid())
);