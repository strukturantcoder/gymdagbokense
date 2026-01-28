-- Create table for progress photos
CREATE TABLE public.progress_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  photo_url TEXT NOT NULL,
  photo_date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kg NUMERIC(5,2),
  notes TEXT,
  category TEXT DEFAULT 'general', -- front, back, side, general
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;

-- Users can only view their own photos (private)
CREATE POLICY "Users can view own progress photos"
ON public.progress_photos
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own photos
CREATE POLICY "Users can insert own progress photos"
ON public.progress_photos
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own photos
CREATE POLICY "Users can update own progress photos"
ON public.progress_photos
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own photos
CREATE POLICY "Users can delete own progress photos"
ON public.progress_photos
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for fast lookups
CREATE INDEX idx_progress_photos_user_date ON public.progress_photos(user_id, photo_date DESC);

-- Add referral XP rewards column to track who has been rewarded
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS xp_rewarded BOOLEAN DEFAULT false;

-- Create storage bucket for progress photos (private by default)
INSERT INTO storage.buckets (id, name, public)
VALUES ('progress-photos', 'progress-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: Users can view their own photos
CREATE POLICY "Users can view own progress photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policy: Users can upload their own photos
CREATE POLICY "Users can upload own progress photos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policy: Users can delete their own photos
CREATE POLICY "Users can delete own progress photos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);