-- Add Twitter/X columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS twitter_username text,
ADD COLUMN IF NOT EXISTS show_twitter boolean NOT NULL DEFAULT true;