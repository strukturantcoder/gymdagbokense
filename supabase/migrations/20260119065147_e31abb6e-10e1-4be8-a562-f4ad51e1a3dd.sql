-- Add column to track if user has seen the welcome guide
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS has_seen_welcome_guide boolean DEFAULT false;