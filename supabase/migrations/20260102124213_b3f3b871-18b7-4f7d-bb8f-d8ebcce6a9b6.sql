-- Add YouTube URL and visibility toggle to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS youtube_url text,
ADD COLUMN IF NOT EXISTS show_youtube boolean NOT NULL DEFAULT true;