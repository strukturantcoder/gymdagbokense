-- Add TikTok fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN tiktok_username text,
ADD COLUMN show_tiktok boolean NOT NULL DEFAULT true;