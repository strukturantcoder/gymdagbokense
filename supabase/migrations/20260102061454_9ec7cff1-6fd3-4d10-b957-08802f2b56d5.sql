-- Add visibility toggles for social links
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS show_instagram boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS show_facebook boolean NOT NULL DEFAULT true;