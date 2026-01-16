-- Create table for saved AI-generated marketing images
CREATE TABLE public.saved_marketing_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  prompt TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT '1:1',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_marketing_images ENABLE ROW LEVEL SECURITY;

-- Only admins can view their own saved images
CREATE POLICY "Admins can view own saved images"
ON public.saved_marketing_images
FOR SELECT
USING (auth.uid() = user_id);

-- Only admins can insert their own saved images
CREATE POLICY "Admins can insert own saved images"
ON public.saved_marketing_images
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Only admins can delete their own saved images
CREATE POLICY "Admins can delete own saved images"
ON public.saved_marketing_images
FOR DELETE
USING (auth.uid() = user_id);