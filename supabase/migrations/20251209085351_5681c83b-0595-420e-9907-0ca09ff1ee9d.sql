-- Add social media links to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS instagram_username TEXT,
ADD COLUMN IF NOT EXISTS facebook_url TEXT;