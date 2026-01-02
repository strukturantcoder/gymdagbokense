-- Add cover_image_url column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN cover_image_url text;