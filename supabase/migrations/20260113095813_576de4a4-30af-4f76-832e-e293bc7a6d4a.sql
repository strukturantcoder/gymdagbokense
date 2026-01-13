-- Add columns for OAuth 2.0 PKCE support to garmin_oauth_temp
ALTER TABLE public.garmin_oauth_temp 
ADD COLUMN IF NOT EXISTS code_verifier TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS redirect_uri TEXT;