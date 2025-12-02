-- Create invite_codes table
CREATE TABLE public.invite_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  code text NOT NULL UNIQUE,
  uses_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create referrals table to track who invited whom
CREATE TABLE public.referrals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inviter_id uuid NOT NULL,
  invited_id uuid NOT NULL,
  invite_code text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(invited_id)
);

-- Enable RLS
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Policies for invite_codes
CREATE POLICY "Users can view own invite codes"
  ON public.invite_codes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own invite codes"
  ON public.invite_codes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invite codes"
  ON public.invite_codes FOR UPDATE
  USING (auth.uid() = user_id);

-- Anyone can view invite codes for validation (needed during signup)
CREATE POLICY "Anyone can validate invite codes"
  ON public.invite_codes FOR SELECT
  USING (true);

-- Policies for referrals
CREATE POLICY "Users can view referrals they made"
  ON public.referrals FOR SELECT
  USING (auth.uid() = inviter_id);

CREATE POLICY "Users can view their own referral"
  ON public.referrals FOR SELECT
  USING (auth.uid() = invited_id);

CREATE POLICY "System can insert referrals"
  ON public.referrals FOR INSERT
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_invite_codes_code ON public.invite_codes(code);
CREATE INDEX idx_invite_codes_user_id ON public.invite_codes(user_id);
CREATE INDEX idx_referrals_inviter_id ON public.referrals(inviter_id);